# BizFlow Ledger - Version History & Updates

All notable updates, feature releases, and database changes to BizFlow Ledger Pro are documented in this file.

## [v2.2.0] - 2026-09-17

### 🗑️ Bulk Selection & Multi-Delete
- **Table Checkboxes**: Added checkboxes to select individual transaction rows or select all visible transactions.
- **Bulk Action Bar**: Floating/Header bar displays selected count with a 1-click **"Bulk Delete (X)"** action.
- **Batch Removal**: Deletes selected entries in batch across Supabase PostgreSQL and cloud database.

---

## [v2.1.0] - 2026-09-17

### 🚀 Major Database Upgrade
- **Migrated to Supabase PostgreSQL Engine**: Successfully shifted database from Neon to Supabase (`cooszfjabepkoymaiivc.supabase.co`).
- **Data Migration**: Migrated 1,385 transactions, 5 accounts, 38 categories, and 47 suppliers cleanly into Supabase.
- **Quota Failure Protection**: Fixed HTTP 402 data transfer limit errors previously occurring on Neon.

### 🛠️ Bug Fixes & Calculations
- **Self-Transfer Balance Fix**:
  - Resolved bug in [`App.tsx`](file:///Users/shivangkoshia/Documents/Apps/BizFlow2-main/App.tsx) where internal `TRANSFER` transactions only debited the source account and failed to credit the target/destination account.
  - Accounts receiving funds (like IDFC First Bank) now properly receive incoming credits and balance calculations accurately reflect positive balances instead of falling into Overdraft/Debt.

### ✨ UI & User Experience
- **Dashboard Version Badge**: Added version indicator `v2.1.0` directly to the Dashboard header.
- **Update Notification Toast**: Added automatic pop-up notification when new version releases arrive.
- **Release Notes Modal**: Users can click the version badge anytime to view what's new in the latest release.

---

## [v2.0.0] - 2026-02-13
- **Enterprise Ledger Re-architect**: Added multi-account support (IDFC, IndusInd, Credit Cards, ODs).
- **AI Rule Assistant & MCP Server Integration**.
- **Backup & Cloud Sync Manager**.
