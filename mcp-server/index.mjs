import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import pkg from "pg";
const { Pool } = pkg;

const NEON_CONNECTION_STRING = process.env.NEON_DATABASE_URL || "postgresql://neondb_owner:npg_MQYpxwa17zRV@ep-jolly-grass-b3c2d7vr-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";
const WORKSPACE_ID = process.env.BIZFLOW_WORKSPACE_ID || "SHIVRAT";

const pool = new Pool({
    connectionString: NEON_CONNECTION_STRING,
    ssl: { rejectUnauthorized: false }
});

const server = new Server(
    { name: "bizflow-mcp", version: "1.0.0" },
    { capabilities: { tools: {} } }
);

// Helper to parse dates flexibly
function parseTimestamp(dateInput) {
    if (!dateInput) return Date.now();
    if (typeof dateInput === 'number') return dateInput;
    if (dateInput.toLowerCase() === 'today') return Date.now();
    if (dateInput.toLowerCase() === 'yesterday') return Date.now() - 86400000;
    
    // Check DD/MM/YYYY format
    if (typeof dateInput === 'string' && dateInput.includes('/')) {
        const parts = dateInput.split('/');
        if (parts.length === 3) {
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            const year = parseInt(parts[2], 10) < 100 ? 2000 + parseInt(parts[2], 10) : parseInt(parts[2], 10);
            return new Date(year, month, day).getTime();
        }
    }
    
    const parsed = new Date(dateInput).getTime();
    return isNaN(parsed) ? Date.now() : parsed;
}

// Helper to match account name fuzzily
async function resolveAccountId(client, accountName) {
    if (!accountName) return null;
    const res = await client.query("SELECT id, name FROM accounts WHERE workspace_id = $1;", [WORKSPACE_ID]);
    const accounts = res.rows;
    
    const search = accountName.toLowerCase().trim();
    const match = accounts.find(a => a.name.toLowerCase().includes(search) || search.includes(a.name.toLowerCase()));
    if (match) return match.id;
    return accounts[0]?.id || null;
}

server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "add_transaction",
                description: "Add a new financial transaction (Expense, Income, Internal Transfer, Repayment, Profit Withdrawal) directly to BizFlow Neon PostgreSQL Database.",
                inputSchema: {
                    type: "object",
                    properties: {
                        amount: { type: "number", description: "Transaction amount in INR (₹)" },
                        type: { type: "string", enum: ["EXPENSE", "INCOME", "TRANSFER", "REPAYMENT", "WITHDRAWAL"], description: "Type of transaction" },
                        description: { type: "string", description: "Description or payee details" },
                        date: { type: "string", description: "Transaction date (e.g. '2026-08-29', '29/08/2026', 'today')" },
                        account: { type: "string", description: "Source bank account name (e.g. 'IDFC', 'IndusInd', 'Credit Card')" },
                        destination_account: { type: "string", description: "Target account name for Transfers or Repayments" },
                        category: { type: "string", description: "Expense category (e.g. 'FB_ADS', 'SHIPPING', 'PRODUCT', 'OFFICE_SALARY')" },
                        income_source: { type: "string", enum: ["COD", "PREPAID"], description: "Income source pool (COD or PREPAID)" },
                        tags: { type: "array", items: { type: "string" }, description: "Tags for the transaction" },
                        notes: { type: "string", description: "Additional notes" }
                    },
                    required: ["amount", "type"]
                }
            },
            {
                name: "get_account_balances",
                description: "Get real-time balances, credit limits, and debt status for all bank & credit card accounts in BizFlow.",
                inputSchema: {
                    type: "object",
                    properties: {}
                }
            },
            {
                name: "search_transactions",
                description: "Search or query historical transactions in BizFlow by keyword, category, date range, or amount.",
                inputSchema: {
                    type: "object",
                    properties: {
                        query: { type: "string", description: "Keyword search in description, notes, or tags" },
                        category: { type: "string", description: "Filter by category (e.g. FB_ADS, SHIPPING, PRODUCT)" },
                        type: { type: "string", description: "Filter by type (EXPENSE, INCOME, TRANSFER, REPAYMENT, WITHDRAWAL)" },
                        limit: { type: "number", description: "Number of transactions to return (default: 20)" }
                    }
                }
            },
            {
                name: "get_financial_summary",
                description: "Get high-level business financial metrics: COD pool, Prepaid pool, Total Income, Total Expenses, and Net Liquidity.",
                inputSchema: {
                    type: "object",
                    properties: {}
                }
            },
            {
                name: "bulk_add_transactions",
                description: "Bulk add multiple transactions at once (e.g. extracted from PDF bank statements or invoices).",
                inputSchema: {
                    type: "object",
                    properties: {
                        transactions: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    amount: { type: "number" },
                                    type: { type: "string" },
                                    description: { type: "string" },
                                    date: { type: "string" },
                                    account: { type: "string" },
                                    category: { type: "string" }
                                },
                                required: ["amount", "type"]
                            }
                        }
                    },
                    required: ["transactions"]
                }
            }
        ]
    };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const client = await pool.connect();

    try {
        if (name === "add_transaction") {
            const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
            const dateTs = parseTimestamp(args.date);
            const sourceAccId = await resolveAccountId(client, args.account);
            const destAccId = await resolveAccountId(client, args.destination_account);

            await client.query(`
                INSERT INTO transactions (
                    id, workspace_id, date, amount, type, description,
                    source_account_id, destination_account_id, income_source,
                    expense_category, supplier_id, is_profit_withdrawal,
                    tags, notes, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15);
            `, [
                txId, WORKSPACE_ID, dateTs, args.amount, args.type.toUpperCase(),
                args.description || '', sourceAccId, destAccId,
                args.income_source || null, args.category || null, null,
                args.type.toUpperCase() === 'WITHDRAWAL', args.tags || [], args.notes || null, Date.now()
            ]);

            return {
                content: [{
                    type: "text",
                    text: `✅ Transaction Successfully Saved to BizFlow!
• ID: ${txId}
• Type: ${args.type}
• Amount: ₹${args.amount.toLocaleString()}
• Date: ${new Date(dateTs).toLocaleDateString('en-IN')}
• Description: ${args.description || 'N/A'}
• Account ID: ${sourceAccId || 'Default'}`
                }]
            };
        }

        if (name === "get_account_balances") {
            const accRes = await client.query("SELECT * FROM accounts WHERE workspace_id = $1;", [WORKSPACE_ID]);
            const txRes = await client.query("SELECT * FROM transactions WHERE workspace_id = $1;", [WORKSPACE_ID]);
            
            const accounts = accRes.rows;
            const transactions = txRes.rows;

            const computed = accounts.map(acc => {
                let balance = Number(acc.limit_val || 0);
                transactions.forEach(t => {
                    const amt = Number(t.amount);
                    if (t.type === 'REPAYMENT' || t.type === 'TRANSFER') {
                        if (t.source_account_id === acc.id) balance -= amt;
                        if (t.destination_account_id === acc.id) balance += amt;
                    } else {
                        if (t.source_account_id === acc.id) {
                            balance += (t.type === 'INCOME' ? amt : -amt);
                        }
                    }
                });
                return { name: acc.name, type: acc.type, balance, limit: Number(acc.limit_val || 0) };
            });

            return {
                content: [{
                    type: "text",
                    text: JSON.stringify(computed, null, 2)
                }]
            };
        }

        if (name === "search_transactions") {
            const limit = args.limit || 20;
            let queryText = "SELECT id, date, amount, type, description, expense_category, created_at FROM transactions WHERE workspace_id = $1";
            const params = [WORKSPACE_ID];
            let pIdx = 2;

            if (args.query) {
                queryText += ` AND (description ILIKE $${pIdx} OR notes ILIKE $${pIdx})`;
                params.push(`%${args.query}%`);
                pIdx++;
            }
            if (args.category) {
                queryText += ` AND expense_category = $${pIdx}`;
                params.push(args.category);
                pIdx++;
            }
            if (args.type) {
                queryText += ` AND type = $${pIdx}`;
                params.push(args.type.toUpperCase());
                pIdx++;
            }

            queryText += ` ORDER BY date DESC LIMIT $${pIdx};`;
            params.push(limit);

            const res = await client.query(queryText, params);
            return {
                content: [{
                    type: "text",
                    text: `Found ${res.rows.length} transactions:\n` + JSON.stringify(res.rows, null, 2)
                }]
            };
        }

        if (name === "get_financial_summary") {
            const txRes = await client.query("SELECT amount, type, income_source, expense_category FROM transactions WHERE workspace_id = $1;", [WORKSPACE_ID]);
            let totalIncome = 0, totalExpenses = 0, totalCod = 0, totalPrepaid = 0;

            txRes.rows.forEach(t => {
                const amt = Number(t.amount);
                if (t.type === 'INCOME') {
                    totalIncome += amt;
                    if (t.income_source === 'COD') totalCod += amt;
                    if (t.income_source === 'PREPAID') totalPrepaid += amt;
                } else if (t.type === 'EXPENSE') {
                    totalExpenses += amt;
                }
            });

            return {
                content: [{
                    type: "text",
                    text: JSON.stringify({
                        totalIncome,
                        totalExpenses,
                        codIncome: totalCod,
                        prepaidIncome: totalPrepaid,
                        netCashflow: totalIncome - totalExpenses
                    }, null, 2)
                }]
            };
        }

        if (name === "bulk_add_transactions") {
            const list = args.transactions || [];
            let count = 0;
            for (const item of list) {
                const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
                const dateTs = parseTimestamp(item.date);
                const sourceAccId = await resolveAccountId(client, item.account);

                await client.query(`
                    INSERT INTO transactions (
                        id, workspace_id, date, amount, type, description,
                        source_account_id, expense_category, created_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);
                `, [txId, WORKSPACE_ID, dateTs, item.amount, (item.type || 'EXPENSE').toUpperCase(), item.description || '', sourceAccId, item.category || null, Date.now()]);
                count++;
            }
            return {
                content: [{
                    type: "text",
                    text: `✅ Successfully bulk inserted ${count} transactions into BizFlow!`
                }]
            };
        }

        throw new Error(`Tool not found: ${name}`);
    } catch (err) {
        return {
            isError: true,
            content: [{ type: "text", text: `Error executing ${name}: ${err.message}` }]
        };
    } finally {
        client.release();
    }
});

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("BizFlow MCP Server running on stdio");
}

main().catch((err) => {
    console.error("Fatal MCP error:", err);
    process.exit(1);
});
