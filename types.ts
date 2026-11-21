export const APP_VERSION = "2.2.22";
export const APP_RELEASE_NOTES = {
  version: "v2.2.22",
  title: "Pools follow bank balances; negative Available Profit",
  date: "21 Nov 2026",
  highlights: [
    "🏦 COD pool = IDFC balance and Prepaid pool = IndusInd balance (bank-wise again), so pools match the bank statements and no longer go negative from tag mismatches",
    "💰 Available Profit now shows the real figure, in red with a minus sign, when withdrawals exceed the profit limit (was clamped to 0)",
    "🏦 IDFC FIRST Bank card now comes first in Bank-wise Balance and Total Bank Balance",
    "🏷️ COD and Prepaid pools are now calculated only from each entry's tag, independent of which bank it is in; bank balances still match the statements",
    "🚚 Courier (Shipping) card added next to Sales, Ad Spend and Purchase",
    "📊 Sales / Ad Spend / Purchase now default to All time (was showing 0 for the empty current month); Last Month filter added",
    "💼 ICICI OD: parked own money shown as Parked / Usable / Used (debt) and as a separate line under Total Bank Balance",
    "📊 Dashboard: bank-wise balance cards and Sales / Ad Spend / Purchase with Today / 7 Days / Month / All filter",
    "🎨 New calm theme: warm cream background, terracotta accent, soft sage/brick for income/expense",
    "🏷️ COD / Prepaid pools are per-entry tags, not linked to a bank account; bank balances match the statement",
    "🔖 Version and build id now shown on the Dashboard so you can confirm a push went live"
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