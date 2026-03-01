const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs } = require("firebase/firestore");

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

async function findRepayments() {
    const txsRef = collection(db, "workspaces", "SHIVRAT", "transactions");
    const txsSnap = await getDocs(txsRef);
    let txs = [];
    txsSnap.forEach(snap => {
        const t = snap.data();
        if (JSON.stringify(t).toLowerCase().includes('repayment')) {
            txs.push({ id: snap.id, ...t });
        }
    });

    console.log(`Found ${txs.length} repayments.`);
    txs.forEach(t => console.log(t));
}

findRepayments().catch(console.error).then(() => process.exit(0));
