
const express = require("express");
const mysql = require("mysql2");
const path = require("path");

require("dotenv").config();

const app = express();

// ======================================================
// MIDDLEWARE
// ======================================================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "public")));

// ======================================================
// MYSQL CONNECTION POOL
// ======================================================

const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT || 3306),
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
    ssl: process.env.DB_SSL === "true"
        ? { rejectUnauthorized: true }
        : undefined
});

// ======================================================
// HEALTH CHECK
// ======================================================

app.get("/api/health", (req, res) => {
    db.query("SELECT 1", (error) => {
        if (error) {
            console.error("Database connection error:", error.message);

            return res.status(500).json({
                ok: false,
                message: "Database connection failed"
            });
        }

        res.json({
            ok: true,
            message: "API and database connected"
        });
    });
});

// ======================================================
// GET ALL ACCOUNTS
// ======================================================

app.get("/accounts", (req, res) => {
    const sql = `
        SELECT id, name, fname, accountNumber, balance
        FROM BankAccount
        ORDER BY id DESC
    `;

    db.query(sql, (error, results) => {
        if (error) {
            console.error("Get accounts error:", error.message);

            return res.status(500).json({
                message: "Unable to retrieve accounts"
            });
        }

        res.json(results);
    });
});

// ======================================================
// CREATE ACCOUNT
// ======================================================

app.post("/accounts", (req, res) => {
    const { name, fname, openingBalance } = req.body;

    const cleanName = typeof name === "string" ? name.trim() : "";
    const cleanFname = typeof fname === "string" ? fname.trim() : "";
    const balance = Number(openingBalance);

    if (
        !cleanName ||
        !cleanFname ||
        openingBalance === "" ||
        openingBalance === null ||
        openingBalance === undefined ||
        !Number.isFinite(balance) ||
        balance < 0
    ) {
        return res.status(400).json({
            message: "Enter valid account details"
        });
    }

    // Generate a random account number.
    const accountNumber =
        Date.now().toString() +
        Math.floor(1000 + Math.random() * 9000).toString();

    const sql = `
        INSERT INTO BankAccount
            (name, fname, accountNumber, balance)
        VALUES (?, ?, ?, ?)
    `;

    db.query(
        sql,
        [cleanName, cleanFname, accountNumber, balance],
        (error, result) => {
            if (error) {
                console.error("Create account error:", error.message);

                return res.status(500).json({
                    message: "Unable to create account"
                });
            }

            res.status(201).json({
                message: "Account created successfully",
                id: result.insertId,
                name: cleanName,
                fname: cleanFname,
                accountNumber,
                balance
            });
        }
    );
});

// ======================================================
// DEPOSIT MONEY
// ======================================================

app.post("/accounts/:accountNumber/deposit", (req, res) => {
    const { accountNumber } = req.params;
    const amount = Number(req.body.amount);

    if (
        req.body.amount === "" ||
        req.body.amount === null ||
        req.body.amount === undefined ||
        !Number.isFinite(amount) ||
        amount <= 0
    ) {
        return res.status(400).json({
            message: "Enter a valid deposit amount"
        });
    }

    db.getConnection((connectionError, connection) => {
        if (connectionError) {
            console.error("Database error:", connectionError.message);

            return res.status(500).json({
                message: "Database connection failed"
            });
        }

        connection.beginTransaction(error => {
            if (error) {
                connection.release();

                return res.status(500).json({
                    message: "Unable to begin transaction"
                });
            }

            connection.query(
                `UPDATE BankAccount
                 SET balance = balance + ?
                 WHERE accountNumber = ?`,
                [amount, accountNumber],
                (updateError, result) => {
                    if (updateError || result.affectedRows === 0) {
                        return connection.rollback(() => {
                            connection.release();

                            res.status(updateError ? 500 : 404).json({
                                message: updateError
                                    ? "Deposit failed"
                                    : "Account not found"
                            });
                        });
                    }

                    connection.query(
                        `INSERT INTO transactions
                         (accountNumber, type, amount)
                         VALUES (?, 'DEPOSIT', ?)`,
                        [accountNumber, amount],
                        insertError => {
                            if (insertError) {
                                return connection.rollback(() => {
                                    connection.release();

                                    res.status(500).json({
                                        message: "Unable to save transaction"
                                    });
                                });
                            }

                            connection.commit(commitError => {
                                if (commitError) {
                                    return connection.rollback(() => {
                                        connection.release();

                                        res.status(500).json({
                                            message: "Unable to complete deposit"
                                        });
                                    });
                                }

                                connection.release();

                                res.json({
                                    message: "Deposit successful",
                                    amount
                                });
                            });
                        }
                    );
                }
            );
        });
    });
});

// ======================================================
// WITHDRAW MONEY
// ======================================================

app.post("/accounts/:accountNumber/withdraw", (req, res) => {
    const { accountNumber } = req.params;
    const amount = Number(req.body.amount);

    if (
        req.body.amount === "" ||
        req.body.amount === null ||
        req.body.amount === undefined ||
        !Number.isFinite(amount) ||
        amount <= 0
    ) {
        return res.status(400).json({
            message: "Enter a valid withdrawal amount"
        });
    }

    db.getConnection((connectionError, connection) => {
        if (connectionError) {
            console.error("Database error:", connectionError.message);

            return res.status(500).json({
                message: "Database connection failed"
            });
        }

        connection.beginTransaction(error => {
            if (error) {
                connection.release();

                return res.status(500).json({
                    message: "Unable to begin transaction"
                });
            }

            connection.query(
                `UPDATE BankAccount
                 SET balance = balance - ?
                 WHERE accountNumber = ?
                   AND balance >= ?`,
                [amount, accountNumber, amount],
                (updateError, result) => {
                    if (updateError || result.affectedRows === 0) {
                        return connection.rollback(() => {
                            connection.release();

                            if (updateError) {
                                return res.status(500).json({
                                    message: "Withdrawal failed"
                                });
                            }

                            res.status(400).json({
                                message:
                                    "Account not found or insufficient balance"
                            });
                        });
                    }

                    connection.query(
                        `INSERT INTO transactions
                         (accountNumber, type, amount)
                         VALUES (?, 'WITHDRAWAL', ?)`,
                        [accountNumber, amount],
                        insertError => {
                            if (insertError) {
                                return connection.rollback(() => {
                                    connection.release();

                                    res.status(500).json({
                                        message: "Unable to save transaction"
                                    });
                                });
                            }

                            connection.commit(commitError => {
                                if (commitError) {
                                    return connection.rollback(() => {
                                        connection.release();

                                        res.status(500).json({
                                            message: "Unable to complete withdrawal"
                                        });
                                    });
                                }

                                connection.release();

                                res.json({
                                    message: "Withdrawal successful",
                                    amount
                                });
                            });
                        }
                    );
                }
            );
        });
    });
});

// ======================================================
// GET TRANSACTION HISTORY
// ======================================================

app.get(
    "/accounts/:accountNumber/transactions",
    (req, res) => {
        const { accountNumber } = req.params;

        const sql = `
            SELECT id, accountNumber, type, amount, created_at
            FROM transactions
            WHERE accountNumber = ?
            ORDER BY id DESC
        `;

        db.query(sql, [accountNumber], (error, results) => {
            if (error) {
                console.error("Transaction history error:", error.message);

                return res.status(500).json({
                    message: "Unable to retrieve transaction history"
                });
            }

            res.json(results);
        });
    }
);

// ======================================================
// UNKNOWN ROUTES
// ======================================================

app.use("/accounts", (req, res) => {
    res.status(404).json({
        message: "Account API route not found"
    });
});

// ======================================================
// EXPORT FOR VERCEL
// ======================================================

module.exports = app;
