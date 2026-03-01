const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs, doc, getDoc, writeBatch } = require("firebase/firestore");

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

async function listBackups() {
    console.log("Fetching backups...");
    const backupsRef = collection(db, "backups");
    const snap = await getDocs(backupsRef);
    let backups = [];
    snap.forEach(doc => {
        const data = doc.data();
        backups.push({
            id: doc.id,
            snapshotDate: data.snapshotDate,
            label: data.label,
            originalWorkspace: data.originalWorkspace,
            timestamp: new Date(data.snapshotDate).toISOString()
        });
    });

    backups.sort((a, b) => b.snapshotDate - a.snapshotDate);
    console.log(backups);
}

listBackups().catch(console.error).then(() => process.exit(0));
