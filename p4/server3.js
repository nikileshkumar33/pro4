const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

const app = express();

app.use(express.json());

app.use(cors());

// ================= MYSQL =================

const db = mysql.createConnection({

    host: "localhost",
    user: "root",
    password: "Nikilesh@3",
    database: "bank_db"
});

db.connect((err) => {

    if (err) {
        console.log("MySQL connection failed");
        console.log(err);
        return;
    }

    console.log("MySQL connected successfully");
});

// ================= CREATE ACCOUNT =================

app.post("/accounts", (req, res) => {

    const {
        name,
        fname,
        accountNumber,
        balance
    } = req.body;

    if (
        !name ||
        !fname ||
        !accountNumber ||
        balance < 0
    ) {
        return res.status(400).json({
            message: "Invalid account details"
        });
    }

    const sql = `
        INSERT INTO accounts
        (name, fname, account_number, balance)
        VALUES (?, ?, ?, ?)
    `;

    db.query(
        sql,
        [
            name,
            fname,
            accountNumber,
            balance
        ],
        (err, result) => {

            if (err) {
                console.log(err);

                return res.status(500).json({
                    message: "Error creating account"
                });
            }

            const accountId = result.insertId;

            // Add opening balance transaction
            const transactionSQL = `
                INSERT INTO transactions
                (account_id, type, amount)
                VALUES (?, ?, ?)
            `;

            db.query(
                transactionSQL,
                [
                    accountId,
                    "Opening Balance",
                    balance
                ],
                (err) => {

                    if (err) {
                        console.log(err);
                    }
                }
            );

            res.status(201).json({
                message: "Account created successfully",
                id: accountId,
                accountNumber: accountNumber
            });
        }
    );
});

// ================= GET ALL ACCOUNTS =================

app.get("/accounts", (req, res) => {

    const sql = `
        SELECT
            id,
            name,
            fname,
            account_number AS accountNumber,
            balance
        FROM accounts
        ORDER BY id DESC
    `;

    db.query(sql, (err, result) => {

        if (err) {
            console.log(err);

            return res.status(500).json({
                message: "Error getting accounts"
            });
        }

        res.json(result);
    });
});

// ================= GET ONE ACCOUNT =================

app.get("/accounts/:accountNumber", (req, res) => {

    const accountNumber =
        req.params.accountNumber;

    const sql = `
        SELECT
            id,
            name,
            fname,
            account_number AS accountNumber,
            balance
        FROM accounts
        WHERE account_number = ?
    `;

    db.query(
        sql,
        [accountNumber],
        (err, result) => {

            if (err) {
                console.log(err);

                return res.status(500).json({
                    message: "Error getting account"
                });
            }

            if (result.length === 0) {
                return res.status(404).json({
                    message: "Account not found"
                });
            }

            res.json(result[0]);
        }
    );
});

// ================= DEPOSIT =================

app.put(
    "/accounts/:accountNumber/deposit",
    (req, res) => {

        const accountNumber =
            req.params.accountNumber;

        const amount =
            Number(req.body.amount);

        if (amount <= 0) {
            return res.status(400).json({
                message: "Invalid deposit amount"
            });
        }

        const findSQL = `
            SELECT id, balance
            FROM accounts
            WHERE account_number = ?
        `;

        db.query(
            findSQL,
            [accountNumber],
            (err, result) => {

                if (err) {
                    console.log(err);

                    return res.status(500).json({
                        message: "Database error"
                    });
                }

                if (result.length === 0) {
                    return res.status(404).json({
                        message: "Account not found"
                    });
                }

                const accountId = result[0].id;

                const updateSQL = `
                    UPDATE accounts
                    SET balance = balance + ?
                    WHERE account_number = ?
                `;

                db.query(
                    updateSQL,
                    [amount, accountNumber],
                    (err) => {

                        if (err) {
                            console.log(err);

                            return res.status(500).json({
                                message:
                                    "Error depositing money"
                            });
                        }

                        const transactionSQL = `
                            INSERT INTO transactions
                            (account_id, type, amount)
                            VALUES (?, ?, ?)
                        `;

                        db.query(
                            transactionSQL,
                            [
                                accountId,
                                "Deposit",
                                amount
                            ],
                            (err) => {

                                if (err) {
                                    console.log(err);
                                }
                            }
                        );

                        res.json({
                            message:
                                "Deposit successful"
                        });
                    }
                );
            }
        );
    }
);

// ================= WITHDRAW =================

app.put(
    "/accounts/:accountNumber/withdraw",
    (req, res) => {

        const accountNumber =
            req.params.accountNumber;

        const amount =
            Number(req.body.amount);

        if (amount <= 0) {
            return res.status(400).json({
                message:
                    "Invalid withdrawal amount"
            });
        }

        const findSQL = `
            SELECT id, balance
            FROM accounts
            WHERE account_number = ?
        `;

        db.query(
            findSQL,
            [accountNumber],
            (err, result) => {

                if (err) {
                    console.log(err);

                    return res.status(500).json({
                        message: "Database error"
                    });
                }

                if (result.length === 0) {
                    return res.status(404).json({
                        message: "Account not found"
                    });
                }

                const accountId =
                    result[0].id;

                const balance =
                    Number(result[0].balance);

                if (amount > balance) {
                    return res.status(400).json({
                        message:
                            "Insufficient balance"
                    });
                }

                const updateSQL = `
                    UPDATE accounts
                    SET balance = balance - ?
                    WHERE account_number = ?
                `;

                db.query(
                    updateSQL,
                    [amount, accountNumber],
                    (err) => {

                        if (err) {
                            console.log(err);

                            return res.status(500).json({
                                message:
                                    "Error withdrawing money"
                            });
                        }

                        const transactionSQL = `
                            INSERT INTO transactions
                            (account_id, type, amount)
                            VALUES (?, ?, ?)
                        `;

                        db.query(
                            transactionSQL,
                            [
                                accountId,
                                "Withdrawal",
                                amount
                            ],
                            (err) => {

                                if (err) {
                                    console.log(err);
                                }
                            }
                        );

                        res.json({
                            message:
                                "Withdrawal successful"
                        });
                    }
                );
            }
        );
    }
);

// ================= GET TRANSACTIONS =================

app.get(
    "/accounts/:accountNumber/transactions",
    (req, res) => {

        const accountNumber =
            req.params.accountNumber;

        const sql = `
            SELECT
                t.id,
                t.type,
                t.amount,
                t.transaction_date AS date
            FROM transactions t

            INNER JOIN accounts a
            ON t.account_id = a.id

            WHERE a.account_number = ?

            ORDER BY t.id ASC
        `;

        db.query(
            sql,
            [accountNumber],
            (err, result) => {

                if (err) {
                    console.log(err);

                    return res.status(500).json({
                        message:
                            "Error getting transactions"
                    });
                }

                res.json(result);
            }
        );
    }
);

// ================= SERVER =================

app.listen(5050, () => {

    console.log(
        "Bank API running at http://localhost:5050"
    );

});