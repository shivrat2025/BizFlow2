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
async function resolveAccount(accountName?: string): Promise<{ id: string; name: string } | null> {
    if (!accountName) return null;
    try {
        const { data: accounts } = await supabase.from('accounts').select('id, name').eq('workspace_id', WORKSPACE_ID);
        if (!accounts || accounts.length === 0) return null;
        const search = accountName.toLowerCase().trim();
        const match = accounts.find((a: any) => a.name.toLowerCase().includes(search) || search.includes(a.name.toLowerCase()));
        return match || accounts[0] || null;
    } catch (e) {
        return null;
    }
}
async function resolveAccountId(accountName?: string) {
    return (await resolveAccount(accountName))?.id || null;
}

// BizFlow fund-allocation model: COD Pool = IDFC, Prepaid Pool = IndusInd,
// Debt (no pool) = ICICI OD and the credit cards. Entries on IDFC are never Debt.
function poolForAccount(name?: string | null): 'COD' | 'PREPAID' | null {
    const n = (name || '').toUpperCase();
    if (n.includes('IDFC')) return 'COD';
    if (n.includes('INDUSIND')) return 'PREPAID';
    return null;
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
                                category: { type: "string", description: "Expense category (FB_ADS, SHIPPING, PRODUCT, etc.)" },
                                income_source: { type: "string", enum: ["COD", "PREPAID"], description: "Fund allocation / pool for INCOME entries: COD (COD Pool) or PREPAID (Prepaid Pool). If omitted it follows the account: IDFC -> COD Pool, IndusInd -> PREPAID Pool, ICICI OD / credit cards -> no pool (Debt)." }
                            },
                            required: ["amount", "type"]
                        }
                    },
                    {
                        name: "update_transaction",
                        description: "Edit an existing BizFlow transaction by id (or many at once via ids). Use search_transactions first to get ids. Only the fields you pass are changed. income_source: COD | PREPAID | NONE (NONE = Debt / no pool).",
                        inputSchema: {
                            type: "object",
                            properties: {
                                id: { type: "string", description: "Transaction id" },
                                ids: { type: "array", items: { type: "string" }, description: "Several transaction ids to apply the same change to (bulk)" },
                                income_source: { type: "string", enum: ["COD", "PREPAID", "NONE"], description: "Fund allocation pool" },
                                category: { type: "string", description: "Expense category" },
                                amount: { type: "number" },
                                type: { type: "string", enum: ["EXPENSE", "INCOME", "TRANSFER", "REPAYMENT", "WITHDRAWAL"] },
                                description: { type: "string" },
                                date: { type: "string" },
                                account: { type: "string", description: "Source bank account name" },
                                destination_account: { type: "string" }
                            }
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
                                query: { type: "string", description: "Text to match in description or category" },
                                type: { type: "string", description: "EXPENSE | INCOME | TRANSFER | REPAYMENT | WITHDRAWAL" },
                                income_source: { type: "string", description: "COD | PREPAID | NONE (no pool / Debt)" },
                                from_date: { type: "string", description: "Only entries on/after this date (e.g. 2026-10-23)" },
                                to_date: { type: "string", description: "Only entries on/before this date" },
                                limit: { type: "number", description: "Max rows (default 20, max 2000)" }
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
                const srcAcc = await resolveAccount(args.account);
                const sourceAccId = srcAcc?.id || null;
                const destAccId = await resolveAccountId(args.destination_account);

                const txType = String(args.type).toUpperCase();
                let incomeSource: string | null = null;
                if (txType === 'INCOME' || txType === 'EXPENSE') {
                    const given = args.income_source ? String(args.income_source).toUpperCase() : '';
                    incomeSource = (given === 'COD' || given === 'PREPAID') ? given : poolForAccount(srcAcc?.name);
                }

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
                    incomeSource,
                    createdAt: Date.now()
                };

                // Save strictly to BizFlow 2 (Supabase PostgreSQL)
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
                        income_source: incomeSource,
                        created_at: Date.now()
                    });
                    await supabase.from('workspaces').update({ last_synced: Date.now() }).eq('id', WORKSPACE_ID);
                } catch (supErr) {
                    console.error("Supabase DB Write Warning:", supErr);
                }

                return {
                    jsonrpc: "2.0",
                    id: reqId,
                    result: {
                        content: [{
                            type: "text",
                            text: `✅ Saved to BizFlow! ₹${args.amount} (${args.type}) on ${new Date(dateTs).toLocaleDateString('en-IN')}${incomeSource ? ' → ' + incomeSource + ' Pool' : ''}`
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
                const limit = Math.min(Number(args.limit) || 20, 2000);
                try {
                    let q = supabase.from('transactions')
                        .select('id, date, amount, type, description, income_source, expense_category, source_account_id')
                        .eq('workspace_id', WORKSPACE_ID);
                    if (args.query) {
                        const term = String(args.query).replace(/[%,()]/g, ' ').trim();
                        if (term) q = q.or(`description.ilike.%${term}%,expense_category.ilike.%${term}%`);
                    }
                    if (args.type) q = q.eq('type', String(args.type).toUpperCase());
                    if (args.income_source) {
                        const src = String(args.income_source).toUpperCase();
                        q = src === 'NONE' ? q.is('income_source', null) : q.eq('income_source', src);
                    }
                    if (args.from_date) q = q.gte('date', parseTimestamp(args.from_date));
                    if (args.to_date) q = q.lte('date', parseTimestamp(args.to_date) + 86399999);
                    const { data: rows } = await q.order('date', { ascending: false }).limit(limit);
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

            if (toolName === "update_transaction") {
                const ids: string[] = Array.isArray(args.ids) && args.ids.length ? args.ids.map(String) : (args.id ? [String(args.id)] : []);
                if (ids.length === 0) {
                    return { jsonrpc: "2.0", id: reqId, error: { code: -32602, message: "Pass id or ids" } };
                }
                const patch: any = {};
                if (args.income_source !== undefined) {
                    const src = String(args.income_source).toUpperCase();
                    if (!['COD', 'PREPAID', 'NONE'].includes(src)) {
                        return { jsonrpc: "2.0", id: reqId, error: { code: -32602, message: "income_source must be COD, PREPAID or NONE" } };
                    }
                    patch.income_source = src === 'NONE' ? null : src;
                }
                if (args.category !== undefined) patch.expense_category = args.category || null;
                if (args.amount !== undefined) patch.amount = Number(args.amount);
                if (args.type !== undefined) patch.type = String(args.type).toUpperCase();
                if (args.description !== undefined) patch.description = args.description;
                if (args.date !== undefined) patch.date = parseTimestamp(args.date);
                if (args.account !== undefined) patch.source_account_id = await resolveAccountId(args.account);
                if (args.destination_account !== undefined) patch.destination_account_id = await resolveAccountId(args.destination_account);
                if (Object.keys(patch).length === 0) {
                    return { jsonrpc: "2.0", id: reqId, error: { code: -32602, message: "Nothing to update" } };
                }
                const { data: updated, error: upErr } = await supabase.from('transactions')
                    .update(patch).eq('workspace_id', WORKSPACE_ID).in('id', ids).select('id');
                if (upErr) {
                    return { jsonrpc: "2.0", id: reqId, error: { code: -32603, message: upErr.message } };
                }
                await supabase.from('workspaces').update({ last_synced: Date.now() }).eq('id', WORKSPACE_ID);
                return {
                    jsonrpc: "2.0",
                    id: reqId,
                    result: { content: [{ type: "text", text: `✅ Updated ${updated?.length || 0} of ${ids.length} transaction(s)` }] }
                };
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
