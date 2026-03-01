const fs = require('fs');

const workspace = JSON.parse(fs.readFileSync('workspace_dump.json'));
let accs = workspace.accounts;
const txs = workspace.transactions;

const computedAccounts = accs.map(acc => {
    let balance = acc.limit || 0;
    txs.forEach(t => {
        if (t.type === 'REPAYMENT') {
            if (t.sourceAccountId === acc.id) balance -= t.amount;
            if (t.destinationAccountId === acc.id) balance += t.amount;
        } else {
            if (t.sourceAccountId === acc.id) {
                const change = t.type === 'INCOME' ? t.amount : -t.amount;
                balance += change;
            }
        }
    });
    return { ...acc, balance };
});

const currentCodAcc = computedAccounts.find(a => a.name.toUpperCase().includes('IDFC'));
const currentPrepaidAcc = computedAccounts.find(a => a.name.toUpperCase().includes('INDUSIND'));

console.log("IDFC Bank Balance:", currentCodAcc.balance);
console.log("IndusInd Bank Balance:", currentPrepaidAcc.balance);

