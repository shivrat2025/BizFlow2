import { createClient } from '@supabase/supabase-js';
import { Account, Transaction, ExpenseCategory, Supplier } from '../types';

export const SUPABASE_URL = "https://cooszfjabepkoymaiivc.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_EFnYBpyGmAx3MuQ6xdDaQg_iqdSXdhO";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export interface WorkspaceDataResult {
    isUpToDate: boolean;
    profitPercent: number;
    cloudUrl: string;
    lastSynced: number;
    accounts?: Account[];
    categories?: ExpenseCategory[];
    suppliers?: Supplier[];
    transactions?: Transaction[];
}

export const supabaseDb = {
    async touchWorkspace(workspaceId: string, timestamp = Date.now()) {
        try {
            const { error } = await supabase
                .from('workspaces')
                .update({ last_synced: timestamp })
                .eq('id', workspaceId);
            if (error) {
                await supabase
                    .from('workspaces')
                    .upsert({ id: workspaceId, last_synced: timestamp });
            }
        } catch (e) {
            console.warn("Supabase touchWorkspace error:", e);
        }
    },

    async getWorkspaceData(
        workspaceId: string,
        onProgress?: (percent: number, label: string) => void,
        options?: { localLastSynced?: number; force?: boolean }
    ): Promise<WorkspaceDataResult> {
        try {
            onProgress?.(15, 'Connecting to Supabase...');

            // 1. Ultra-light metadata handshake (~150 bytes egress)
            const { data: wsData, error: wsErr } = await supabase
                .from('workspaces')
                .select('id, profit_percent, cloud_url, last_synced')
                .eq('id', workspaceId)
                .maybeSingle();

            if (wsErr) throw wsErr;

            const remoteLastSynced = Number(wsData?.last_synced || 0);
            const profitPercent = Number(wsData?.profit_percent ?? 5);
            const cloudUrl = wsData?.cloud_url || '';

            // If local data is already up-to-date and not forced, stop here!
            if (!options?.force && options?.localLastSynced && remoteLastSynced > 0 && options.localLastSynced >= remoteLastSynced) {
                onProgress?.(100, 'Up to date');
                return {
                    isUpToDate: true,
                    profitPercent,
                    cloudUrl,
                    lastSynced: remoteLastSynced
                };
            }

            onProgress?.(30, 'Fetching accounts & transactions (zero images)...');
            const TX_FIELDS = 'id, date, amount, type, description, source_account_id, destination_account_id, income_source, expense_category, supplier_id, is_profit_withdrawal, tags, created_at';

            // High-speed parallel fetch: Accounts, Categories, Suppliers, Transaction batches & Attachment ID indicators
            const [accRes, catRes, supRes, p1, p2, p3, p4, invIdsRes, proofIdsRes] = await Promise.all([
                supabase.from('accounts').select('*').eq('workspace_id', workspaceId),
                supabase.from('categories').select('*').eq('workspace_id', workspaceId),
                supabase.from('suppliers').select('*').eq('workspace_id', workspaceId),
                supabase.from('transactions').select(TX_FIELDS).eq('workspace_id', workspaceId).order('date', { ascending: false }).range(0, 999),
                supabase.from('transactions').select(TX_FIELDS).eq('workspace_id', workspaceId).order('date', { ascending: false }).range(1000, 1999),
                supabase.from('transactions').select(TX_FIELDS).eq('workspace_id', workspaceId).order('date', { ascending: false }).range(2000, 2999),
                supabase.from('transactions').select(TX_FIELDS).eq('workspace_id', workspaceId).order('date', { ascending: false }).range(3000, 3999),
                supabase.from('transactions').select('id').eq('workspace_id', workspaceId).not('invoice_url', 'is', null),
                supabase.from('transactions').select('id').eq('workspace_id', workspaceId).not('payment_proof_url', 'is', null)
            ]);

            const invoiceIdSet = new Set((invIdsRes.data || []).map((r: any) => r.id));
            const proofIdSet = new Set((proofIdsRes.data || []).map((r: any) => r.id));

            onProgress?.(70, 'Stitching transaction batches...');
            const allTxs: any[] = [
                ...(p1.data || []),
                ...(p2.data || []),
                ...(p3.data || []),
                ...(p4.data || [])
            ];

            onProgress?.(85, `Loaded ${allTxs.length} records...`);

            const accounts: Account[] = (accRes.data || []).map((a: any) => ({
                id: a.id,
                name: a.name,
                type: a.type,
                balance: Number(a.balance),
                limit: Number(a.limit_val || 0)
            }));

            const categories: ExpenseCategory[] = (catRes.data || []).map((c: any) => ({
                id: c.id,
                label: c.label,
                icon: c.icon
            }));

            const suppliers: Supplier[] = (supRes.data || []).map((s: any) => ({
                id: s.id,
                name: s.name
            }));

            const transactions: Transaction[] = (allTxs || []).map((t: any) => ({
                id: t.id,
                date: Number(t.date),
                amount: Number(t.amount),
                type: t.type,
                description: t.description || '',
                sourceAccountId: t.source_account_id,
                destinationAccountId: t.destination_account_id,
                incomeSource: t.income_source,
                expenseCategory: t.expense_category,
                supplierId: t.supplier_id,
                isProfitWithdrawal: Boolean(t.is_profit_withdrawal),
                tags: Array.isArray(t.tags) ? t.tags : [],
                notes: t.notes,
                hasInvoice: invoiceIdSet.has(t.id),
                hasPaymentProof: proofIdSet.has(t.id),
                invoiceUrl: undefined, // Pull on-demand when user clicks
                paymentProofUrl: undefined, // Pull on-demand when user clicks
                createdAt: Number(t.created_at || t.date)
            }));

            onProgress?.(100, 'Sync Complete');

            return {
                isUpToDate: false,
                profitPercent,
                cloudUrl,
                lastSynced: remoteLastSynced || Date.now(),
                accounts,
                categories,
                suppliers,
                transactions
            };
        } catch (err) {
            console.error("Supabase getWorkspaceData error:", err);
            throw err;
        }
    },

    async getTransactionAttachment(txId: string) {
        try {
            const { data, error } = await supabase
                .from('transactions')
                .select('notes, invoice_url, payment_proof_url')
                .eq('id', txId)
                .maybeSingle();
            if (error) throw error;
            return {
                notes: data?.notes || undefined,
                invoiceUrl: data?.invoice_url || undefined,
                paymentProofUrl: data?.payment_proof_url || undefined
            };
        } catch (e) {
            console.error("Fetch attachment error:", e);
            return null;
        }
    },

    async getAttachment(txId: string, field: 'invoiceUrl' | 'paymentProofUrl') {
        const cacheKey = `bf_att_${txId}_${field}`;
        try {
            const cached = sessionStorage.getItem(cacheKey);
            if (cached) return cached;
        } catch (e) {}

        const col = field === 'invoiceUrl' ? 'invoice_url' : 'payment_proof_url';
        try {
            const { data, error } = await supabase
                .from('transactions')
                .select(col)
                .eq('id', txId)
                .maybeSingle();
            if (error) throw error;
            const val = (data as any)?.[col] || null;
            if (val) {
                try {
                    sessionStorage.setItem(cacheKey, val);
                } catch (e) {}
            }
            return val;
        } catch (e) {
            console.error(`Fetch ${field} error:`, e);
            return null;
        }
    },

    async saveTransaction(workspaceId: string, tx: Transaction) {
        try {
            const row: any = {
                id: tx.id,
                workspace_id: workspaceId,
                date: tx.date,
                amount: tx.amount,
                type: tx.type,
                description: tx.description || '',
                source_account_id: tx.sourceAccountId || null,
                destination_account_id: tx.destinationAccountId || null,
                income_source: tx.incomeSource || null,
                expense_category: tx.expenseCategory || null,
                supplier_id: tx.supplierId || null,
                is_profit_withdrawal: Boolean(tx.isProfitWithdrawal),
                tags: tx.tags || [],
                notes: tx.notes || null,
                created_at: tx.createdAt || tx.date
            };

            if (tx.invoiceUrl !== undefined) {
                row.invoice_url = tx.invoiceUrl || null;
            }
            if (tx.paymentProofUrl !== undefined) {
                row.payment_proof_url = tx.paymentProofUrl || null;
            }

            const { error } = await supabase.from('transactions').upsert(row);
            if (error) throw error;
            await this.touchWorkspace(workspaceId);
        } catch (err) {
            console.error("Supabase saveTransaction error:", err);
            throw err;
        }
    },

    async deleteTransaction(workspaceId: string, txId: string) {
        try {
            const { error } = await supabase
                .from('transactions')
                .delete()
                .eq('id', txId)
                .eq('workspace_id', workspaceId);
            if (error) throw error;
            await this.touchWorkspace(workspaceId);
        } catch (err) {
            console.error("Supabase deleteTransaction error:", err);
            throw err;
        }
    },

    async deleteTransactions(workspaceId: string, txIds: string[]) {
        try {
            if (!txIds || txIds.length === 0) return;
            const { error } = await supabase
                .from('transactions')
                .delete()
                .in('id', txIds)
                .eq('workspace_id', workspaceId);
            if (error) throw error;
            await this.touchWorkspace(workspaceId);
        } catch (err) {
            console.error("Supabase deleteTransactions error:", err);
            throw err;
        }
    },

    async updateAccounts(workspaceId: string, accounts: Account[]) {
        try {
            const rows = accounts.map(acc => ({
                id: acc.id,
                workspace_id: workspaceId,
                name: acc.name,
                type: acc.type,
                balance: acc.balance,
                limit_val: acc.limit || 0
            }));
            const { error } = await supabase.from('accounts').upsert(rows);
            if (error) throw error;
            await this.touchWorkspace(workspaceId);
        } catch (err) {
            console.error("Supabase updateAccounts error:", err);
            throw err;
        }
    },

    async updateCategories(workspaceId: string, categories: ExpenseCategory[]) {
        try {
            const rows = categories.map(cat => ({
                id: cat.id,
                workspace_id: workspaceId,
                label: cat.label,
                icon: cat.icon || null
            }));
            const { error } = await supabase.from('categories').upsert(rows);
            if (error) throw error;
            await this.touchWorkspace(workspaceId);
        } catch (err) {
            console.error("Supabase updateCategories error:", err);
            throw err;
        }
    },

    async updateSuppliers(workspaceId: string, suppliers: Supplier[]) {
        try {
            const rows = suppliers.map(sup => ({
                id: sup.id,
                workspace_id: workspaceId,
                name: sup.name
            }));
            const { error } = await supabase.from('suppliers').upsert(rows);
            if (error) throw error;
            await this.touchWorkspace(workspaceId);
        } catch (err) {
            console.error("Supabase updateSuppliers error:", err);
            throw err;
        }
    },

    async updateProfitPercent(workspaceId: string, profitPercent: number) {
        try {
            const { error } = await supabase
                .from('workspaces')
                .update({
                    profit_percent: profitPercent,
                    last_synced: Date.now()
                })
                .eq('id', workspaceId);
            if (error) {
                // If update had issue (e.g. workspace row doesn't exist yet), upsert
                await supabase
                    .from('workspaces')
                    .upsert({
                        id: workspaceId,
                        profit_percent: profitPercent,
                        last_synced: Date.now()
                    });
            }
        } catch (err) {
            console.error("Supabase updateProfitPercent error:", err);
            throw err;
        }
    }
};
