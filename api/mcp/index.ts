import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || "https://cooszfjabepkoymaiivc.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || "sb_publishable_EFnYBpyGmAx3MuQ6xdDaQg_iqdSXdhO";
const WORKSPACE_ID = process.env.BIZFLOW_WORKSPACE_ID || "SHIVRAT";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

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
    try {
        const { data: accounts } = await supabase.from('accounts').select('id, name').eq('workspace_id', WORKSPACE_ID);
        if (!accounts || accounts.length === 0) return null;
        const search = accountName.toLowerCase().trim();
        const match = accounts.find((a: any) => a.name.toLowerCase().includes(search) || search.includes(a.name.toLowerCase()));
        if (match) return match.id;
        return accounts[0]?.id || null;
    } catch (e) {
        return null;
    }
}

// Write to Firebase Firestore REST API (Failsafe for Neon quota/downtime)
async function writeToFirestore(txDoc: any) {
    try {
        const fields: any = {};
        for (const [key, val] of Object.entries(txDoc)) {
            if (val === null || val === undefined) continue;
            if (typeof val === 'number') {
                fields[key] = Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
            } else {
                fields[key] = { stringValue: String(val) };
            }
        }

        const url = `https://firestore.googleapis.com/v1/projects/bizflow-fb864/databases/(default)/documents/workspaces/${WORKSPACE_ID}/transactions?documentId=${txDoc.id}`;
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fields })
        });
    } catch (err) {
        console.error("Firestore REST Write Error:", err);
    }
}

async function handleRpc(body: any) {
    const { jsonrpc, method, params, id } = body || {};
    const reqId = id !== undefined ? id : 1;

    // MCP Initialization
    if (method === 'initialize') {
        return {
            jsonrpc: "2.0",
            id: reqId,
            result: {
                protocolVersion: "2024-11-05",
                capabilities: { 
                    tools: {},
                    resources: {},
                    prompts: {}
                },
                serverInfo: { name: "bizflow", version: "1.0.0" }
            }
        };
    }

    // Notifications / Ping
    if (method === 'notifications/initialized' || method === 'initialized' || method === 'ping') {
        return {
            jsonrpc: "2.0",
            id: reqId,
            result: {}
        };
    }

    // List Resources & Prompts
    if (method === 'resources/list') {
        return { jsonrpc: "2.0", id: reqId, result: { resources: [] } };
    }
    if (method === 'prompts/list') {
        return { jsonrpc: "2.0", id: reqId, result: { prompts: [] } };
    }

    // List Tools
    if (method === 'tools/list') {
        return {
            jsonrpc: "2.0",
            id: reqId,
            result: {
                tools: [
                    {
                        name: "add_transaction",
                        description: "Add a financial transaction (Expense, Income, Internal Transfer, Repayment, Profit Withdrawal) directly to BizFlow DB.",
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
                        description: "Get real-time balances for all bank accounts in BizFlow.",
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
        };
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

                const txDoc = {
                    id: txId,
                    workspaceId: WORKSPACE_ID,
                    date: dateTs,
                    amount: Number(args.amount) || 0,
                    type: String(args.type).toUpperCase(),
                    description: args.description || '',
                    sourceAccountId: sourceAccId,
                    destinationAccountId: destAccId,
                    expenseCategory: args.category || null,
                    createdAt: Date.now()
                };

                // 1. Dual Write: Save to Firebase Firestore REST API (Instant real-time update in app)
                await writeToFirestore(txDoc);

                // 2. Dual Write: Save to Supabase
                try {
                    await supabase.from('transactions').upsert({
                        id: txId,
                        workspace_id: WORKSPACE_ID,
                        date: dateTs,
                        amount: args.amount,
                        type: String(args.type).toUpperCase(),
                        description: args.description || '',
                        source_account_id: sourceAccId,
                        destination_account_id: destAccId,
                        expense_category: args.category || null,
                        created_at: Date.now()
                    });
                } catch (supErr) {
                    console.error("Supabase DB Write Warning:", supErr);
                }

                return {
                    jsonrpc: "2.0",
                    id: reqId,
                    result: {
                        content: [{
                            type: "text",
                            text: `✅ Saved to BizFlow! ₹${args.amount} (${args.type}) on ${new Date(dateTs).toLocaleDateString('en-IN')}`
                        }]
                    }
                };
            }

            if (toolName === "get_account_balances") {
                try {
                    const { data: accs } = await supabase.from('accounts').select('name, type, balance, limit_val').eq('workspace_id', WORKSPACE_ID);
                    return {
                        jsonrpc: "2.0",
                        id: reqId,
                        result: {
                            content: [{ type: "text", text: JSON.stringify(accs || [], null, 2) }]
                        }
                    };
                } catch (e) {
                    return {
                        jsonrpc: "2.0",
                        id: reqId,
                        result: {
                            content: [{ type: "text", text: "Accounts active in BizFlow: IDFC Bank, IndusInd Bank, Credit Card, ICICI OD" }]
                        }
                    };
                }
            }

            if (toolName === "search_transactions") {
                const limit = args.limit || 20;
                try {
                    const { data: rows } = await supabase.from('transactions').select('id, date, amount, type, description').eq('workspace_id', WORKSPACE_ID).order('date', { ascending: false }).limit(limit);
                    return {
                        jsonrpc: "2.0",
                        id: reqId,
                        result: {
                            content: [{ type: "text", text: JSON.stringify(rows || [], null, 2) }]
                        }
                    };
                } catch (e) {
                    return {
                        jsonrpc: "2.0",
                        id: reqId,
                        result: {
                            content: [{ type: "text", text: "[]" }]
                        }
                    };
                }
            }

            return {
                jsonrpc: "2.0",
                id: reqId,
                error: { code: -32601, message: `Tool ${toolName} not found` }
            };
        } catch (err: any) {
            return {
                jsonrpc: "2.0",
                id: reqId,
                error: { code: -32603, message: err.message }
            };
        }
    }

    // Generic fallback for any other method
    return {
        jsonrpc: "2.0",
        id: reqId,
        result: {}
    };
}

export default async function handler(req: any, res: any) {
    // CORS headers - Allow Claude Web, Cursor, and all clients
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method === 'GET') {
        const acceptHeader = req.headers.accept || '';
        const host = req.headers.host || 'biz-flow2.vercel.app';
        const proto = req.headers['x-forwarded-proto'] || 'https';
        const fullEndpointUrl = `${proto}://${host}/api/mcp`;

        if (acceptHeader.includes('text/event-stream')) {
            // SSE Stream Header for MCP Remote SSE protocol
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            
            res.write(`event: endpoint\ndata: ${fullEndpointUrl}\n\n`);
            return res.end();
        }

        // Standard HTTP GET check (Claude Connector status check / health check)
        return res.status(200).json({
            status: "ok",
            name: "bizflow",
            version: "1.0.0",
            mcp: true,
            protocolVersion: "2024-11-05",
            endpoint: fullEndpointUrl
        });
    }

    if (req.method === 'POST') {
        let body = req.body || {};
        if (typeof body === 'string') {
            try {
                body = JSON.parse(body);
            } catch (e) {
                body = {};
            }
        }

        if (Array.isArray(body)) {
            const responses = await Promise.all(body.map(item => handleRpc(item)));
            return res.status(200).json(responses);
        }

        const response = await handleRpc(body);
        return res.status(200).json(response);
    }

    return res.status(405).json({ error: "Method not allowed" });
}
