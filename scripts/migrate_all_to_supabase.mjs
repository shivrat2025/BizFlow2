import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || "https://cooszfjabepkoymaiivc.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_KEY || "sb_publishable_EFnYBpyGmAx3MuQ6xdDaQg_iqdSXdhO";
const WORKSPACE_ID = "SHIVRAT";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

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

async function migrate() {
    console.log("🚀 Starting migration to Supabase...");

    // 1. Fetch Workspace Metadata
    console.log("Fetching workspace metadata from Firebase...");
    const wsDoc = await getDoc(doc(db, 'workspaces', WORKSPACE_ID));
    const wsData = wsDoc.data() || {};

    // Upsert Workspace
    const { error: wsErr } = await supabase.from('workspaces').upsert({
        id: WORKSPACE_ID,
        profit_percent: wsData.profitPercent || 6.5,
        cloud_url: wsData.cloudUrl || '',
        last_synced: Date.now(),
        created_at: Date.now()
    });
    if (wsErr) throw new Error("Workspace upsert error: " + JSON.stringify(wsErr));
    console.log("✅ Workspace migrated.");

    // 2. Accounts
    const accounts = wsData.accounts || [];
    console.log(`Migrating ${accounts.length} accounts...`);
    if (accounts.length > 0) {
        const accRows = accounts.map(a => ({
            id: a.id,
            workspace_id: WORKSPACE_ID,
            name: a.name,
            type: a.type,
            balance: Number(a.balance || 0),
            limit_val: Number(a.limit || 0),
            initial_balance: Number(a.initialBalance || 0)
        }));
        const { error: accErr } = await supabase.from('accounts').upsert(accRows);
        if (accErr) throw new Error("Accounts error: " + JSON.stringify(accErr));
        console.log("✅ Accounts migrated.");
    }

    // 3. Categories
    const categories = wsData.categories || [];
    console.log(`Migrating ${categories.length} categories...`);
    if (categories.length > 0) {
        const catRows = categories.map(c => ({
            id: c.id,
            workspace_id: WORKSPACE_ID,
            label: c.label,
            icon: c.icon || null
        }));
        const { error: catErr } = await supabase.from('categories').upsert(catRows);
        if (catErr) throw new Error("Categories error: " + JSON.stringify(catErr));
        console.log("✅ Categories migrated.");
    }

    // 4. Suppliers
    const suppliers = wsData.suppliers || [];
    console.log(`Migrating ${suppliers.length} suppliers...`);
    if (suppliers.length > 0) {
        const supRows = suppliers.map(s => ({
            id: s.id,
            workspace_id: WORKSPACE_ID,
            name: s.name
        }));
        const { error: supErr } = await supabase.from('suppliers').upsert(supRows);
        if (supErr) throw new Error("Suppliers error: " + JSON.stringify(supErr));
        console.log("✅ Suppliers migrated.");
    }

    // 5. Transactions
    console.log("Fetching transactions from Firebase...");
    const txSnap = await getDocs(collection(db, 'workspaces', WORKSPACE_ID, 'transactions'));
    console.log(`Fetched ${txSnap.size} transactions from Firebase. Migrating in batches of 100...`);

    const allTxs = [];
    txSnap.forEach(d => {
        const t = d.data();
        allTxs.push({
            id: d.id,
            workspace_id: WORKSPACE_ID,
            date: Number(t.date || Date.now()),
            amount: Number(t.amount || 0),
            type: String(t.type || 'EXPENSE').toUpperCase(),
            description: t.description || '',
            source_account_id: t.sourceAccountId || null,
            destination_account_id: t.destinationAccountId || null,
            income_source: t.incomeSource || null,
            expense_category: t.expenseCategory || null,
            supplier_id: t.supplierId || null,
            is_profit_withdrawal: Boolean(t.isProfitWithdrawal),
            tags: Array.isArray(t.tags) ? t.tags : [],
            notes: t.notes || null,
            invoice_url: t.invoiceUrl || null,
            payment_proof_url: t.paymentProofUrl || null,
            created_at: Number(t.createdAt || t.date || Date.now())
        });
    });

    const BATCH_SIZE = 100;
    for (let i = 0; i < allTxs.length; i += BATCH_SIZE) {
        const batch = allTxs.slice(i, i + BATCH_SIZE);
        const { error: txErr } = await supabase.from('transactions').upsert(batch);
        if (txErr) throw new Error(`Batch ${i}-${i + batch.length} error: ` + JSON.stringify(txErr));
        console.log(`Progress: ${Math.min(i + BATCH_SIZE, allTxs.length)} / ${allTxs.length} transactions`);
    }

    console.log("🎉 ALL DATA MIGRATED TO SUPABASE SUCCESSFULLY!");
}

migrate().catch(err => {
    console.error("❌ Migration failed:", err);
    process.exit(1);
});
