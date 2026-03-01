const { initializeApp } = require("firebase/app");
const { getFirestore, doc, getDoc } = require("firebase/firestore");

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
    console.log("Fetching accounts from SHIVRAT...");
    const wsRef = doc(db, "workspaces", "SHIVRAT");
    const wsSnap = await getDoc(wsRef);
    if (!wsSnap.exists()) {
        console.error("Workspace SHIVRAT not found!");
        return;
    }

    console.log("Accounts:");
    console.log(JSON.stringify(wsSnap.data().accounts, null, 2));
}

check().catch(console.error).then(() => process.exit(0));
