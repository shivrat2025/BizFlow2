-- BizFlow Supabase Schema
-- Run this in Supabase Dashboard -> SQL Editor -> Click 'Run'

-- 1. Workspaces
CREATE TABLE IF NOT EXISTS public.workspaces (
    id VARCHAR(255) PRIMARY KEY,
    profit_percent NUMERIC DEFAULT 5,
    cloud_url TEXT,
    last_synced BIGINT,
    created_at BIGINT
);

-- 2. Accounts
CREATE TABLE IF NOT EXISTS public.accounts (
    id VARCHAR(255) PRIMARY KEY,
    workspace_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    balance NUMERIC DEFAULT 0,
    limit_val NUMERIC DEFAULT 0,
    initial_balance NUMERIC DEFAULT 0
);

-- 3. Categories
CREATE TABLE IF NOT EXISTS public.categories (
    id VARCHAR(255) PRIMARY KEY,
    workspace_id VARCHAR(255) NOT NULL,
    label VARCHAR(255) NOT NULL,
    icon VARCHAR(255)
);

-- 4. Suppliers
CREATE TABLE IF NOT EXISTS public.suppliers (
    id VARCHAR(255) PRIMARY KEY,
    workspace_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL
);

-- 5. Transactions
CREATE TABLE IF NOT EXISTS public.transactions (
    id VARCHAR(255) PRIMARY KEY,
    workspace_id VARCHAR(255) NOT NULL,
    date BIGINT NOT NULL,
    amount NUMERIC NOT NULL,
    type VARCHAR(50) NOT NULL,
    description TEXT,
    source_account_id VARCHAR(255),
    destination_account_id VARCHAR(255),
    income_source VARCHAR(50),
    expense_category VARCHAR(255),
    supplier_id VARCHAR(255),
    is_profit_withdrawal BOOLEAN DEFAULT FALSE,
    tags TEXT[],
    notes TEXT,
    invoice_url TEXT,
    payment_proof_url TEXT,
    created_at BIGINT
);

-- 6. Backups
CREATE TABLE IF NOT EXISTS public.backups (
    id VARCHAR(255) PRIMARY KEY,
    workspace_id VARCHAR(255) NOT NULL,
    snapshot_date BIGINT NOT NULL,
    label VARCHAR(255),
    is_manual BOOLEAN DEFAULT FALSE,
    data JSONB
);

-- Disable Row Level Security (RLS) for seamless client operations
ALTER TABLE public.workspaces DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.backups DISABLE ROW LEVEL SECURITY;

-- Indexes for lightning fast queries
CREATE INDEX IF NOT EXISTS idx_accounts_workspace ON public.accounts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_categories_workspace ON public.categories(workspace_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_workspace ON public.suppliers(workspace_id);
CREATE INDEX IF NOT EXISTS idx_transactions_workspace ON public.transactions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_backups_workspace ON public.backups(workspace_id);
