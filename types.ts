export const APP_VERSION = "2.2.11";
export const APP_RELEASE_NOTES = {
  version: "v2.2.11",
  title: "Ultra-Low Egress Handshake, Real-Time Save Badges & Dashboard Profit Sync",
  date: "17 Sep 2026",
  highlights: [
    "⚡ Ultra-Low Egress Handshake: ~150-byte metadata check stops redundant 500 KB downloads — saving 99.9% bandwidth",
    "💾 Instant 0ms Startup: Local state initialized from cache with zero blank screens or polling delays",
    "🟢 Real-Time Save Badges: Floating toast notification confirms when entries are saved, updated, or restored to database",
    "📈 Instant Profit Target Sync: Setting profit rule immediately updates Supabase and Dashboard pulse threshold",
    "🖼️ Session Attachment Cache: Invoices & payment proofs cached locally to eliminate duplicate image egress"
  ]
};

export type TransactionType = 'INCOME' | 'EXPENSE' | 'WITHDRAWAL' | 'REPAYMENT' | 'TRANSFER';
export type IncomeSource = 'COD' | 'PREPAID';
export type AccountType = 'BANK' | 'CREDIT_CARD' | 'OD' | 'CURRENT';

export interface ExpenseCategory {
  id: string;
  label: string;
  icon?: string;
}

export interface AIRule {
  id: string;
  keyword: string;
  type: TransactionType;
  category?: string;
  incomeSource?: IncomeSource;
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  limit?: number;
  initialBalance?: number;
}

export interface Supplier {
  id: string;
  name: string;
}

export interface Transaction {
  id: string;
  date: number;
  amount: number;
  type: TransactionType;
  description: string;
  sourceAccountId?: string;      // The account money leaves
  destinationAccountId?: string; // The account money enters (for Repayments)
  incomeSource?: IncomeSource;
  expenseCategory?: string;
  supplierId?: string;           // For PRODUCT expenses
  isProfitWithdrawal?: boolean;
  tags?: string[];
  notes?: string;
  invoiceUrl?: string;
  paymentProofUrl?: string;
  hasInvoice?: boolean;
  hasPaymentProof?: boolean;
  createdAt?: number;
}

export interface DeletedTransaction extends Transaction {
  deletedAt: number;
}

export interface DashboardStats {
  codPool: number;
  prepaidPool: number;
  totalCodIncome: number;
  totalPrepaidIncome: number;
  totalExternalCap: number;
  totalExpenses: number;
  totalWithdrawals: number;
  totalRepayments: number;
  categoryBreakdown: Record<string, number>;
  sourceBreakdown: {
    cod: number;
    prepaid: number;
    accounts: number;
  };
}