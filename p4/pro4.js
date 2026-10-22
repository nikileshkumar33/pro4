
const API_URL = "";

// ======================================================
// BANK ACCOUNT CLASS
// ======================================================

class BankAccount {
    constructor(id, name, fname, accountNumber, balance) {
        this.id = id;
        this.name = name;
        this.fname = fname;
        this.accountNumber = accountNumber;
        this.balance = Number(balance);
        this.transactions = [];
    }
}

// ======================================================
// DOM ELEMENTS
// ======================================================

const accountForm = document.getElementById("accountForm");
const nameInput = document.getElementById("name");
const fnameInput = document.getElementById("fname");
const openingBalanceInput = document.getElementById("openingBalance");

const accountTableBody = document.getElementById("accountTableBody");
const accountNumberInput = document.getElementById("accountNumber");
const amountInput = document.getElementById("amount");
const transactionHistory = document.getElementById("transactionHistory");

let accounts = [];

// ======================================================
// API HELPER
// ======================================================

async function apiRequest(endpoint, options = {}) {
    let response;

    try {
        response = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                ...options.headers
            }
        });
    } catch (error) {
        console.error("Network error:", error);
        throw new Error(
            "Cannot connect to the server. Check your backend deployment."
        );
    }

    const contentType = response.headers.get("content-type") || "";
    let data;

    if (contentType.includes("application/json")) {
        data = await response.json();
    } else {
        const text = await response.text();
        data = text ? { message: text } : {};
    }

    if (!response.ok) {
        throw new Error(
            data.message || data.error || `Request failed (${response.status})`
        );
    }

    return data;
}

// ======================================================
// MESSAGE DISPLAY
// ======================================================

function showMessage(message, type = "info") {
    let messageBox = document.getElementById("messageBox");

    if (!messageBox) {
        messageBox = document.createElement("div");
        messageBox.id = "messageBox";
        messageBox.setAttribute("role", "status");
        messageBox.style.padding = "12px";
        messageBox.style.margin = "12px 0";
        messageBox.style.borderRadius = "8px";

        const container = document.querySelector("main") ||
            document.querySelector(".container") ||
            document.body;

        container.prepend(messageBox);
    }

    messageBox.textContent = message;
    messageBox.style.color = type === "error" ? "#b91c1c" : "#166534";
    messageBox.style.background =
        type === "error" ? "#fee2e2" : "#dcfce7";
}

function handleError(error) {
    console.error(error);
    showMessage(error.message || "Something went wrong.", "error");
}

// ======================================================
// LOAD ACCOUNTS
// ======================================================

async function loadAccounts() {
    try {
        const data = await apiRequest("/accounts");

        accounts = Array.isArray(data)
            ? data
            : Array.isArray(data.accounts)
                ? data.accounts
                : [];

        displayAccounts();
    } catch (error) {
        handleError(error);
    }
}

// ======================================================
// DISPLAY ACCOUNTS
// ======================================================

function displayAccounts() {
    if (!accountTableBody) {
        console.warn("Account table body element not found.");
        return;
    }

    accountTableBody.replaceChildren();

    if (accounts.length === 0) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = 5;
        cell.textContent = "No bank accounts found.";
        row.appendChild(cell);
        accountTableBody.appendChild(row);
        return;
    }

    accounts.forEach(accountData => {
        const account = new BankAccount(
            accountData.id,
            accountData.name,
            accountData.fname,
            accountData.accountNumber,
            accountData.balance
        );

        const row = document.createElement("tr");

        [
            account.id,
            account.name,
            account.fname,
            account.accountNumber,
            account.balance.toFixed(2)
        ].forEach(value => {
            const cell = document.createElement("td");
            cell.textContent = String(value ?? "");
            row.appendChild(cell);
        });

        accountTableBody.appendChild(row);
    });
}

// ======================================================
// CREATE ACCOUNT
// ======================================================

async function createAccount(event) {
    if (event) event.preventDefault();

    const name = nameInput?.value.trim();
    const fname = fnameInput?.value.trim();
    const openingBalance = Number(openingBalanceInput?.value);

    if (!name || !fname) {
        showMessage("Please enter the account holder and father's name.", "error");
        return;
    }

    if (
        openingBalanceInput?.value.trim() === "" ||
        !Number.isFinite(openingBalance) ||
        openingBalance < 0
    ) {
        showMessage("Enter a valid opening balance.", "error");
        return;
    }

    try {
        const result = await apiRequest("/accounts", {
            method: "POST",
            body: JSON.stringify({
                name,
                fname,
                openingBalance
            })
        });

        showMessage(result.message || "Account created successfully.");

        if (accountForm) accountForm.reset();

        await loadAccounts();
    } catch (error) {
        handleError(error);
    }
}

// ======================================================
// DEPOSIT
// ======================================================

async function depositMoney() {
    const accountNumber = accountNumberInput?.value.trim();
    const amount = Number(amountInput?.value);

    if (!accountNumber) {
        showMessage("Enter the account number.", "error");
        return;
    }

    if (
        amountInput?.value.trim() === "" ||
        !Number.isFinite(amount) ||
        amount <= 0
    ) {
        showMessage("Enter a deposit amount greater than zero.", "error");
        return;
    }

    try {
        const result = await apiRequest(
            `/accounts/${encodeURIComponent(accountNumber)}/deposit`,
            {
                method: "POST",
                body: JSON.stringify({ amount })
            }
        );

        showMessage(result.message || "Deposit successful.");
        if (amountInput) amountInput.value = "";

        await loadAccounts();
    } catch (error) {
        handleError(error);
    }
}

// ======================================================
// WITHDRAW
// ======================================================

async function withdrawMoney() {
    const accountNumber = accountNumberInput?.value.trim();
    const amount = Number(amountInput?.value);

    if (!accountNumber) {
        showMessage("Enter the account number.", "error");
        return;
    }

    if (
        amountInput?.value.trim() === "" ||
        !Number.isFinite(amount) ||
        amount <= 0
    ) {
        showMessage("Enter a withdrawal amount greater than zero.", "error");
        return;
    }

    try {
        const result = await apiRequest(
            `/accounts/${encodeURIComponent(accountNumber)}/withdraw`,
            {
                method: "POST",
                body: JSON.stringify({ amount })
            }
        );

        showMessage(result.message || "Withdrawal successful.");
        if (amountInput) amountInput.value = "";

        await loadAccounts();
    } catch (error) {
        handleError(error);
    }
}

// ======================================================
// TRANSACTION HISTORY
// ======================================================

async function loadTransactionHistory() {
    const accountNumber = accountNumberInput?.value.trim();

    if (!accountNumber) {
        showMessage("Enter the account number first.", "error");
        return;
    }

    try {
        const data = await apiRequest(
            `/accounts/${encodeURIComponent(accountNumber)}/transactions`
        );

        const transactions = Array.isArray(data)
            ? data
            : Array.isArray(data.transactions)
                ? data.transactions
                : [];

        displayTransactions(transactions);
    } catch (error) {
        handleError(error);
    }
}

function displayTransactions(transactions) {
    if (!transactionHistory) {
        console.warn("Transaction history element not found.");
        return;
    }

    transactionHistory.replaceChildren();

    if (transactions.length === 0) {
        transactionHistory.textContent = "No transactions found.";
        return;
    }

    const table = document.createElement("table");
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");

    ["ID", "Type", "Amount", "Date"].forEach(title => {
        const th = document.createElement("th");
        th.textContent = title;
        headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");

    transactions.forEach(transaction => {
        const row = document.createElement("tr");

        const values = [
            transaction.id ?? "",
            transaction.type ?? transaction.transactionType ?? "",
            Number(transaction.amount ?? 0).toFixed(2),
            transaction.createdAt ??
                transaction.created_at ??
                transaction.date ??
                ""
        ];

        values.forEach(value => {
            const cell = document.createElement("td");
            cell.textContent = String(value);
            row.appendChild(cell);
        });

        tbody.appendChild(row);
    });

    table.appendChild(tbody);
    transactionHistory.appendChild(table);
}

// ======================================================
// EVENT LISTENERS
// ======================================================

if (accountForm) {
    accountForm.addEventListener("submit", createAccount);
}

// These IDs must match the buttons in index.html.
document.getElementById("depositBtn")
    ?.addEventListener("click", depositMoney);

document.getElementById("withdrawBtn")
    ?.addEventListener("click", withdrawMoney);

document.getElementById("historyBtn")
    ?.addEventListener("click", loadTransactionHistory);

// ======================================================
// START APPLICATION
// ======================================================

document.addEventListener("DOMContentLoaded", loadAccounts);
