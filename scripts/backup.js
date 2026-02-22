import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Firebase config (copied from App.tsx)
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

async function runBackup() {
    console.log('--- Starting Database Backup ---');
    const date = new Date().toISOString().split('T')[0];
    const backupBaseDir = path.join(__dirname, '../backup');
    const dailyBackupDir = path.join(backupBaseDir, date);

    if (!fs.existsSync(dailyBackupDir)) {
        fs.mkdirSync(dailyBackupDir, { recursive: true });
    }

    try {
        console.log('Fetching workspaces...');
        const workspacesSnap = await getDocs(collection(db, "workspaces"));

        for (const workspaceDoc of workspacesSnap.docs) {
            const workspaceId = workspaceDoc.id;
            console.log(`Backing up workspace: ${workspaceId}`);

            const workspaceData = workspaceDoc.data();

            // Fetch transactions subcollection
            console.log(`  Fetching transactions for ${workspaceId}...`);
            const txsSnap = await getDocs(collection(db, "workspaces", workspaceId, "transactions"));
            const transactions = txsSnap.docs.map(d => ({ ...d.data(), id: d.id }));

            const fullBackup = {
                metadata: workspaceData,
                transactions: transactions,
                backupDate: new Date().toISOString()
            };

            const filePath = path.join(dailyBackupDir, `${workspaceId}.json`);
            fs.writeFileSync(filePath, JSON.stringify(fullBackup, null, 2));
            console.log(`  Saved to ${filePath}`);
        }

        // --- RETENTION POLICY (Keep 30 days) ---
        console.log('Cleaning up old backups (older than 30 days)...');
        const folders = fs.readdirSync(backupBaseDir).filter(f => fs.lstatSync(path.join(backupBaseDir, f)).isDirectory());
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        folders.forEach(folder => {
            const folderDate = new Date(folder);
            if (folder.match(/^\d{4}-\d{2}-\d{2}$/)) {
                if (folderDate < thirtyDaysAgo) {
                    console.log(`  Removing old backup: ${folder}`);
                    fs.rmSync(path.join(backupBaseDir, folder), { recursive: true });
                }
            }
        });

        // --- GIT SYNC ---
        console.log('Syncing to GitHub...');
        try {
            execSync('git add backup/', { cwd: path.join(__dirname, '..') });
            execSync(`git commit -m "chore: automated database backup ${date}"`, { cwd: path.join(__dirname, '..') });
            execSync('git push', { cwd: path.join(__dirname, '..') });
            console.log('  Git sync successful!');
        } catch (gitErr) {
            console.warn('  Git sync failed (maybe no changes or git not configured):', gitErr.message);
        }

        console.log('--- Backup Completed Successfully ---');
        process.exit(0);
    } catch (error) {
        console.error('Backup Failed:', error);
        process.exit(1);
    }
}

runBackup();
