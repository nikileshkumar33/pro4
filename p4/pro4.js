const API_URL = "http://localhost:5050";


// ======================================================
// BANK ACCOUNT CLASS
// ======================================================

class BankAccount {

    constructor(
        id,
        name,
        fname,
        accountNumber,
        balance
    ) {

        this.id = id;
        this.name = name;
        this.fname = fname;
        this.accountNumber = accountNumber;
        this.balance = Number(balance);

        this.transactions = [];
    }


    // ==================================================
    // DEPOSIT
    // ==================================================

    async deposit(amount) {

        if (amount <= 0) {

            alert("Invalid deposit amount!");

            return false;
        }

        try {

            const response = await fetch(
                `${API_URL}/accounts/${this.accountNumber}/deposit`,
                {
                    method: "PUT",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        amount: amount
                    })
                }
            );

            const data =
                await response.json();

            if (!response.ok) {

                alert(
                    data.message ||
                    "Error depositing money"
                );

                return false;
            }

            alert(
                "₹" +
                amount.toLocaleString("en-IN") +
                " deposited successfully."
            );

            await loadAccounts();

            return true;

        }
        catch (error) {

            console.error(error);

            alert("Cannot connect to server");

            return false;
        }
    }


    // ==================================================
    // WITHDRAW
    // ==================================================

    async withdraw(amount) {

        if (amount <= 0) {

            alert(
                "Invalid withdrawal amount!"
            );

            return false;
        }

        if (amount > this.balance) {

            alert(
                "Insufficient balance!"
            );

            return false;
        }

        try {

            const response = await fetch(
                `${API_URL}/accounts/${this.accountNumber}/withdraw`,
                {
                    method: "PUT",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        amount: amount
                    })
                }
            );

            const data =
                await response.json();

            if (!response.ok) {

                alert(
                    data.message ||
                    "Error withdrawing money"
                );

                return false;
            }

            alert(
                "₹" +
                amount.toLocaleString("en-IN") +
                " withdrawn successfully."
            );

            await loadAccounts();

            return true;

        }
        catch (error) {

            console.error(error);

            alert("Cannot connect to server");

            return false;
        }
    }


    // ==================================================
    // CHECK BALANCE
    // ==================================================

    checkBalance() {

        return this.balance;
    }


    // ==================================================
    // SHOW ACCOUNT
    // ==================================================

    showAccount() {

        return `

            <h3>Account Details</h3>

            <p>
                <strong>Account Holder:</strong>
                ${this.name}
            </p>

            <p>
                <strong>Father's Name:</strong>
                ${this.fname}
            </p>

            <p>
                <strong>Account Number:</strong>
                ${this.accountNumber}
            </p>

            <p>
                <strong>Current Balance:</strong>
                ₹${this.balance.toLocaleString("en-IN")}
            </p>

        `;
    }


    // ==================================================
    // TOTAL DEPOSITS
    // ==================================================

    totalDeposits() {

        return this.transactions
            .filter(
                transaction =>
                    transaction.type === "Deposit"
            )
            .reduce(
                (total, transaction) =>
                    total +
                    Number(transaction.amount),
                0
            );
    }


    // ==================================================
    // TOTAL WITHDRAWALS
    // ==================================================

    totalWithdrawals() {

        return this.transactions
            .filter(
                transaction =>
                    transaction.type === "Withdrawal"
            )
            .reduce(
                (total, transaction) =>
                    total +
                    Number(transaction.amount),
                0
            );
    }
}



// ======================================================
// GLOBAL VARIABLES
// ======================================================

let accounts = [];

let account = null;



// ======================================================
// LOAD ACCOUNTS FROM MYSQL
// ======================================================

async function loadAccounts() {

    try {

        const response =
            await fetch(
                `${API_URL}/accounts`
            );

        if (!response.ok) {

            throw new Error(
                `Server returned ${response.status}`
            );
        }

        const data =
            await response.json();

        accounts =
            data.map(item => {

                return new BankAccount(
                    item.id,
                    item.name,
                    item.fname,
                    item.accountNumber,
                    item.balance
                );

            });

        updateAccountDropdown();


        // Keep currently selected account
        if (account !== null) {

            const selectedAccount =
                accounts.find(
                    acc =>
                        acc.accountNumber ===
                        account.accountNumber
                );

            if (selectedAccount) {

                account =
                    selectedAccount;

                document.getElementById(
                    "accountSelect"
                ).value =
                    account.accountNumber;

                showAccount();
            }
        }

    }
    catch (error) {

        console.error(
            "LOAD ACCOUNTS ERROR:",
            error
        );

        alert(
            "Cannot connect to server"
        );
    }
}



// ======================================================
// GENERATE ACCOUNT NUMBER
// ======================================================

function generateAccountNumber() {

    let accountNumber;

    do {

        accountNumber =
            "AC" +
            Math.floor(
                10000000 +
                Math.random() * 90000000
            );

    }
    while (
        accounts.some(
            acc =>
                acc.accountNumber ===
                accountNumber
        )
    );

    return accountNumber;
}



// ======================================================
// CREATE ACCOUNT
// ======================================================

async function createAccount() {

    const name =
        document
            .getElementById("name")
            .value
            .trim();

    const fname =
        document
            .getElementById("fname")
            .value
            .trim();

    const openingBalance =
        Number(
            document
                .getElementById("openingBalance")
                .value
        );


    // ================= VALIDATION =================

    if (name === "") {

        alert(
            "Please enter customer name."
        );

        return;
    }


    if (fname === "") {

        alert(
            "Please enter father's name."
        );

        return;
    }


    if (
        isNaN(openingBalance) ||
        openingBalance < 0
    ) {

        alert(
            "Invalid opening balance."
        );

        return;
    }


    // ================= ACCOUNT NUMBER =================

    const accountNumber =
        generateAccountNumber();


    // ================= SEND TO SERVER =================

    try {

        const response =
            await fetch(
                `${API_URL}/accounts`,
                {

                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        name: name,

                        fname: fname,

                        accountNumber:
                            accountNumber,

                        balance:
                            openingBalance

                    })
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            alert(
                data.message ||
                "Error creating account"
            );

            return;
        }


        // ================= RELOAD ACCOUNTS =================

        await loadAccounts();


        account =
            accounts.find(
                acc =>
                    acc.accountNumber ===
                    accountNumber
            );


        updateAccountDropdown();


        document.getElementById(
            "accountSelect"
        ).value =
            accountNumber;


        // ================= CLEAR FORM =================

        document.getElementById(
            "name"
        ).value = "";

        document.getElementById(
            "fname"
        ).value = "";

        document.getElementById(
            "openingBalance"
        ).value = "";


        alert(
            "Account created successfully!\n\n" +
            "Account Number: " +
            accountNumber
        );


        showAccount();

    }
    catch (error) {

        console.error(
            "CREATE ACCOUNT ERROR:",
            error
        );

        alert(
            "Cannot connect to server"
        );
    }
}



// ======================================================
// UPDATE ACCOUNT DROPDOWN
// ======================================================

function updateAccountDropdown() {

    const select =
        document.getElementById(
            "accountSelect"
        );


    select.innerHTML = `

        <option value="">
            Select Customer Account
        </option>

    `;


    accounts.forEach(
        acc => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                acc.accountNumber;


            option.textContent =
                acc.name +
                " - " +
                acc.accountNumber;


            select.appendChild(option);

        }
    );
}



// ======================================================
// SELECT ACCOUNT
// ======================================================

function selectAccount() {

    const accountNumber =
        document
            .getElementById(
                "accountSelect"
            )
            .value;


    if (accountNumber === "") {

        account = null;

        document.getElementById(
            "output"
        ).innerHTML =
            "Please select a customer account.";

        return;
    }


    account =
        accounts.find(
            acc =>
                acc.accountNumber ===
                accountNumber
        );


    if (account) {

        showAccount();
    }
}



// ======================================================
// DEPOSIT MONEY
// ======================================================

async function depositMoney() {

    if (account === null) {

        alert(
            "Please select a customer account first."
        );

        return;
    }


    const amount =
        Number(
            document
                .getElementById("amount")
                .value
        );


    if (
        isNaN(amount) ||
        amount <= 0
    ) {

        alert(
            "Please enter a valid deposit amount."
        );

        return;
    }


    const success =
        await account.deposit(amount);


    if (success) {

        clearAmount();

        showAccount();
    }
}



// ======================================================
// WITHDRAW MONEY
// ======================================================

async function withdrawMoney() {

    if (account === null) {

        alert(
            "Please select a customer account first."
        );

        return;
    }


    const amount =
        Number(
            document
                .getElementById("amount")
                .value
        );


    if (
        isNaN(amount) ||
        amount <= 0
    ) {

        alert(
            "Please enter a valid withdrawal amount."
        );

        return;
    }


    const success =
        await account.withdraw(amount);


    if (success) {

        clearAmount();

        showAccount();
    }
}



// ======================================================
// CHECK BALANCE
// ======================================================

function checkBalance() {

    if (account === null) {

        alert(
            "Please select a customer account first."
        );

        return;
    }


    const balance =
        account.checkBalance();


    document.getElementById(
        "output"
    ).innerHTML = `

        <h3>Balance Enquiry</h3>

        <p>
            <strong>Account Holder:</strong>
            ${account.name}
        </p>

        <p>
            <strong>Father's Name:</strong>
            ${account.fname}
        </p>

        <p>
            <strong>Account Number:</strong>
            ${account.accountNumber}
        </p>

        <h2>
            Current Balance:
            ₹${balance.toLocaleString("en-IN")}
        </h2>

    `;
}



// ======================================================
// SHOW ACCOUNT DETAILS
// ======================================================

function showAccount() {

    if (account === null) {

        document.getElementById(
            "output"
        ).innerHTML =
            "Please select a customer account.";

        return;
    }


    document.getElementById(
        "output"
    ).innerHTML =
        account.showAccount();
}



// ======================================================
// SHOW TRANSACTIONS
// ======================================================

async function showTransactions() {

    if (account === null) {

        alert(
            "Please select a customer account."
        );

        return;
    }


    try {

        const response =
            await fetch(
                `${API_URL}/accounts/${account.accountNumber}/transactions`
            );


        const transactions =
            await response.json();


        if (!response.ok) {

            alert(
                transactions.message ||
                "Error loading transactions"
            );

            return;
        }


        let html = `

            <h3>Transaction History</h3>

            <p>
                <strong>Account Holder:</strong>
                ${account.name}
            </p>

            <p>
                <strong>Father's Name:</strong>
                ${account.fname}
            </p>

            <p>
                <strong>Account Number:</strong>
                ${account.accountNumber}
            </p>

            <hr>

        `;


        // ================= TRANSACTIONS =================

        transactions.forEach(
            transaction => {

                const amount =
                    Number(
                        transaction.amount
                    );


                if (
                    transaction.type ===
                    "Deposit"
                ) {

                    html += `

                        <div class="transaction deposit">

                            <strong>
                                Deposit
                            </strong>

                            +₹${amount.toLocaleString("en-IN")}

                            <br>

                            <small>
                                ${transaction.date}
                            </small>

                        </div>

                    `;
                }


                else if (
                    transaction.type ===
                    "Withdrawal"
                ) {

                    html += `

                        <div class="transaction withdraw">

                            <strong>
                                Withdrawal
                            </strong>

                            -₹${amount.toLocaleString("en-IN")}

                            <br>

                            <small>
                                ${transaction.date}
                            </small>

                        </div>

                    `;
                }


                else {

                    html += `

                        <div class="transaction">

                            <strong>
                                Opening Balance
                            </strong>

                            ₹${amount.toLocaleString("en-IN")}

                            <br>

                            <small>
                                ${transaction.date}
                            </small>

                        </div>

                    `;
                }

            }
        );


        // ================= SUMMARY =================

        const totalDeposits =
            transactions
                .filter(
                    transaction =>
                        transaction.type ===
                        "Deposit"
                )
                .reduce(
                    (total, transaction) =>
                        total +
                        Number(
                            transaction.amount
                        ),
                    0
                );


        const totalWithdrawals =
            transactions
                .filter(
                    transaction =>
                        transaction.type ===
                        "Withdrawal"
                )
                .reduce(
                    (total, transaction) =>
                        total +
                        Number(
                            transaction.amount
                        ),
                    0
                );


        html += `

            <hr>

            <p>
                <strong>
                    Total Deposits:
                </strong>

                ₹${totalDeposits.toLocaleString("en-IN")}
            </p>

            <p>
                <strong>
                    Total Withdrawals:
                </strong>

                ₹${totalWithdrawals.toLocaleString("en-IN")}
            </p>

            <h3>
                Current Balance:
                ₹${account.balance.toLocaleString("en-IN")}
            </h3>

        `;


        document.getElementById(
            "output"
        ).innerHTML = html;

    }
    catch (error) {

        console.error(
            "TRANSACTION ERROR:",
            error
        );

        alert(
            "Cannot connect to server"
        );
    }
}



// ======================================================
// CLEAR AMOUNT
// ======================================================

function clearAmount() {

    document.getElementById(
        "amount"
    ).value = "";
}



// ======================================================
// INITIAL LOAD
// ======================================================

loadAccounts();