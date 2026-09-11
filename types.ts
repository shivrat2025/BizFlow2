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
  createdAt?: number;
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