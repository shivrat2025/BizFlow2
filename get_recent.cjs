const admin = require('firebase-admin');

// we use the same initialization as check_all.cjs
const serviceAccount = require('/Users/shivangkoshia/Downloads/bizflow-75c1c-firebase-adminsdk-fbsvc-c689bd4dff.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function run() {
    const txsRef = db.collection('workspaces').doc('SHIVRAT').collection('transactions');
    const snap = await txsRef.get();
    let txs = [];
    snap.forEach(d => txs.push({ id: d.id, ...d.data() }));
    
    // Sort by createdAt descending
    txs.sort((a,b) => (b.createdAt || b.date) - (a.createdAt || a.date));
    console.log("RECENT 5:\n", JSON.stringify(txs.slice(0, 5), null, 2));
}

run();
