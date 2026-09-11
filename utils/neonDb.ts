import { neon } from '@neondatabase/serverless';
import { Account, Transaction, ExpenseCategory, AIRule, Supplier } from '../types';

const NEON_URL = "postgresql://neondb_owner:npg_MQYpxwa17zRV@ep-jolly-grass-b3c2d7vr-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";

const sql = neon(NEON_URL);

export const neonDb = {
    async getWorkspaceData(workspaceId: string) {
        try {
            const wsRows = await sql`SELECT * FROM workspaces WHERE id = ${workspaceId};`;
            const accRows = await sql`SELECT * FROM accounts WHERE workspace_id = ${workspaceId};`;
            const catRows = await sql`SELECT * FROM categories WHERE workspace_id = ${workspaceId};`;
            const supRows = await sql`SELECT * FROM suppliers WHERE workspace_id = ${workspaceId};`;
            const txRows = await sql`SELECT * FROM transactions WHERE workspace_id = ${workspaceId} ORDER BY date DESC;`;

            const workspace = wsRows[0] || { id: workspaceId, profit_percent: 5, cloud_url: '', last_synced: Date.now() };

            const accounts: Account[] = accRows.map((a: any) => ({
                id: a.id,
                name: a.name,
                type: a.type,
                balance: Number(a.balance),
                limit: Number(a.limit_val || 0)
            }));

            const categories: ExpenseCategory[] = catRows.map((c: any) => ({
                id: c.id,
                label: c.label,
                icon: c.icon
            }));

            const suppliers: Supplier[] = supRows.map((s: any) => ({
                id: s.id,
                name: s.name
            }));

            const transactions: Transaction[] = txRows.map((t: any) => ({
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
            console.error("Neon getWorkspaceData error:", err);
            throw err;
        }
    },

    async saveTransaction(workspaceId: string, tx: Transaction) {
        try {
            await sql`
                INSERT INTO transactions (
                    id, workspace_id, date, amount, type, description,
                    source_account_id, destination_account_id, income_source,
                    expense_category, supplier_id, is_profit_withdrawal,
                    tags, notes, invoice_url, payment_proof_url, created_at
                ) VALUES (
                    ${tx.id}, ${workspaceId}, ${tx.date}, ${tx.amount}, ${tx.type}, ${tx.description || ''},
                    ${tx.sourceAccountId || null}, ${tx.destinationAccountId || null}, ${tx.incomeSource || null},
                    ${tx.expenseCategory || null}, ${tx.supplierId || null}, ${Boolean(tx.isProfitWithdrawal)},
                    ${tx.tags || []}, ${tx.notes || null},
                    ${tx.invoiceUrl || null}, ${tx.paymentProofUrl || null}, ${tx.createdAt || tx.date}
                ) ON CONFLICT (id) DO UPDATE SET
                    date = EXCLUDED.date, amount = EXCLUDED.amount, type = EXCLUDED.type,
                    description = EXCLUDED.description, source_account_id = EXCLUDED.source_account_id,
                    destination_account_id = EXCLUDED.destination_account_id, income_source = EXCLUDED.income_source,
                    expense_category = EXCLUDED.expense_category, supplier_id = EXCLUDED.supplier_id,
                    is_profit_withdrawal = EXCLUDED.is_profit_withdrawal, tags = EXCLUDED.tags,
                    notes = EXCLUDED.notes, invoice_url = EXCLUDED.invoice_url,
                    payment_proof_url = EXCLUDED.payment_proof_url, created_at = EXCLUDED.created_at;
            `;
        } catch (err) {
            console.error("Neon saveTransaction error:", err);
            throw err;
        }
    },

    async deleteTransaction(workspaceId: string, txId: string) {
        try {
            await sql`DELETE FROM transactions WHERE id = ${txId} AND workspace_id = ${workspaceId};`;
        } catch (err) {
            console.error("Neon deleteTransaction error:", err);
            throw err;
        }
    },

    async updateAccounts(workspaceId: string, accounts: Account[]) {
        try {
            for (const acc of accounts) {
                await sql`
                    INSERT INTO accounts (id, workspace_id, name, type, balance, limit_val)
                    VALUES (${acc.id}, ${workspaceId}, ${acc.name}, ${acc.type}, ${acc.balance}, ${acc.limit || 0})
                    ON CONFLICT (id) DO UPDATE SET
                        name = EXCLUDED.name, type = EXCLUDED.type, balance = EXCLUDED.balance, limit_val = EXCLUDED.limit_val;
                `;
            }
        } catch (err) {
            console.error("Neon updateAccounts error:", err);
            throw err;
        }
    },

    async updateCategories(workspaceId: string, categories: ExpenseCategory[]) {
        try {
            for (const cat of categories) {
                await sql`
                    INSERT INTO categories (id, workspace_id, label, icon)
                    VALUES (${cat.id}, ${workspaceId}, ${cat.label}, ${cat.icon || null})
                    ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label, icon = EXCLUDED.icon;
                `;
            }
        } catch (err) {
            console.error("Neon updateCategories error:", err);
            throw err;
        }
    },

    async updateSuppliers(workspaceId: string, suppliers: Supplier[]) {
        try {
            for (const sup of suppliers) {
                await sql`
                    INSERT INTO suppliers (id, workspace_id, name)
                    VALUES (${sup.id}, ${workspaceId}, ${sup.name})
                    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
                `;
            }
        } catch (err) {
            console.error("Neon updateSuppliers error:", err);
            throw err;
        }
    }
};
