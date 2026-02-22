import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, getDoc } from "firebase/firestore";

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

async function findDuplicates() {
    const workspaceId = "SHIVRAT";
    const txsSnap = await getDocs(collection(db, "workspaces", workspaceId, "transactions"));
    const transactions = txsSnap.docs.map(d => ({ ...d.data(), id: d.id }));

    console.log(`Total transactions: ${transactions.length}`);

    // Track seen transactions to find duplicates
    const seen = new Map();
    const duplicates = [];

    transactions.forEach(t => {
        // Create a key based on attributes that should be unique
        const key = `${t.date}-${t.amount}-${t.type}-${t.description}-${t.sourceAccountId || 'NA'}-${t.destinationAccountId || 'NA'}`;
        if (seen.has(key)) {
            duplicates.push({ original: seen.get(key), duplicate: t });
        } else {
            seen.set(key, t);
        }
    });

    if (duplicates.length > 0) {
        console.log(`\n--- FOUND ${duplicates.length} POTENTIAL DUPLICATES ---`);
        duplicates.forEach((d, i) => {
            const date = new Date(d.original.date).toLocaleDateString();
            console.log(`${i + 1}. ${date} | ₹${d.original.amount} | ${d.original.description}`);
            console.log(`   ID1: ${d.original.id}`);
            console.log(`   ID2: ${d.duplicate.id}`);
        });
    } else {
        console.log("\nNo exact duplicates found.");
    }

    // Check IndusInd Balance Calculation
    const indusindId = "5abb6e32-bd50-4522-8950-8d75fecf6a14";
    const itxs = transactions.filter(t => t.sourceAccountId === indusindId || t.destinationAccountId === indusindId);
    let bal = 0; // Initial was 0
    itxs.forEach(t => {
        if (t.type === 'INCOME') bal += t.amount;
        else if (t.type === 'EXPENSE' || t.type === 'WITHDRAWAL') bal -= t.amount;
        else if (t.type === 'REPAYMENT') {
            if (t.sourceAccountId === indusindId) bal -= t.amount;
            if (t.destinationAccountId === indusindId) bal += t.amount;
        }
    });
    console.log(`\nComputed IndusInd Balance in App: ₹${bal}`);

    process.exit(0);
}

findDuplicates();
