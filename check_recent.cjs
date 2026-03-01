const { initializeApp } = require("firebase/app");
const { getFirestore, doc, getDocs, collection } = require("firebase/firestore");

const firebaseConfig = {
    apiKey: "AIzaSyDIyPAe5qGMrwj51KutR-4Xp99rQdH-Okk",
    authDomain: "bizflow-fb864.firebaseapp.com",
    projectId: "bizflow-fb864",
    storageBucket: "bizflow-fb864.firebasestorage.app",
    messagingSenderId: "112226518901",
    appId: "1:112226518901:web:d20278baf81ef2c1c9b53c"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
    console.log("Fetching all transactions...");
    const txsRef = collection(db, "workspaces", "SHIVRAT", "transactions");
    const snap = await getDocs(txsRef);
    let txs = [];
    snap.forEach(d => txs.push({ id: d.id, ...d.data() }));

    // Sort by createdAt descending
    txs.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    console.log(`Found ${txs.length} transactions.`);
    console.log("Top 10 most recently CREATED transactions:");
    txs.slice(0, 10).forEach(t => {
        console.log(`- ID: ${t.id} | Desc: ${t.description} | Amt: ${t.amount} | Type: ${t.type} | Src: ${t.sourceAccountId} | Dest: ${t.destinationAccountId} | Date: ${new Date(t.date).toISOString()} | CreatedAt: ${t.createdAt ? new Date(t.createdAt).toISOString() : 'None'} | IncomeSource: ${t.incomeSource}`);
    });
}

check().catch(console.error).then(() => process.exit(0));
