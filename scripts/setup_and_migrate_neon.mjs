import pkg from 'pg';
const { Pool } = pkg;
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, getDocs, collection } from "firebase/firestore";

const NEON_CONNECTION_STRING = "postgresql://neondb_owner:npg_MQYpxwa17zRV@ep-jolly-grass-b3c2d7vr-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";

const firebaseConfig = {
    apiKey: "AIzaSyDIyPAe5qGMrwj51KutR-4Xp99rQdH-Okk",
    authDomain: "bizflow-fb864.firebaseapp.com",
    projectId: "bizflow-fb864",
    storageBucket: "bizflow-fb864.firebasestorage.app",
    messagingSenderId: "112226518901",
    appId: "1:112226518901:web:d20278baf81ef2c1c9b53c"
};

const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);

const pool = new Pool({
    connectionString: NEON_CONNECTION_STRING,
    ssl: { rejectUnauthorized: false }
});

async function main() {
    const client = await pool.connect();
    console.log("Connected to Neon PostgreSQL!");

    try {
        // 1. Create Schema Tables
        console.log("Creating database tables in Neon...");
        await client.query(`
            CREATE TABLE IF NOT EXISTS workspaces (
                id VARCHAR(255) PRIMARY KEY,
                profit_percent NUMERIC DEFAULT 5,
                cloud_url TEXT,
                last_synced BIGINT,
                created_at BIGINT
            );

            CREATE TABLE IF NOT EXISTS accounts (
                id VARCHAR(255) PRIMARY KEY,
                workspace_id VARCHAR(255) NOT NULL,
                name VARCHAR(255) NOT NULL,
                type VARCHAR(50) NOT NULL,
                balance NUMERIC DEFAULT 0,
                limit_val NUMERIC DEFAULT 0,
                initial_balance NUMERIC DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS categories (
                id VARCHAR(255) PRIMARY KEY,
                workspace_id VARCHAR(255) NOT NULL,
                label VARCHAR(255) NOT NULL,
                icon VARCHAR(255)
            );

            CREATE TABLE IF NOT EXISTS suppliers (
                id VARCHAR(255) PRIMARY KEY,
                workspace_id VARCHAR(255) NOT NULL,
                name VARCHAR(255) NOT NULL
            );

            CREATE TABLE IF NOT EXISTS transactions (
                id VARCHAR(255) PRIMARY KEY,
                workspace_id VARCHAR(255) NOT NULL,
                date BIGINT NOT NULL,
                amount NUMERIC NOT NULL,
                type VARCHAR(50) NOT NULL,
                description TEXT,
                source_account_id VARCHAR(255),
                destination_account_id VARCHAR(255),
                income_source VARCHAR(50),
                expense_category VARCHAR(255),
                supplier_id VARCHAR(255),
                is_profit_withdrawal BOOLEAN DEFAULT FALSE,
                tags TEXT[],
                notes TEXT,
                invoice_url TEXT,
                payment_proof_url TEXT,
                created_at BIGINT
            );

            CREATE TABLE IF NOT EXISTS backups (
                id VARCHAR(255) PRIMARY KEY,
                workspace_id VARCHAR(255) NOT NULL,
                snapshot_date BIGINT NOT NULL,
                label VARCHAR(255),
                is_manual BOOLEAN DEFAULT FALSE,
                data JSONB
            );
        `);
        console.log("Schema creation complete!");

        // 2. Fetch Data from Firebase Workspace "SHIVRAT"
        const workspaceId = "SHIVRAT";
        console.log(`Fetching workspace metadata for '${workspaceId}' from Firebase...`);
        const wsDocRef = doc(firestore, "workspaces", workspaceId);
        const wsSnap = await getDoc(wsDocRef);

        if (wsSnap.exists()) {
            const wsData = wsSnap.data();

            // Insert Workspace
            await client.query(`
                INSERT INTO workspaces (id, profit_percent, cloud_url, last_synced)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (id) DO UPDATE 
                SET profit_percent = EXCLUDED.profit_percent,
                    cloud_url = EXCLUDED.cloud_url,
                    last_synced = EXCLUDED.last_synced;
            `, [workspaceId, wsData.profitPercent || 5, wsData.cloudUrl || '', wsData.lastSynced || Date.now()]);
            console.log("Workspace record synced!");

            // Insert Accounts
            if (Array.isArray(wsData.accounts)) {
                console.log(`Syncing ${wsData.accounts.length} accounts...`);
                for (const acc of wsData.accounts) {
                    await client.query(`
                        INSERT INTO accounts (id, workspace_id, name, type, balance, limit_val)
                        VALUES ($1, $2, $3, $4, $5, $6)
                        ON CONFLICT (id) DO UPDATE
                        SET name = EXCLUDED.name, type = EXCLUDED.type, balance = EXCLUDED.balance, limit_val = EXCLUDED.limit_val;
                    `, [acc.id, workspaceId, acc.name, acc.type, acc.balance || 0, acc.limit || 0]);
                }
            }

            // Insert Categories
            if (Array.isArray(wsData.categories)) {
                console.log(`Syncing ${wsData.categories.length} categories...`);
                for (const cat of wsData.categories) {
                    await client.query(`
                        INSERT INTO categories (id, workspace_id, label, icon)
                        VALUES ($1, $2, $3, $4)
                        ON CONFLICT (id) DO UPDATE
                        SET label = EXCLUDED.label, icon = EXCLUDED.icon;
                    `, [cat.id, workspaceId, cat.label, cat.icon || null]);
                }
            }

            // Insert Suppliers
            if (Array.isArray(wsData.suppliers)) {
                console.log(`Syncing ${wsData.suppliers.length} suppliers...`);
                for (const sup of wsData.suppliers) {
                    await client.query(`
                        INSERT INTO suppliers (id, workspace_id, name)
                        VALUES ($1, $2, $3)
                        ON CONFLICT (id) DO UPDATE
                        SET name = EXCLUDED.name;
                    `, [sup.id, workspaceId, sup.name]);
                }
            }
        }

        // 3. Fetch Transactions Sub-collection from Firebase
        console.log(`Fetching transactions sub-collection for '${workspaceId}'...`);
        const txsRef = collection(firestore, "workspaces", workspaceId, "transactions");
        const txsSnap = await getDocs(txsRef);
        console.log(`Found ${txsSnap.size} transactions in sub-collection.`);

        let insertedCount = 0;
        for (const docSnap of txsSnap.docs) {
            const tx = docSnap.data();
            const txId = docSnap.id;

            await client.query(`
                INSERT INTO transactions (
                    id, workspace_id, date, amount, type, description, 
                    source_account_id, destination_account_id, income_source, 
                    expense_category, supplier_id, is_profit_withdrawal, 
                    tags, notes, invoice_url, payment_proof_url, created_at
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
                ON CONFLICT (id) DO UPDATE SET
                    date = EXCLUDED.date,
                    amount = EXCLUDED.amount,
                    type = EXCLUDED.type,
                    description = EXCLUDED.description,
                    source_account_id = EXCLUDED.source_account_id,
                    destination_account_id = EXCLUDED.destination_account_id,
                    income_source = EXCLUDED.income_source,
                    expense_category = EXCLUDED.expense_category,
                    supplier_id = EXCLUDED.supplier_id,
                    is_profit_withdrawal = EXCLUDED.is_profit_withdrawal,
                    tags = EXCLUDED.tags,
                    notes = EXCLUDED.notes,
                    invoice_url = EXCLUDED.invoice_url,
                    payment_proof_url = EXCLUDED.payment_proof_url,
                    created_at = EXCLUDED.created_at;
            `, [
                txId, workspaceId, tx.date || Date.now(), tx.amount || 0, tx.type || 'EXPENSE',
                tx.description || '', tx.sourceAccountId || null, tx.destinationAccountId || null,
                tx.incomeSource || null, tx.expenseCategory || null, tx.supplierId || null,
                !!tx.isProfitWithdrawal, tx.tags || [], tx.notes || null,
                tx.invoiceUrl || null, tx.paymentProofUrl || null, tx.createdAt || tx.date || Date.now()
            ]);
            insertedCount++;
        }
        console.log(`Successfully migrated ${insertedCount} transactions to Neon Postgres!`);

        // Check Count in Neon
        const countRes = await client.query("SELECT COUNT(*) FROM transactions WHERE workspace_id = $1;", [workspaceId]);
        console.log(`Verification: Total transactions in Neon DB for '${workspaceId}': ${countRes.rows[0].count}`);

    } catch (err) {
        console.error("Migration Error:", err);
    } finally {
        client.release();
        await pool.end();
        process.exit(0);
    }
}

main();
