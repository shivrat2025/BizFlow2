import { neon } from '@neondatabase/serverless';

const NEON_URL = process.env.NEON_DATABASE_URL || "postgresql://neondb_owner:npg_MQYpxwa17zRV@ep-jolly-grass-b3c2d7vr-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";
const WORKSPACE_ID = process.env.BIZFLOW_WORKSPACE_ID || "SHIVRAT";

const sql = neon(NEON_URL);

// Helper to parse dates flexibly
function parseTimestamp(dateInput: any) {
    if (!dateInput) return Date.now();
    if (typeof dateInput === 'number') return dateInput;
    if (String(dateInput).toLowerCase() === 'today') return Date.now();
    if (String(dateInput).toLowerCase() === 'yesterday') return Date.now() - 86400000;
    
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

// Helper to resolve account IDs
async function resolveAccountId(accountName?: string) {
    if (!accountName) return null;
    const accounts = await sql`SELECT id, name FROM accounts WHERE workspace_id = ${WORKSPACE_ID};`;
    const search = accountName.toLowerCase().trim();
    const match = accounts.find((a: any) => a.name.toLowerCase().includes(search) || search.includes(a.name.toLowerCase()));
    if (match) return match.id;
    return accounts[0]?.id || null;
}

export default async function handler(req: any, res: any) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method === 'GET') {
        // SSE Stream Header for MCP Remote HTTP
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        
        res.write(`event: endpoint\ndata: ${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}/api/mcp\n\n`);
        return;
    }

    if (req.method === 'POST') {
        const body = req.body || {};
        const { jsonrpc, method, params, id } = body;

        // MCP Initialization
        if (method === 'initialize') {
            return res.status(200).json({
                jsonrpc: "2.0",
                id,
                result: {
                    protocolVersion: "2024-11-05",
                    capabilities: { tools: {} },
                    serverInfo: { name: "bizflow-remote-mcp", version: "1.0.0" }
                }
            });
        }

        // List Tools
        if (method === 'tools/list') {
            return res.status(200).json({
                jsonrpc: "2.0",
                id,
                result: {
                    tools: [
                        {
                            name: "add_transaction",
                            description: "Add a financial transaction (Expense, Income, Internal Transfer, Repayment, Profit Withdrawal) directly to BizFlow Neon DB.",
                            inputSchema: {
                                type: "object",
                                properties: {
                                    amount: { type: "number", description: "Amount in ₹" },
                                    type: { type: "string", enum: ["EXPENSE", "INCOME", "TRANSFER", "REPAYMENT", "WITHDRAWAL"] },
                                    description: { type: "string" },
                                    date: { type: "string", description: "Date (e.g. '2026-08-29', 'today')" },
                                    account: { type: "string", description: "Bank account name (IDFC, IndusInd, etc.)" },
                                    destination_account: { type: "string" },
                                    category: { type: "string", description: "Expense category (FB_ADS, SHIPPING, PRODUCT, etc.)" }
                                },
                                required: ["amount", "type"]
                            }
                        },
                        {
                            name: "get_account_balances",
                            description: "Get real-time balances for all accounts in BizFlow.",
                            inputSchema: { type: "object", properties: {} }
                        },
                        {
                            name: "search_transactions",
                            description: "Search transactions by keyword, type, or category.",
                            inputSchema: {
                                type: "object",
                                properties: {
                                    query: { type: "string" },
                                    type: { type: "string" },
                                    limit: { type: "number" }
                                }
                            }
                        }
                    ]
                }
            });
        }

        // Call Tool
        if (method === 'tools/call') {
            const toolName = params?.name;
            const args = params?.arguments || {};

            try {
                if (toolName === "add_transaction") {
                    const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
                    const dateTs = parseTimestamp(args.date);
                    const sourceAccId = await resolveAccountId(args.account);
                    const destAccId = await resolveAccountId(args.destination_account);

                    await sql`
                        INSERT INTO transactions (
                            id, workspace_id, date, amount, type, description,
                            source_account_id, destination_account_id, expense_category, created_at
                        ) VALUES (
                            ${txId}, ${WORKSPACE_ID}, ${dateTs}, ${args.amount}, ${String(args.type).toUpperCase()},
                            ${args.description || ''}, ${sourceAccId}, ${destAccId}, ${args.category || null}, ${Date.now()}
                        );
                    `;

                    return res.status(200).json({
                        jsonrpc: "2.0",
                        id,
                        result: {
                            content: [{
                                type: "text",
                                text: `✅ Saved to BizFlow! ₹${args.amount} (${args.type}) on ${new Date(dateTs).toLocaleDateString('en-IN')}`
                            }]
                        }
                    });
                }

                if (toolName === "get_account_balances") {
                    const accs = await sql`SELECT name, type, balance, limit_val FROM accounts WHERE workspace_id = ${WORKSPACE_ID};`;
                    return res.status(200).json({
                        jsonrpc: "2.0",
                        id,
                        result: {
                            content: [{ type: "text", text: JSON.stringify(accs, null, 2) }]
                        }
                    });
                }

                if (toolName === "search_transactions") {
                    const limit = args.limit || 20;
                    const rows = await sql`SELECT id, date, amount, type, description FROM transactions WHERE workspace_id = ${WORKSPACE_ID} ORDER BY date DESC LIMIT ${limit};`;
                    return res.status(200).json({
                        jsonrpc: "2.0",
                        id,
                        result: {
                            content: [{ type: "text", text: JSON.stringify(rows, null, 2) }]
                        }
                    });
                }

                return res.status(400).json({ jsonrpc: "2.0", id, error: { code: -32601, message: `Tool ${toolName} not found` } });
            } catch (err: any) {
                return res.status(500).json({ jsonrpc: "2.0", id, error: { code: -32603, message: err.message } });
            }
        }

        return res.status(400).json({ jsonrpc: "2.0", id, error: { code: -32601, message: "Method not found" } });
    }

    return res.status(405).json({ error: "Method not allowed" });
}
