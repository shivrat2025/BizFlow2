import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

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

    txs.sort((a, b) => (b.createdAt || b.date || 0) - (a.createdAt || a.date || 0));

    console.log(`Found ${txs.length} transactions.`);
    console.log("Top 10 most recent transactions:");
    txs.slice(0, 10).forEach(t => {
        console.log(`- ID: ${t.id} | Desc: ${t.description} | Amt: ${t.amount} | Type: ${t.type} | Date: ${new Date(t.date).toLocaleString()} | CreatedAt: ${t.createdAt ? new Date(t.createdAt).toLocaleString() : 'None'}`);
    });
}

check().catch(console.error).then(() => process.exit(0));
