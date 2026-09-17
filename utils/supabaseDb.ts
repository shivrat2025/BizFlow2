import { createClient } from '@supabase/supabase-js';
import { Account, Transaction, ExpenseCategory, Supplier } from '../types';

export const SUPABASE_URL = "https://cooszfjabepkoymaiivc.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_EFnYBpyGmAx3MuQ6xdDaQg_iqdSXdhO";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const supabaseDb = {
    async getWorkspaceData(workspaceId: string) {
        try {
            const [wsRes, accRes, catRes, supRes, txRes] = await Promise.all([
                supabase.from('workspaces').select('*').eq('id', workspaceId).maybeSingle(),
                supabase.from('accounts').select('*').eq('workspace_id', workspaceId),
                supabase.from('categories').select('*').eq('workspace_id', workspaceId),
                supabase.from('suppliers').select('*').eq('workspace_id', workspaceId),
                supabase.from('transactions').select('*').eq('workspace_id', workspaceId).order('date', { ascending: false })
            ]);

            const workspace = wsRes.data || { id: workspaceId, profit_percent: 5, cloud_url: '', last_synced: Date.now() };

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

            const transactions: Transaction[] = (txRes.data || []).map((t: any) => ({
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
                invoiceUrl: t.invoice_url,
                paymentProofUrl: t.payment_proof_url,
                createdAt: Number(t.created_at || t.date)
            }));

            return {
                profitPercent: Number(workspace.profit_percent || 5),
                cloudUrl: workspace.cloud_url || '',
                lastSynced: Number(workspace.last_synced || Date.now()),
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

    async saveTransaction(workspaceId: string, tx: Transaction) {
        try {
            const row = {
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
                invoice_url: tx.invoiceUrl || null,
                payment_proof_url: tx.paymentProofUrl || null,
                created_at: tx.createdAt || tx.date
            };

            const { error } = await supabase.from('transactions').upsert(row);
            if (error) throw error;
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
        } catch (err) {
            console.error("Supabase updateSuppliers error:", err);
            throw err;
        }
    }
};
