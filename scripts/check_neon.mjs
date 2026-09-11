import pkg from 'pg';
const { Pool } = pkg;

const NEON_CONNECTION_STRING = "postgresql://neondb_owner:npg_MQYpxwa17zRV@ep-jolly-grass-b3c2d7vr-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";

const pool = new Pool({ connectionString: NEON_CONNECTION_STRING, ssl: { rejectUnauthorized: false } });

async function verify() {
    const client = await pool.connect();
    const ws = await client.query("SELECT * FROM workspaces;");
    const accs = await client.query("SELECT COUNT(*) FROM accounts;");
    const cats = await client.query("SELECT COUNT(*) FROM categories;");
    const sups = await client.query("SELECT COUNT(*) FROM suppliers;");
    const txs = await client.query("SELECT COUNT(*) FROM transactions;");
    const latest = await client.query("SELECT id, description, amount, date, created_at FROM transactions ORDER BY created_at DESC LIMIT 5;");

    console.log("=== NEON DATABASE STATS ===");
    console.log("Workspaces:", ws.rows.length);
    console.log("Accounts count:", accs.rows[0].count);
    console.log("Categories count:", cats.rows[0].count);
    console.log("Suppliers count:", sups.rows[0].count);
    console.log("Transactions count:", txs.rows[0].count);
    console.log("\nLatest 5 Transactions in Neon:");
    console.table(latest.rows);

    client.release();
    await pool.end();
}

verify().catch(console.error);
