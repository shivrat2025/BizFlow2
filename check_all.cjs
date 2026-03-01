const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs, doc, getDoc } = require("firebase/firestore");

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
    const txsSnap = await getDocs(txsRef);
    let txs = [];
    txsSnap.forEach(snap => txs.push({ id: snap.id, ...snap.data() }));

    // Sort transactions by date descending
    txs.sort((a, b) => b.createdAt - a.createdAt);

    console.log(`Total transactions in cloud: ${txs.length}`);

    console.log("Top 10 most recent transactions:");
    txs.slice(0, 10).forEach(t => {
        console.log(`- ID: ${t.id} | Desc: ${t.description} | Amt: ${t.amount} | Type: ${t.type} | Src: ${t.sourceAccountId} | Dest: ${t.destinationAccountId} | Date: ${new Date(t.date).toISOString()}`);
    });

    // Let's also check if maybe there's another SBI card in the DB or in the backups
    const wsRef = doc(db, "workspaces", "SHIVRAT");
    const wsSnap = await getDoc(wsRef);
    console.log("\nAccounts in cloud:");
    console.log(wsSnap.data().accounts);
}

check().catch(console.error).then(() => process.exit(0));
