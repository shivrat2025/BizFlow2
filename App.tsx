import React, { useState, useEffect, useMemo } from 'react';
import { LayoutDashboard, History, Wallet, Cloud, Plus, RefreshCw, ChevronRight, BarChart3, FileText, Menu, Landmark, Lock, Shield, Zap, AlertCircle, Settings, Eye, EyeOff, Sparkles, X } from 'lucide-react';
import { initializeApp, getApp, getApps } from "firebase/app";
import { getFirestore, doc, onSnapshot, setDoc, deleteDoc, updateDoc, collection, writeBatch, getDoc, getDocs, query } from "firebase/firestore";
import { Account, Transaction, DashboardStats, ExpenseCategory, AIRule, APP_VERSION, APP_RELEASE_NOTES } from './types';
import Dashboard from './components/Dashboard';
import AccountManager from './components/AccountManager';
import HistoryList from './components/HistoryList';
import InvoicesList from './components/InvoicesList';
import CloudSync from './components/CloudSync';
import TransactionForm from './components/TransactionForm';
import BackupManager from './components/BackupManager';
import { supabaseDb } from './utils/supabaseDb';

const firebaseConfig = {
    apiKey: "AIzaSyDIyPAe5qGMrwj51KutR-4Xp99rQdH-Okk",
    authDomain: "bizflow-fb864.firebaseapp.com",
    projectId: "bizflow-fb864",
    storageBucket: "bizflow-fb864.firebasestorage.app",
    messagingSenderId: "112226518901",
    appId: "1:112226518901:web:d20278baf81ef2c1c9b53c"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

const deepClean = (obj: any): any => {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return obj.getTime();
    if (Array.isArray(obj)) return obj.map(deepClean);

    const cleaned: any = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const value = obj[key];
            if (value === undefined || typeof value === 'function') continue;
            cleaned[key] = deepClean(value);
        }
    }
    return cleaned;
};

const DEFAULT_CATEGORIES: ExpenseCategory[] = [
    { id: 'FB_ADS', label: 'FB Ads' },
    { id: 'SHIPPING', label: 'Shipping' },
    { id: 'PRODUCT', label: 'Product' },
    { id: 'OTHER', label: 'Other' }
];

const App: React.FC = () => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [workspaceId, setWorkspaceId] = useState(() => (localStorage.getItem('bizflow_workspace_id') || '').trim());
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [categories, setCategories] = useState<ExpenseCategory[]>(DEFAULT_CATEGORIES);
    const [aiRules, setAiRules] = useState<AIRule[]>([]);
    const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);
    const [cloudUrl, setCloudUrl] = useState('');
    const [lastSynced, setLastSynced] = useState<number | null>(null);
    const [legacyTransactions, setLegacyTransactions] = useState<Transaction[]>([]);
    const [realtimeTransactions, setRealtimeTransactions] = useState<Transaction[]>([]);

    const [showForm, setShowForm] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
    const [loadingSync, setLoadingSync] = useState(false);
    const [firebaseStatus, setFirebaseStatus] = useState<'IDLE' | 'CONNECTED' | 'SYNCING' | 'ERROR'>('IDLE');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // Mobile Menu State
    const [isAuthenticated, setIsAuthenticated] = useState(() => sessionStorage.getItem('bizflow_auth') === 'true');
    const [usernameInput, setUsernameInput] = useState(() => (localStorage.getItem('bizflow_workspace_id') || '').trim());
    const [passwordInput, setPasswordInput] = useState('');
    const [loginError, setLoginError] = useState(false);
    const [deleteAccountState, setDeleteAccountState] = useState<{ id: string, name: string, blockedCount: number } | null>(null);
    const [snapshotDates, setSnapshotDates] = useState<Record<string, number | null>>({});
    const [availableBackups, setAvailableBackups] = useState<{ id: string, date: number, label: string }[]>([]);
    const [profitPercent, setProfitPercent] = useState<number>(() => {
        const saved = localStorage.getItem('bizflow_profit_pct');
        return saved ? parseFloat(saved) : 5;
    });
    const [privacyMode, setPrivacyMode] = useState(false);
    const [showUpdateNotice, setShowUpdateNotice] = useState(() => {
        return localStorage.getItem('bizflow_last_seen_ver') !== APP_VERSION;
    });
    const [showChangelogModal, setShowChangelogModal] = useState(false);

    const handleDismissNotice = () => {
        localStorage.setItem('bizflow_last_seen_ver', APP_VERSION);
        setShowUpdateNotice(false);
    };

    const handleGoogleLogin = (emailStr = 'shivrat2025@gmail.com') => {
        const cleanUsername = 'SHIVRAT';
        setWorkspaceId(cleanUsername);
        setIsAuthenticated(true);
        sessionStorage.setItem('bizflow_auth', 'true');
        sessionStorage.setItem('bizflow_user_email', emailStr);
        localStorage.setItem('bizflow_workspace_id', cleanUsername);
        setLoginError(false);
    };

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        const cleanUsername = usernameInput.trim().toUpperCase();
        if ((passwordInput === 'Kimi@123' || passwordInput === 'KIMI@123') && cleanUsername) {
            setWorkspaceId(cleanUsername);
            setIsAuthenticated(true);
            sessionStorage.setItem('bizflow_auth', 'true');
            localStorage.setItem('bizflow_workspace_id', cleanUsername);
            setLoginError(false);
        } else {
            setLoginError(true);
        }
    };

    useEffect(() => {
        if (!workspaceId) return;
        setFirebaseStatus('SYNCING');

        // Load data directly from Supabase PostgreSQL
        const loadSupabaseData = async () => {
            try {
                const data = await supabaseDb.getWorkspaceData(workspaceId);
                if (data.accounts?.length) setAccounts(data.accounts);
                if (data.categories?.length) setCategories(data.categories);
                if (data.suppliers?.length) setSuppliers(data.suppliers);
                if (data.transactions) setRealtimeTransactions(data.transactions);
                if (data.profitPercent !== undefined) setProfitPercent(data.profitPercent);
                setFirebaseStatus('CONNECTED');
            } catch (err) {
                console.error("Supabase Load Error:", err);
            }
        };

        loadSupabaseData();
        const interval = setInterval(loadSupabaseData, 5000); // Polling Supabase every 5s for multi-device sync

        // 1. Listen to Workspace Metadata (Accounts, Categories, Rules)
        const unsubMeta = onSnapshot(doc(db, "workspaces", workspaceId), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.accounts) setAccounts(data.accounts);
                if (data.categories) setCategories(data.categories);
                if (data.aiRules) setAiRules(data.aiRules);
                if (data.suppliers) setSuppliers(data.suppliers);
                if (data.cloudUrl !== undefined) setCloudUrl(data.cloudUrl);
                if (data.lastSynced !== undefined) setLastSynced(data.lastSynced);
                if (data.transactions) setLegacyTransactions(data.transactions);
                if (data.profitPercent !== undefined) {
                    setProfitPercent(data.profitPercent);
                    localStorage.setItem('bizflow_profit_pct', String(data.profitPercent));
                }
            }
        }, (err) => {
            console.error("Meta Sync Error:", err);
        });

        // 2. Listen to Transactions Sub-collection
        const unsubTxs = onSnapshot(collection(db, "workspaces", workspaceId, "transactions"), (querySnap) => {
            const txs: Transaction[] = [];
            querySnap.forEach((doc) => {
                txs.push({ ...doc.data(), id: doc.id } as Transaction);
            });
            if (txs.length > 0) setRealtimeTransactions(txs);
            setFirebaseStatus('CONNECTED');
        }, (err) => {
            console.error("Transaction Sync Error:", err);
        });

        return () => {
            clearInterval(interval);
            unsubMeta();
            unsubTxs();
        };
    }, [workspaceId]);

    useEffect(() => {
        const combined = [...legacyTransactions, ...realtimeTransactions];
        // Deduplicate by ID
        const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());
        unique.sort((a, b) => b.date - a.date);
        setTransactions(unique);
    }, [legacyTransactions, realtimeTransactions]);

    useEffect(() => {
        if (workspaceId) localStorage.setItem('bizflow_workspace_id', workspaceId.trim());

        // Fetch historical backups + run 12-hour auto-backup logic
        const fetchBackups = async () => {
            if (!workspaceId) return;
            const backupsRef = collection(db, "backups");
            const snap = await getDocs(backupsRef);
            const history: any[] = [];

            snap.forEach(d => {
                if (d.id.startsWith(`${workspaceId}_BACKUP_`)) {
                    const data = d.data();
                    const ts = data.snapshotDate;
                    history.push({
                        id: d.id,
                        date: ts,
                        isManual: !!data.isManual,
                        label: new Date(ts).toLocaleString('en-IN', {
                            day: '2-digit', month: 'short', year: 'numeric',
                            hour: '2-digit', minute: '2-digit', hour12: true
                        })
                    });
                }
            });

            setSnapshotDates({});
            const sortedHistory = history.sort((a, b) => b.date - a.date);
            setAvailableBackups(sortedHistory.slice(0, 12));

            // 12-hour auto-backup: slot = date + AM/PM (00 or 12)
            const now = new Date();
            const slotHour = now.getHours() < 12 ? '00' : '12';
            const slotKey = `${now.toISOString().split('T')[0]}_${slotHour}`;
            const autoId = `${workspaceId}_BACKUP_AUTO_${slotKey}`;
            const slotExists = history.some(h => h.id === autoId);

            if (!slotExists && accounts.length > 0) {
                console.log("Creating 12h auto-backup for slot:", slotKey);
                // Await so the prune inside handleCreateSnapshot runs correctly
                await handleCreateSnapshot(slotKey, true);
            }
        };
        fetchBackups();

        // Re-check every 30 minutes so 12h backup triggers automatically while app is open
        const autoInterval = setInterval(fetchBackups, 30 * 60 * 1000);
        return () => clearInterval(autoInterval);
    }, [workspaceId, accounts.length > 0]);

    const calculateStats = (accs: Account[], txs: Transaction[]): DashboardStats => {
        const currentCodAcc = accs.find(a => a.name.toUpperCase().includes('IDFC'));
        const currentPrepaidAcc = accs.find(a => a.name.toUpperCase().includes('INDUSIND'));

        const s: DashboardStats = {
            codPool: currentCodAcc ? (currentCodAcc.balance || 0) : 0,
            prepaidPool: currentPrepaidAcc ? (currentPrepaidAcc.balance || 0) : 0,
            totalCodIncome: 0,
            totalPrepaidIncome: 0,
            totalExternalCap: 0,
            totalExpenses: 0,
            totalWithdrawals: 0,
            totalRepayments: 0,
            categoryBreakdown: {},
            sourceBreakdown: { cod: 0, prepaid: 0, accounts: 0 }
        };

        txs.forEach(t => {
            if (t.type === 'INCOME') {
                if (t.incomeSource === 'COD') {
                    s.totalCodIncome += t.amount;
                } else if (t.incomeSource === 'PREPAID') {
                    s.totalPrepaidIncome += t.amount;
                }
            } else if (t.type === 'EXPENSE') {
                s.totalExpenses += t.amount;
                if (t.expenseCategory) {
                    s.categoryBreakdown[t.expenseCategory] = (s.categoryBreakdown[t.expenseCategory] || 0) + t.amount;
                }
                if (t.incomeSource === 'COD') {
                    s.sourceBreakdown.cod += t.amount;
                } else if (t.incomeSource === 'PREPAID') {
                    s.sourceBreakdown.prepaid += t.amount;
                } else {
                    s.sourceBreakdown.accounts += t.amount;
                }
            } else if (t.type === 'WITHDRAWAL') {
                s.totalWithdrawals += t.amount;
            } else if (t.type === 'REPAYMENT') {
                s.totalRepayments += t.amount;
            }
        });

        accs.forEach(a => {
            if (a.type === 'OD' || a.type === 'CREDIT_CARD') {
                const debt = Math.max(0, (a.limit || 0) - a.balance);
                s.totalExternalCap += debt;
            } else if (a.balance < 0) {
                // If a savings/current account goes negative, it's effectively an OD debt
                s.totalExternalCap += Math.abs(a.balance);
            }
        });

        return s;
    };

    const computedAccounts = useMemo(() => {
        return accounts.map(acc => {
            // For bank accounts, limit acts as the Opening Balance
            let balance = acc.limit || 0;
            transactions.forEach(t => {
                if (t.type === 'REPAYMENT' || t.type === 'TRANSFER') {
                    if (t.sourceAccountId === acc.id) balance -= t.amount;
                    if (t.destinationAccountId === acc.id) balance += t.amount;
                } else {
                    if (t.sourceAccountId === acc.id) {
                        const change = t.type === 'INCOME' ? t.amount : -t.amount;
                        balance += change;
                    }
                }
            });
            return { ...acc, balance };
        });
    }, [accounts, transactions]);

    const currentStats = useMemo(() => calculateStats(computedAccounts, transactions), [computedAccounts, transactions]);

    const persistAndSync = async (newAccs?: Account[], newCats?: ExpenseCategory[], newRules?: AIRule[], newSups?: { id: string; name: string }[], newUrl?: string) => {
        if (!workspaceId) return;

        try {
            if (newAccs) supabaseDb.updateAccounts(workspaceId, newAccs).catch(console.error);
            if (newCats) supabaseDb.updateCategories(workspaceId, newCats).catch(console.error);
            if (newSups) supabaseDb.updateSuppliers(workspaceId, newSups).catch(console.error);

            const payload: any = {
                lastSynced: Date.now()
            };

            if (newAccs !== undefined) payload.accounts = newAccs;
            if (newCats !== undefined) payload.categories = newCats;
            if (newRules !== undefined) payload.aiRules = newRules;
            if (newSups !== undefined) payload.suppliers = newSups;
            if (newUrl !== undefined) payload.cloudUrl = newUrl;

            const payloadBytes = JSON.stringify(payload).length;
            if (payloadBytes > 900000) {
                alert("Cloud metadata limit reached (1MB). Please reduce data.");
                return;
            }

            const docRef = doc(db, "workspaces", workspaceId);
            await updateDoc(docRef, deepClean(payload));
        } catch (e: any) {
            console.error("Sync Error:", e);
            if (e.code === 'permission-denied') {
                alert("Cloud Permission Denied: Please update your Firebase Rules.");
            }
        }
    };

    const handleSaveSupplier = async (name: string) => {
        const newSup = { id: crypto.randomUUID(), name };
        const newSups = [...suppliers, newSup];
        setSuppliers(newSups);
        await persistAndSync(undefined, undefined, undefined, newSups);
        return newSup;
    };
    const handleLogout = () => {
        if (!confirm("Are you sure you want to log out?")) return;
        sessionStorage.removeItem('bizflow_auth');
        localStorage.removeItem('bizflow_workspace_id');
        window.location.reload();
    };

    const handleDeleteWorkspace = async () => {
        if (!workspaceId) return;
        try {
            setFirebaseStatus('SYNCING');
            await deleteDoc(doc(db, "workspaces", workspaceId));
            localStorage.removeItem('bizflow_workspace_id');
            window.location.reload();
        } catch (e) {
            console.error("Delete Error:", e);
            alert("Failed to delete workspace. Please try again.");
        }
    };

    const handleAddAccount = (acc: Omit<Account, 'id' | 'balance'>) => {
        const newAccount: Account = {
            ...acc,
            id: crypto.randomUUID(),
            balance: ['BANK', 'CURRENT', 'OD', 'CREDIT_CARD'].includes(acc.type) ? (acc.limit || 0) : 0
        };
        const updated = [...accounts, newAccount];
        setAccounts(updated);
        persistAndSync(updated);
        return newAccount;
    };

    const handleUpdateAccount = (id: string, updates: Partial<Account>) => {
        const updated = accounts.map(a => a.id === id ? {
            ...a,
            ...updates,
            // Update balance if limit is adjusted
            balance: (updates.limit !== undefined) ? updates.limit : a.balance
        } : a);
        setAccounts(updated);
        persistAndSync(updated);
    };

    const handleUpdateTransaction = async (id: string, updates: Partial<Transaction>) => {
        try {
            const docRef = doc(db, "workspaces", workspaceId, "transactions", id);
            await updateDoc(docRef, deepClean(updates));
        } catch (e) {
            console.error("Update Tx Error:", e);
        }
    };

    const handleDeleteAccount = (id: string) => {
        const acc = accounts.find(a => a.id === id);
        if (!acc) return;

        // Check if any transactions are linked to this account
        const linkedTxs = transactions.filter(t => t.sourceAccountId === id || t.destinationAccountId === id);
        setDeleteAccountState({ id, name: acc.name, blockedCount: linkedTxs.length });
    };

    const confirmDeleteAccount = () => {
        if (!deleteAccountState) return;
        const updatedAcc = accounts.filter(a => a.id !== deleteAccountState.id);
        setAccounts(updatedAcc);
        persistAndSync(updatedAcc);
        setDeleteAccountState(null);
    };

    const handleAddTransaction = async (data: Partial<Transaction>) => {
        try {
            const txId = editingTransaction?.id || crypto.randomUUID();
            const trimmedWorkspace = workspaceId.trim();
            const newTx: Transaction = {
                id: txId,
                date: data.date || Date.now(),
                amount: data.amount || 0,
                type: data.type || 'EXPENSE',
                description: data.description || '',
                sourceAccountId: data.sourceAccountId,
                destinationAccountId: data.destinationAccountId,
                incomeSource: data.incomeSource,
                expenseCategory: data.expenseCategory,
                supplierId: data.supplierId,
                isProfitWithdrawal: data.isProfitWithdrawal,
                tags: data.tags,
                notes: data.notes,
                invoiceUrl: data.invoiceUrl,
                paymentProofUrl: data.paymentProofUrl,
                createdAt: editingTransaction?.createdAt || Date.now()
            };

            // Save to Supabase PostgreSQL
            await supabaseDb.saveTransaction(trimmedWorkspace, newTx);

            // Also save to Firebase doc for fallback
            const docRef = doc(db, "workspaces", trimmedWorkspace, "transactions", txId);
            await setDoc(docRef, deepClean(newTx));
            console.log("Transaction saved successfully to Supabase & Cloud:", txId);

            setShowForm(false);
            setEditingTransaction(null);
        } catch (e) {
            console.error("Add Tx Error:", e);
            alert("Failed to save transaction. Check console for details.");
        }
    };

    const handleBulkAddTransactions = async (newTxs: Transaction[]) => {
        try {
            const batch = writeBatch(db);
            newTxs.forEach(tx => {
                const docRef = doc(db, "workspaces", workspaceId, "transactions", tx.id || crypto.randomUUID());
                const finalTx = { ...tx, createdAt: tx.createdAt || Date.now() };
                batch.set(docRef, deepClean(finalTx));
            });
            await batch.commit();
        } catch (e) {
            console.error("Bulk Add Error:", e);
        }
    };

    const handleSaveAIRule = (rule: Omit<AIRule, 'id'>) => {
        const newRule: AIRule = { ...rule, id: crypto.randomUUID() };
        const updatedRules = [...aiRules, newRule];
        setAiRules(updatedRules);
        persistAndSync(undefined, undefined, updatedRules);
    };

    const handleDeleteAIRule = (id: string) => {
        const updatedRules = aiRules.filter(r => r.id !== id);
        setAiRules(updatedRules);
        persistAndSync(undefined, undefined, updatedRules);
    };

    const handleAddCategory = (label: string) => {
        const newCat: ExpenseCategory = { id: label.toUpperCase().replace(/\s+/g, '_'), label };
        if (categories.some(c => c.id === newCat.id)) return;
        const updated = [...categories, newCat];
        setCategories(updated);
        persistAndSync(undefined, updated);
    };
    const handleExport = async () => {
        try {
            setLoadingSync(true);
            const docRef = doc(db, "workspaces", workspaceId);
            const docSnap = await getDoc(docRef);
            const meta = docSnap.data();

            const txsRef = collection(db, "workspaces", workspaceId, "transactions");
            const txsSnap = await getDocs(txsRef);
            const txs = txsSnap.docs.map(d => d.data());

            const fullBackup = {
                metadata: meta,
                transactions: txs,
                exportDate: new Date().toISOString(),
                workspaceId
            };

            const blob = new Blob([JSON.stringify(fullBackup, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `bizflow_backup_${workspaceId}_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            alert("Backup Downloaded Successfully!");
        } catch (e) {
            console.error("Export Error:", e);
            alert("Failed to export data.");
        } finally {
            setLoadingSync(false);
        }
    };

    const handleCreateSnapshot = async (label: string = 'Protection Point', isAuto = false) => {
        if (!workspaceId) return;
        try {
            if (!isAuto) setLoadingSync(true);
            const now = new Date();
            const dateStr = now.toISOString().split('T')[0];
            const timeStr = now.getHours().toString().padStart(2, '0') + '-' + now.getMinutes().toString().padStart(2, '0');
            // Always use AUTO prefix so Firestore rules allow it; isManual is stored in the data
            const snapshotId = isAuto
                ? `${workspaceId}_BACKUP_AUTO_${label}`
                : `${workspaceId}_BACKUP_AUTO_${dateStr}_${timeStr}_M`;

            // 1. Get Metadata
            const docRef = doc(db, "workspaces", workspaceId);
            const docSnap = await getDoc(docRef);
            const meta = docSnap.data();

            if (!meta) return;

            const snapshotLabel = isAuto
                ? `Auto · ${now.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })}`
                : `Manual · ${now.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })}`;

            // 2. Save Backup Metadata
            const backupRef = doc(db, "backups", snapshotId);
            await setDoc(backupRef, {
                ...meta,
                snapshotDate: Date.now(),
                label: snapshotLabel,
                isManual: !isAuto,
                originalWorkspace: workspaceId
            });

            // 3. Save Backup Transactions (Chunked batching)
            const txsRef = collection(db, "workspaces", workspaceId, "transactions");
            const txsSnap = await getDocs(txsRef);
            const backupTxsRef = collection(db, "backups", snapshotId, "transactions");

            const allTxs = txsSnap.docs.map(d => ({ id: d.id, data: d.data() }));
            for (let i = 0; i < allTxs.length; i += 500) {
                const chunk = allTxs.slice(i, i + 500);
                const batch = writeBatch(db);
                chunk.forEach(tx => {
                    const bTxRef = doc(backupTxsRef, tx.id);
                    batch.set(bTxRef, tx.data);
                });
                await batch.commit();
            }

            // 4. Refresh backup list and prune to 12
            const backupsRef = collection(db, "backups");
            const snap = await getDocs(backupsRef);
            const history: any[] = [];
            snap.forEach(d => {
                if (d.id.startsWith(`${workspaceId}_BACKUP_`)) {
                    const data = d.data();
                    history.push({
                        id: d.id,
                        date: data.snapshotDate,
                        isManual: !!data.isManual,
                        label: data.label || new Date(data.snapshotDate).toLocaleString('en-IN', {
                            day: '2-digit', month: 'short', year: 'numeric',
                            hour: '2-digit', minute: '2-digit', hour12: true
                        })
                    });
                }
            });

            const sortedHistory = history.sort((a, b) => b.date - a.date);

            // Prune beyond 12
            if (sortedHistory.length > 12) {
                const backupsToDelete = sortedHistory.slice(12);
                for (const oldBackup of backupsToDelete) {
                    try {
                        const oldTxsRef = collection(db, "backups", oldBackup.id, "transactions");
                        const oldTxsSnap = await getDocs(oldTxsRef);
                        const delBatch = writeBatch(db);
                        oldTxsSnap.forEach(d => delBatch.delete(doc(oldTxsRef, d.id)));
                        delBatch.delete(doc(db, "backups", oldBackup.id));
                        await delBatch.commit();
                    } catch (err) {
                        console.error("Cleanup error:", err);
                    }
                }
            }

            setAvailableBackups(sortedHistory.slice(0, 12));

            if (!isAuto) alert("✅ Backup Saved Successfully!");
        } catch (e) {
            console.error("Snapshot Error:", e);
            if (!isAuto) alert("Failed to create backup");
        } finally {
            if (!isAuto) setLoadingSync(false);
        }
    };

    const handleRestoreFromSnapshot = async (id: string) => {
        // Find the backup object to get the timestamp-based date
        const backupObj = availableBackups.find(b => b.id === id);
        const label = backupObj ? backupObj.label : "Selected Date";

        if (!confirm(`WARNING: This will overwrite your current database with backup from ${label}. Are you sure?`)) return;
        try {
            setLoadingSync(true);
            const backupId = id; // The ID is now full ID from availableBackups
            const backupRef = doc(db, "backups", backupId);
            const backupSnap = await getDoc(backupRef);

            if (!backupSnap.exists()) {
                alert(`No snapshot found for ${label}.`);
                return;
            }

            const data = backupSnap.data();
            const { snapshotDate, snapshotSlot, originalWorkspace, ...meta } = data;

            // 1. Wipe current transactions
            const txsRef = collection(db, "workspaces", workspaceId, "transactions");
            const txsSnap = await getDocs(txsRef);
            const wipeBatch = writeBatch(db);
            txsSnap.forEach(d => wipeBatch.delete(doc(txsRef, d.id)));
            await wipeBatch.commit();

            // 2. Restore Metadata (Safely Merge to prevent losing newly added accounts/categories)
            const currentDocRef = doc(db, "workspaces", workspaceId);
            const currentDocSnap = await getDoc(currentDocRef);
            let mergedMeta = { ...meta };

            if (currentDocSnap.exists()) {
                const currentData = currentDocSnap.data();
                const mergeArrays = (oldArr: any[] = [], currentArr: any[] = []) => {
                    const map = new Map();
                    // Put old (backup) items first
                    oldArr.forEach(item => { if (item && item.id) map.set(item.id, item) });
                    // Only add current items if they didn't exist in the backup at all
                    currentArr.forEach(item => {
                        if (item && item.id && !map.has(item.id)) map.set(item.id, item);
                    });
                    return Array.from(map.values());
                };
                mergedMeta.accounts = mergeArrays(meta.accounts, currentData.accounts);
                mergedMeta.categories = mergeArrays(meta.categories, currentData.categories);
                mergedMeta.suppliers = mergeArrays(meta.suppliers, currentData.suppliers);
                mergedMeta.aiRules = mergeArrays(meta.aiRules, currentData.aiRules);
            }

            await setDoc(doc(db, "workspaces", workspaceId), mergedMeta);

            // 3. Restore Transactions
            const backupTxsRef = collection(db, "backups", backupId, "transactions");
            const bTxsSnap = await getDocs(backupTxsRef);

            const restoreBatch = writeBatch(db);
            bTxsSnap.forEach(tDoc => {
                const txRef = doc(db, "workspaces", workspaceId, "transactions", tDoc.id);
                restoreBatch.set(txRef, tDoc.data());
            });

            await restoreBatch.commit();
            alert(`Database Restored to ${label}! App will refresh now.`);
            window.location.reload();
        } catch (e) {
            console.error("Restore Error:", e);
            alert("Failed to restore from snapshot.");
        } finally {
            setLoadingSync(false);
        }
    };


    const handleRestoreFromLocalDump = async () => {
        try {
            setLoadingSync(true);
            const dump = {
                accounts: [
                    { id: "dccbcc41-7dac-4dd4-8396-07c48b0e7719", name: "IDFC Bank", type: "BANK", balance: 0 },
                    { id: "5abb6e32-bd50-4522-8950-8d75fecf6a14", name: "IndusInd Bank", type: "BANK", balance: 0 },
                    { id: "b83bb345-551b-4e55-b7e0-457b220c9513", name: "Credit Card", type: "CREDIT_CARD", balance: 80000, limit: 80000 },
                    { id: "d41cda10-b31e-4094-84bb-d6143ff41ee1", name: "ICICI MANISHA OD", type: "BANK", balance: 0 }
                ],
                categories: [
                    { id: "FB_ADS", label: "FB Ads" },
                    { id: "SHIPPING", label: "Shipping" },
                    { id: "PRODUCT", label: "Product" },
                    { id: "OTHER", label: "Other" },
                    { id: "OFFICE_SALARY", label: "Office Salary" },
                    { id: "SHOPIFY", label: "Shopify" },
                    { id: "FOLLOWERS", label: "followers" },
                    { id: "PORTER", label: "porter" }
                ],
                suppliers: [
                    { id: "d8942ba1-15cb-49b6-8a3f-65bcdd9016de", name: "Zoya" },
                    { id: "5507bb9d-a06b-4e5f-9ccd-d48cd54cac71", name: "GST BILL" },
                    { id: "8a188f9b-b115-4125-8f0c-a485f9e2f222", name: "Heera Creation" },
                    { id: "54b79325-c25e-4924-a8c1-8ccabe21a29c", name: "Gopinath" },
                    { id: "5e7a4875-c8fc-4473-a09f-3fc4f3d29d67", name: "HV " },
                    { id: "00bf6e07-8909-42e4-b740-3f45334027c4", name: "RTC" },
                    { id: "27edece4-c72b-446f-95ce-c365948386c5", name: "Maruti Designer" },
                    { id: "09ba1878-d171-442a-9727-dd498bd13a13", name: "Shree Hari Fashion" },
                    { id: "1f6c9fd2-a71c-4329-a274-447a1a89b380", name: "Swank" },
                    { id: "35d6c924-4016-4b7b-ae14-11e383e31b6e", name: "Sai Creation" },
                    { id: "1afa061c-bd04-4436-a9c1-b816d3ec1bac", name: "Women Wastra" },
                    { id: "df17c1c8-69d1-4dc4-8063-ffd8084ad4e3", name: "Brand of Brothers" },
                    { id: "a4726ba6-f15e-4ffe-a310-59873bee8c87", name: "KK Creation" },
                    { id: "af2661ad-091d-49c3-a791-234fd137ef01", name: "LadyLook" },
                    { id: "1dc40c20-e017-4c93-b902-5a97ab581449", name: "JK Creation" },
                    { id: "68e2a2f3-388d-46c0-b2c8-50f6393449b8", name: "Bhanderi Enterprise" },
                    { id: "7b9aabef-39b2-45e1-87c0-ec5f9b4c8f79", name: "Hirva" },
                    { id: "248cc011-86aa-4095-8a30-4438f7943fc1", name: "Bewafa Designer" },
                    { id: "9c4e2087-3ced-463c-b1f0-425ea741406f", name: "RV CREATION" },
                    { id: "0cde16a3-2c3b-48e8-b02c-c8166c3be81e", name: "Aarohi Designer" },
                    { id: "468e5332-415d-454f-b452-cecc89ee20a2", name: "Mizeoo Trade" },
                    { id: "80b85aa8-bafc-4ebb-89a4-0135d6b9f0da", name: "Pal Fab" },
                    { id: "823fb4e5-affd-4a6e-84ca-e406f65ba9a6", name: "Thirteen D" },
                    { id: "a834eae9-d29c-4e09-9a9c-6d4d4630b1c5", name: "Stationary" },
                    { id: "f1f6330d-2bcf-4962-9646-92424c447d51", name: "Unknow" },
                    { id: "0a52a0d6-956f-43af-ae53-c299e6be4f8d", name: "ZSR" }
                ]
            };

            await persistAndSync(dump.accounts as any, dump.categories as any, undefined, dump.suppliers);
            alert("Rescue Successful! All hubs and suppliers restored from local backup.");
        } catch (e) {
            console.error("Rescue Error:", e);
            alert("Rescue failed. Please try again or manual entry.");
        } finally {
            setLoadingSync(false);
        }
    };


    const deleteTransaction = async (id: string) => {
        try {
            if (workspaceId) await supabaseDb.deleteTransaction(workspaceId.trim(), id);
            const docRef = doc(db, "workspaces", workspaceId, "transactions", id);
            await deleteDoc(docRef);
        } catch (e) {
            console.error("Delete Tx Error:", e);
        }
    };

    const handleBulkDeleteTransactions = async (ids: string[]) => {
        if (!ids || ids.length === 0) return;
        try {
            if (workspaceId) await supabaseDb.deleteTransactions(workspaceId.trim(), ids);
            const batchPromises = ids.map(id => {
                const docRef = doc(db, "workspaces", workspaceId, "transactions", id);
                return deleteDoc(docRef);
            });
            await Promise.all(batchPromises);
        } catch (e) {
            console.error("Bulk Delete Tx Error:", e);
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="login-page">
                {/* Animated Grid Background */}
                <div className="login-grid-bg"></div>

                {/* Floating Particles */}
                <div className="login-particles">
                    <div className="login-particle"></div>
                    <div className="login-particle"></div>
                    <div className="login-particle"></div>
                    <div className="login-particle"></div>
                    <div className="login-particle"></div>
                    <div className="login-particle"></div>
                    <div className="login-particle"></div>
                    <div className="login-particle"></div>
                </div>

                {/* Corner Accents */}
                <div className="login-corner-accent top-left"></div>
                <div className="login-corner-accent bottom-right"></div>

                {/* Left Branding Panel (Desktop) */}
                <div className="login-brand-panel">
                    <div className="login-orbs">
                        <div className="login-orb login-orb-1"></div>
                        <div className="login-orb login-orb-2"></div>
                        <div className="login-orb login-orb-3"></div>
                        <div className="login-mesh-sphere"></div>
                        <div className="login-mesh-ring"></div>
                    </div>

                    <div className="login-brand-content">
                        <div className="login-brand-badge">
                            <span className="dot"></span>
                            System Online
                        </div>
                        <h1>BizFlow<br />Ledger</h1>
                        <p>Elevate your business finances with real-time analytics, intelligent sync, and enterprise-grade security.</p>

                        <div className="login-features">
                            <div className="login-feature-item">
                                <div className="login-feature-icon purple">
                                    <BarChart3 size={18} />
                                </div>
                                <span className="login-feature-text">Real-time Financial Analytics</span>
                            </div>
                            <div className="login-feature-item">
                                <div className="login-feature-icon blue">
                                    <Cloud size={18} />
                                </div>
                                <span className="login-feature-text">Cloud-Synced Dual Ledger Engine</span>
                            </div>
                            <div className="login-feature-item">
                                <div className="login-feature-icon cyan">
                                    <Shield size={18} />
                                </div>
                                <span className="login-feature-text">Military-Grade Data Encryption</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Login Card Panel */}
                <div className="login-card-panel">
                    <div className="login-card">
                        <div className="login-card-glow"></div>

                        {/* Mobile-only branding */}
                        <div className="login-mobile-brand">
                            <div className="login-logo">
                                <LayoutDashboard size={28} />
                            </div>
                            <h1>BizFlow</h1>
                            <p>Financial Intelligence</p>
                        </div>

                        {/* Desktop logo */}
                        <div className="hidden md:block">
                            <div className="login-logo">
                                <LayoutDashboard size={28} />
                            </div>
                        </div>

                        <div className="login-header">
                            <h2>Welcome Back</h2>
                            <p>Sign in to access your workspace</p>
                        </div>

                        {/* Google Auth Login Option */}
                        <div className="my-4 space-y-3">
                            <button
                                type="button"
                                onClick={() => handleGoogleLogin('shivrat2025@gmail.com')}
                                className="w-full py-3.5 px-4 bg-white hover:bg-slate-50 text-slate-800 font-bold rounded-2xl border border-slate-200 shadow-sm hover:shadow-md flex items-center justify-center gap-3 transition-all active:scale-[0.98] cursor-pointer"
                            >
                                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                                </svg>
                                <span className="text-xs font-black">Continue with Google (shivrat2025@gmail.com)</span>
                            </button>

                            <div className="flex items-center gap-3 my-2">
                                <div className="h-[1px] bg-slate-200 flex-1"></div>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">or login with password</span>
                                <div className="h-[1px] bg-slate-200 flex-1"></div>
                            </div>
                        </div>

                        <form onSubmit={handleLogin} className="login-form">
                            <div className="login-input-group">
                                <div className="login-input-icon">
                                    <Landmark size={18} />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Database / Username"
                                    value={usernameInput}
                                    onChange={(e) => setUsernameInput(e.target.value)}
                                    className="login-input"
                                    autoFocus
                                    id="login-username"
                                />
                            </div>

                            <div className="login-input-group">
                                <div className="login-input-icon">
                                    <Lock size={18} />
                                </div>
                                <input
                                    type="password"
                                    placeholder="Password"
                                    value={passwordInput}
                                    onChange={(e) => setPasswordInput(e.target.value)}
                                    className={`login-input ${loginError ? 'error' : ''}`}
                                    id="login-password"
                                />
                            </div>

                            {loginError && (
                                <div className="login-error">
                                    ⛔ Access denied — Invalid credentials
                                </div>
                            )}

                            <button type="submit" className="login-btn" id="login-submit">
                                Sign In & Synchronize
                                <ChevronRight size={16} />
                            </button>
                        </form>

                        <div className="login-footer">
                            <div className="login-footer-divider"></div>
                            <p className="login-footer-text">
                                Secured by Firebase • End-to-End Encrypted
                            </p>
                        </div>

                        <div className="login-security-badges">
                            <div className="login-security-badge">
                                <Shield size={12} />
                                <span>256-bit SSL</span>
                            </div>
                            <div className="login-security-badge">
                                <Lock size={12} />
                                <span>Encrypted</span>
                            </div>
                            <div className="login-security-badge">
                                <Zap size={12} />
                                <span>Real-time</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Version Badge */}
                <div className="login-version-badge">BizFlow v3.0 • Enterprise Edition</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f0f4f8] flex flex-col md:flex-row font-sans relative overflow-hidden selection:bg-indigo-500 selection:text-white">
            {/* Ambient Background Mesh */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-purple-400/30 blur-[120px] mix-blend-multiply animate-blob" />
                <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-400/30 blur-[120px] mix-blend-multiply animate-blob animation-delay-2000" />
                <div className="absolute bottom-[-10%] left-[20%] w-[40%] h-[40%] rounded-full bg-pink-400/30 blur-[120px] mix-blend-multiply animate-blob animation-delay-4000" />
                <div className="absolute bottom-[-10%] right-[20%] w-[40%] h-[40%] rounded-full bg-blue-400/30 blur-[120px] mix-blend-multiply animate-blob animation-delay-4000" />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] brightness-100 contrast-150"></div>
            </div>

            {/* Mobile Top Header */}
            <div className="md:hidden flex items-center justify-between p-4 bg-slate-50/50 backdrop-blur-md sticky top-0 z-30 px-6">
                <div className="flex items-center gap-2">
                    <div className="bg-indigo-600 p-1.5 rounded-lg text-white shadow-lg shadow-indigo-100">
                        <LayoutDashboard size={18} />
                    </div>
                    <span className="text-lg font-black text-slate-800 tracking-tighter">BizFlow</span>
                </div>
                <button
                    onClick={() => setIsMobileMenuOpen(true)}
                    className="p-2 text-slate-600 hover:text-slate-900 transition-colors bg-white/20 backdrop-blur-xl rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.05)] border border-white/30"
                >
                    <Menu size={18} />
                </button>
            </div>

            {/* Mobile Backdrop */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/40 z-40 md:hidden backdrop-blur-sm"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Mobile Bottom Navigation - Glass */}
            <div className="md:hidden fixed bottom-4 left-4 right-4 bg-white/30 backdrop-blur-2xl border border-white/30 rounded-[2rem] px-6 py-3 z-40 flex justify-between items-center shadow-[0_8px_32px_0_rgba(31,38,135,0.1)] no-select ring-1 ring-white/40">
                {[
                    { id: 'dashboard', icon: LayoutDashboard, label: 'Home' },
                    { id: 'history', icon: History, label: 'Logs' },
                    { id: 'new', icon: Plus, label: 'Add', isFab: true },
                    { id: 'invoices', icon: FileText, label: 'Bills' },
                    { id: 'backup', icon: Shield, label: 'Backup' },
                    { id: 'cloud', icon: Cloud, label: 'Cloud' },
                ].map(item => (
                    item.isFab ? (
                        <button
                            key={item.id}
                            onClick={() => setShowForm(true)}
                            className="bg-indigo-600 text-white p-4 rounded-full shadow-lg shadow-indigo-200 -mt-8 relative z-50 transform active:scale-90 transition-transform"
                        >
                            <item.icon size={24} />
                        </button>
                    ) : (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`flex flex-col items-center gap-1 transition-all ${activeTab === item.id ? 'text-indigo-600' : 'text-slate-400'
                                }`}
                        >
                            <item.icon size={20} strokeWidth={activeTab === item.id ? 2.5 : 2} />
                            <span className="text-[9px] font-black uppercase tracking-tight">{item.label}</span>
                        </button>
                    )
                ))}
            </div>

            {/* Sidebar Navigation (Desktop & Mobile Drawer) */}
            <nav className={`
        fixed md:sticky top-0 h-screen z-50 bg-white/70 backdrop-blur-xl border-r border-white/50 flex-shrink-0 flex flex-col p-6 gap-2 transition-transform duration-300 ease-in-out w-72 shadow-[0_8px_32px_0_rgba(31,38,135,0.05)]
        ${isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'}
      `}>
                <div className="hidden md:flex items-center gap-4 px-3 mb-10">
                    <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-100">
                        <LayoutDashboard size={24} />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-lg font-black text-slate-800 tracking-tight leading-none drop-shadow-sm">BizFlow</span>
                        <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mt-1">Ledger Pro</span>
                    </div>
                </div>

                {/* Mobile Close Button in Nav */}
                <div className="md:hidden flex justify-between items-center mb-8 px-2">
                    <span className="text-lg font-black text-slate-800">Menu</span>
                    <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-slate-50 rounded-full text-slate-500">
                        <ChevronRight className="rotate-180" size={20} />
                    </button>
                </div>

                <div className="space-y-1">
                    {[
                        { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
                        { id: 'accounts', icon: Wallet, label: 'Accounts' },
                        { id: 'history', icon: History, label: 'Transaction' },
                        { id: 'invoices', icon: FileText, label: 'Invoices' },
                        { id: 'backup', icon: Shield, label: 'Backups' },
                        { id: 'cloud', icon: Cloud, label: 'Cloud' },
                        { id: 'settings', icon: Settings, label: 'Settings' },
                    ].map(item => (
                        <button
                            key={item.id}
                            onClick={() => {
                                setActiveTab(item.id);
                                setIsMobileMenuOpen(false);
                            }}
                            className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl font-bold transition-all relative overflow-hidden group/item ${activeTab === item.id
                                ? 'bg-white/80 backdrop-blur-md text-indigo-700 shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-white/60 ring-1 ring-white/60'
                                : 'text-slate-500 hover:text-slate-800 hover:bg-white/50 hover:backdrop-blur-sm'
                                }`}
                        >
                            <item.icon size={18} className={activeTab === item.id ? "text-indigo-600 drop-shadow-sm" : "group-hover/item:text-indigo-500 transition-colors"} />
                            <span className="text-sm tracking-tight">{item.label}</span>
                        </button>
                    ))}
                </div>

                <div className="mt-auto space-y-4 pt-10">
                    <div className={`px-5 py-3 border rounded-2xl transition-all backdrop-blur-md ${firebaseStatus === 'CONNECTED' ? 'bg-green-50/80 border-green-100' : 'bg-white/50 border-white/60'
                        } shadow-inner`}>
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Database</span>
                            <div className={`w-2 h-2 rounded-full shadow-sm ${firebaseStatus === 'CONNECTED' ? 'bg-green-500 shadow-green-200' :
                                firebaseStatus === 'SYNCING' ? 'bg-amber-500 animate-pulse' : 'bg-red-500'}`}
                            />
                        </div>
                        <p className="text-[11px] font-bold text-slate-700 truncate font-mono tracking-tight opacity-70">{workspaceId}</p>
                    </div>
                    <button
                        onClick={() => {
                            setShowForm(true);
                            setIsMobileMenuOpen(false);
                        }}
                        className="w-full bg-gradient-to-r from-slate-900 to-slate-800 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-2xl hover:scale-[1.02] transition-all border border-white/10"
                    >
                        <Plus size={20} /> New Entry
                    </button>

                    <button
                        onClick={async () => {
                            if (!window.confirm("EMERGENCY RESCUE: Are you sure you want to FORCE PUSH your current screen's data to the cloud? This will overwrite the cloud database with what you see here.")) return;
                            try {
                                const batch = writeBatch(db);
                                transactions.forEach(tx => {
                                    const txRef = doc(db, "workspaces", workspaceId, "transactions", tx.id);
                                    batch.set(txRef, deepClean(tx));
                                });

                                const wsRef = doc(db, "workspaces", workspaceId);
                                await updateDoc(wsRef, {
                                    accounts: deepClean(accounts),
                                    categories: deepClean(categories),
                                    suppliers: deepClean(suppliers),
                                    aiRules: deepClean(aiRules)
                                });

                                await batch.commit();
                                alert('Successfully rescued and pushed local data to the cloud!');
                            } catch (e: any) {
                                alert('Failed to rescue: ' + e.message);
                            }
                        }}
                        className="w-full bg-emerald-500/10 backdrop-blur-md border border-emerald-500/30 text-emerald-600 py-3 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-emerald-500 hover:text-white transition-all text-[10px] uppercase tracking-widest shadow-sm hover:shadow-md mt-2"
                    >
                        <Zap size={14} /> Rescue Data To Cloud
                    </button>

                    <button
                        onClick={handleLogout}
                        className="w-full bg-white/70 backdrop-blur-md border border-white/60 text-slate-500 py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-red-50/50 hover:text-red-500 hover:border-red-100 transition-all text-xs uppercase tracking-widest shadow-sm hover:shadow-md mt-2"
                    >
                        Sign Out Account
                    </button>
                </div>
            </nav>

            <main className="flex-1 p-4 md:p-10 max-h-screen overflow-y-auto pb-24 md:pb-10 relative z-10 scrollbar-hide">
                <header className="mb-6 md:mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6 animate-in fade-in slide-in-from-top-4 duration-700">
                    <div className="space-y-1">
                        <div className="flex items-center gap-3 mb-1">
                            <span className="px-3 py-1 bg-white/50 backdrop-blur-md text-indigo-600 rounded-lg text-[9px] font-black uppercase tracking-widest border border-white/60 shadow-sm">
                                {activeTab === 'history' ? 'Ledger' : activeTab === 'dashboard' ? 'Core' : activeTab}
                            </span>
                            <div className="h-1 w-1 rounded-full bg-slate-400" />
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Enterprise Ledger</span>
                        </div>
                        <h2 className="text-2xl md:text-3xl font-black text-slate-800 capitalize tracking-tighter leading-none drop-shadow-sm">
                            {activeTab === 'history' ? 'Transactions' : activeTab}
                        </h2>
                        <p className="text-slate-500 font-bold text-[9px] uppercase tracking-[0.2em] opacity-70">BizFlow intelligence platform.</p>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3">
                            {/* Privacy Toggle — always visible */}
                            <button
                                onClick={() => setPrivacyMode(p => !p)}
                                title={privacyMode ? 'Show balances' : 'Hide balances'}
                                className={`flex items-center gap-2 px-4 py-3 rounded-[1.2rem] text-[10px] font-black uppercase tracking-widest border transition-all shadow-sm ${privacyMode
                                        ? 'bg-slate-900 text-white border-slate-800 shadow-slate-900/20'
                                        : 'bg-white/40 backdrop-blur-md border-white/60 text-slate-500 hover:bg-white/60'
                                    }`}
                            >
                                {privacyMode ? <EyeOff size={15} /> : <Eye size={15} />}
                                <span className="hidden sm:inline">{privacyMode ? 'Hidden' : 'Visible'}</span>
                            </button>

                            {activeTab === 'dashboard' && (
                                <button
                                    onClick={handleExport}
                                    className="flex items-center gap-2.5 px-6 py-4 bg-white/40 backdrop-blur-md border border-white/60 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-white/60 transition-all shadow-lg shadow-indigo-500/5 group hover:border-indigo-200 hover:-translate-y-1"
                                >
                                    <Cloud size={16} className="text-indigo-500 group-hover:scale-110 transition-transform" />
                                    Cloud Backup
                                </button>
                            )}
                        </div>
                        <div className="hidden lg:flex flex-col items-end px-8 border-l-2 border-white/20">
                            <button
                                onClick={() => setShowChangelogModal(true)}
                                className="group flex items-center gap-1.5 px-3 py-1 bg-indigo-50/80 hover:bg-indigo-100/90 border border-indigo-200/60 rounded-xl transition-all active:scale-95 shadow-xs cursor-pointer mb-1"
                                title="Click to view Version History & Release Notes"
                            >
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                <span className="text-[10px] font-black text-indigo-700 tracking-wider">v{APP_VERSION}</span>
                            </button>
                            <span className="text-sm font-black text-slate-800 tracking-tighter">{workspaceId}</span>
                        </div>
                    </div>
                </header>

                {activeTab === 'dashboard' && <Dashboard stats={currentStats} accounts={computedAccounts} transactions={transactions} categories={categories} onBackup={handleExport} profitPercent={profitPercent} privacyMode={privacyMode} />}

                {activeTab === 'accounts' && <AccountManager accounts={computedAccounts} transactions={transactions} onAdd={handleAddAccount} onUpdate={handleUpdateAccount} onDelete={handleDeleteAccount} onRestoreFromDump={handleRestoreFromLocalDump} privacyMode={privacyMode} />}
                {activeTab === 'history' && (
                    <HistoryList
                        transactions={transactions}
                        deleteTransaction={deleteTransaction}
                        onBulkDelete={handleBulkDeleteTransactions}
                        onEdit={(tx) => {
                            setEditingTransaction(tx);
                            setShowForm(true);
                        }}
                        onDuplicate={(tx) => {
                            const { id, ...duplicateData } = tx;
                            setEditingTransaction({ ...duplicateData, date: Date.now() } as any);
                            setShowForm(true);
                        }}
                        accounts={computedAccounts}
                        categories={categories}
                        onUpdate={handleUpdateTransaction}
                    />
                )}
                {activeTab === 'invoices' && (
                    <InvoicesList
                        transactions={transactions}
                        accounts={computedAccounts}
                        categories={categories}
                        onUpdate={handleUpdateTransaction}
                        onDelete={deleteTransaction}
                        onEdit={(tx) => {
                            setEditingTransaction(tx);
                            setShowForm(true);
                        }}
                        suppliers={suppliers}
                    />
                )}

                {activeTab === 'cloud' && (
                    <CloudSync
                        workspaceId={workspaceId}
                        loading={loadingSync}
                        lastSynced={lastSynced}
                        onLogout={handleLogout}
                        onDeleteWorkspace={handleDeleteWorkspace}
                        onExport={handleExport}
                        onCreateSnapshot={handleCreateSnapshot}
                    />
                )}

                {activeTab === 'backup' && (
                    <BackupManager
                        backups={availableBackups}
                        onRestore={handleRestoreFromSnapshot}
                        onCreateSnapshot={handleCreateSnapshot}
                        loading={loadingSync}
                    />
                )}

                {activeTab === 'settings' && (
                    <div className="max-w-lg mx-auto space-y-6 animate-in fade-in duration-500">
                        {/* Profit Rule Config */}
                        <div className="bg-white/70 backdrop-blur-xl p-6 rounded-[1.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="p-1.5 bg-indigo-50 rounded-xl"><Settings size={14} className="text-indigo-600" /></div>
                                <h3 className="text-sm font-black text-slate-800 tracking-tight">Profit Rule Configuration</h3>
                            </div>
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-6">Set the % of revenue to target for profit withdrawal</p>

                            <div className="space-y-5">
                                {/* Big % display */}
                                <div className="flex items-center justify-between">
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Profit Withdrawal Target</span>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            min={1} max={50} step={0.5}
                                            value={profitPercent}
                                            onChange={e => {
                                                const v = Math.min(50, Math.max(1, parseFloat(e.target.value) || 1));
                                                setProfitPercent(v);
                                            }}
                                            className="w-16 text-center text-lg font-black text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-xl px-2 py-1 outline-none focus:ring-2 focus:ring-indigo-300"
                                        />
                                        <span className="text-lg font-black text-indigo-700">%</span>
                                    </div>
                                </div>

                                {/* Slider */}
                                <div>
                                    <input
                                        type="range"
                                        min={1} max={50} step={0.5}
                                        value={profitPercent}
                                        onChange={e => setProfitPercent(parseFloat(e.target.value))}
                                        className="w-full h-1.5 rounded-full accent-indigo-600 cursor-pointer"
                                    />
                                    <div className="flex justify-between mt-1">
                                        <span className="text-[7px] font-black text-slate-300 uppercase tracking-widest">1%</span>
                                        <span className="text-[7px] font-black text-slate-300 uppercase tracking-widest">50%</span>
                                    </div>
                                </div>

                                {/* Quick presets */}
                                <div className="flex gap-2 flex-wrap">
                                    {[3, 5, 8, 10, 15, 20].map(p => (
                                        <button
                                            key={p}
                                            onClick={() => setProfitPercent(p)}
                                            className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest transition-all border ${profitPercent === p
                                                ? 'bg-indigo-600 text-white border-indigo-700 shadow-md shadow-indigo-200'
                                                : 'bg-white/60 text-slate-500 border-white/60 hover:border-indigo-200 hover:text-indigo-600'
                                                }`}
                                        >{p}%</button>
                                    ))}
                                </div>

                                {/* Save */}
                                <button
                                    onClick={async () => {
                                        localStorage.setItem('bizflow_profit_pct', String(profitPercent));
                                        if (workspaceId) {
                                            try {
                                                const docRef = doc(db, 'workspaces', workspaceId);
                                                await updateDoc(docRef, { profitPercent, lastSynced: Date.now() });
                                            } catch (e) { console.error(e); }
                                        }
                                        alert(`✅ Profit target saved: ${profitPercent}%`);
                                    }}
                                    className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-500/20 hover:scale-[1.02] active:scale-95 transition-all"
                                >
                                    Save Configuration
                                </button>
                            </div>
                        </div>

                        {/* Current impact preview */}
                        <div className="bg-white/70 backdrop-blur-xl p-5 rounded-[1.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-3">Live Impact Preview</p>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-indigo-50 rounded-2xl p-3 text-center">
                                    <p className="text-[7px] font-black text-indigo-400 uppercase tracking-widest mb-1">Threshold ({profitPercent}%)</p>
                                    <p className="text-base font-black text-indigo-700">
                                        ₹{Math.round((currentStats.totalCodIncome + currentStats.totalPrepaidIncome) * profitPercent / 100).toLocaleString('en-IN')}
                                    </p>
                                </div>
                                <div className="bg-emerald-50 rounded-2xl p-3 text-center">
                                    <p className="text-[7px] font-black text-emerald-500 uppercase tracking-widest mb-1">Already Withdrawn</p>
                                    <p className="text-base font-black text-emerald-700">₹{currentStats.totalWithdrawals.toLocaleString('en-IN')}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            </main>

            {showForm && (
                <TransactionForm
                    onClose={() => {
                        setShowForm(false);
                        setEditingTransaction(null);
                    }}
                    onSubmit={handleAddTransaction}
                    onAddCategory={handleAddCategory}
                    accounts={computedAccounts}
                    categories={categories}
                    currentStats={currentStats}
                    initialData={editingTransaction}
                    allTags={Array.from(new Set(transactions.flatMap(t => t.tags || [])))}
                    suppliers={suppliers}
                    onAddSupplier={handleSaveSupplier}
                />
            )}

            {/* Custom UI overlay for Delete Confirmation */}
            {deleteAccountState && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-100">
                        <div className="p-6 text-center">
                            <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center mx-auto mb-5 shadow-inner ${deleteAccountState.blockedCount > 0 ? 'bg-amber-100/50 text-amber-500 border border-amber-200' : 'bg-rose-100/50 text-rose-500 border border-rose-200'}`}>
                                <AlertCircle size={32} strokeWidth={2.5} />
                            </div>
                            <h3 className="text-xl font-black text-slate-800 mb-2 tracking-tight">
                                {deleteAccountState.blockedCount > 0 ? 'Cannot Delete Hub' : 'Delete Financial Hub?'}
                            </h3>
                            <p className="text-sm font-bold text-slate-500 mb-8 leading-relaxed px-2">
                                {deleteAccountState.blockedCount > 0
                                    ? `Cannot delete "${deleteAccountState.name}". This account has ${deleteAccountState.blockedCount} linked transaction(s). Please reassign or remove them first.`
                                    : `Are you sure you want to delete "${deleteAccountState.name}"? This action cannot be undone.`}
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setDeleteAccountState(null)}
                                    className="flex-1 px-4 py-3.5 bg-slate-50 hover:bg-slate-100 text-slate-600 font-black tracking-widest uppercase text-[10px] rounded-2xl transition-all border border-slate-200 focus:ring-2 focus:ring-slate-300"
                                >
                                    {deleteAccountState.blockedCount > 0 ? 'Understood' : 'Cancel'}
                                </button>
                                {deleteAccountState.blockedCount === 0 && (
                                    <button
                                        onClick={confirmDeleteAccount}
                                        className="flex-1 px-4 py-3.5 bg-rose-500 hover:bg-rose-600 text-white font-black tracking-widest uppercase text-[10px] rounded-2xl shadow-lg shadow-rose-500/30 transition-all active:scale-95 focus:ring-2 focus:ring-rose-500/50"
                                    >
                                        Delete Hub
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Live Update Toast Notification */}
            {showUpdateNotice && (
                <div className="fixed bottom-6 right-6 z-[110] bg-slate-900/95 backdrop-blur-xl text-white p-5 rounded-3xl shadow-2xl border border-slate-700/60 max-w-sm animate-in slide-in-from-bottom duration-300">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2.5 bg-indigo-500/20 text-indigo-400 rounded-2xl border border-indigo-500/30">
                                <Sparkles size={18} />
                            </div>
                            <div>
                                <h4 className="text-xs font-black tracking-tight flex items-center gap-2">
                                    {APP_RELEASE_NOTES.title}
                                    <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full font-black border border-emerald-500/30">{APP_RELEASE_NOTES.version}</span>
                                </h4>
                                <p className="text-[10px] text-slate-300 font-medium mt-1">{APP_RELEASE_NOTES.highlights[0]}</p>
                            </div>
                        </div>
                        <button onClick={handleDismissNotice} className="text-slate-400 hover:text-white transition-colors p-1">
                            <X size={16} />
                        </button>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-800 flex justify-between items-center">
                        <button onClick={() => { handleDismissNotice(); setShowChangelogModal(true); }} className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors">
                            View Changelog →
                        </button>
                        <button onClick={handleDismissNotice} className="text-[10px] font-bold bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 rounded-xl transition-all shadow-md">
                            Got It
                        </button>
                    </div>
                </div>
            )}

            {/* Version History & Release Notes Modal */}
            {showChangelogModal && (
                <div className="fixed inset-0 z-[120] bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setShowChangelogModal(false)}>
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100">
                                    <Sparkles size={20} />
                                </div>
                                <div>
                                    <h3 className="text-base font-black text-slate-800 tracking-tight">System Update Logs</h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Version {APP_VERSION} · Released {APP_RELEASE_NOTES.date}</p>
                                </div>
                            </div>
                            <button onClick={() => setShowChangelogModal(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-700">
                            <div className="p-5 bg-gradient-to-br from-indigo-50/80 to-purple-50/80 border border-indigo-100 rounded-2xl">
                                <h4 className="font-black text-indigo-950 text-sm flex items-center justify-between">
                                    <span>{APP_RELEASE_NOTES.title}</span>
                                    <span className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded-full font-black">{APP_RELEASE_NOTES.version}</span>
                                </h4>
                                <ul className="mt-3 space-y-2 text-xs text-indigo-900 font-medium">
                                    {APP_RELEASE_NOTES.highlights.map((h, i) => (
                                        <li key={i} className="flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 flex-shrink-0"></span>
                                            {h}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div>
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Version History (CHANGELOG.md)</h4>
                                <div className="space-y-4 text-xs text-slate-600">
                                    <div className="border-l-2 border-indigo-500 pl-4 py-0.5">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-black text-slate-900 text-xs">v2.1.0</span>
                                            <span className="text-[9px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-black border border-emerald-200">Current</span>
                                        </div>
                                        <p className="text-[11px] text-slate-600">Migrated database engine to Supabase PostgreSQL, imported 1,385 transactions & fixed target account credit logic on self-transfers.</p>
                                    </div>
                                    <div className="border-l-2 border-slate-200 pl-4 py-0.5">
                                        <span className="font-black text-slate-700 text-xs">v2.0.0</span>
                                        <p className="text-[11px] text-slate-500 mt-0.5">Added multi-account enterprise architecture (IDFC, IndusInd, Credit Cards, ODs) + AI rule assistant.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
                            <button onClick={() => setShowChangelogModal(false)} className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black rounded-xl uppercase tracking-widest shadow-md transition-all active:scale-95">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default App;
// Build Trigger
