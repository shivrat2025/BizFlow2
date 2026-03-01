import React, { useState, useEffect, useMemo } from 'react';
import { LayoutDashboard, History, Wallet, Cloud, Plus, RefreshCw, ChevronRight, BarChart3, FileText, Menu, Landmark, Lock, Shield, Zap, AlertCircle } from 'lucide-react';
import { initializeApp, getApp, getApps } from "firebase/app";
import { getFirestore, doc, onSnapshot, setDoc, deleteDoc, updateDoc, collection, writeBatch, getDoc, getDocs, query } from "firebase/firestore";
import { Account, Transaction, DashboardStats, ExpenseCategory, AIRule } from './types';
import Dashboard from './components/Dashboard';
import AccountManager from './components/AccountManager';
import HistoryList from './components/HistoryList';
import InvoicesList from './components/InvoicesList';
import CloudSync from './components/CloudSync';
import TransactionForm from './components/TransactionForm';
import BackupManager from './components/BackupManager';

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

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        const cleanUsername = usernameInput.trim().toUpperCase();
        if (passwordInput === 'Kimi@123' && cleanUsername) {
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
            } else {
                setDoc(doc(db, "workspaces", workspaceId), {
                    accounts: [],
                    categories: DEFAULT_CATEGORIES,
                    aiRules: [],
                    suppliers: [],
                    lastSynced: Date.now()
                }, { merge: true });
            }
        }, (err) => {
            console.error("Meta Sync Error:", err);
            setFirebaseStatus('ERROR');
        });

        // 2. Listen to Transactions Sub-collection (Real-time for all users)
        const unsubTxs = onSnapshot(collection(db, "workspaces", workspaceId, "transactions"), (querySnap) => {
            const txs: Transaction[] = [];
            querySnap.forEach((doc) => {
                txs.push({ ...doc.data(), id: doc.id } as Transaction);
            });
            setRealtimeTransactions(txs);
            setFirebaseStatus('CONNECTED');
        }, (err) => {
            console.error("Transaction Sync Error:", err);
            setFirebaseStatus('ERROR');
        });

        return () => {
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

        // Fetch historical backups on login/refresh
        const fetchBackups = async () => {
            if (!workspaceId) return;
            const backupsRef = collection(db, "backups");
            // Note: We'd ideally use a query here, but listing by ID prefix is safer for simple Firestore rules
            const snap = await getDocs(backupsRef);
            const history: any[] = [];
            const manualSlots: any = {};

            snap.forEach(doc => {
                if (doc.id.startsWith(`${workspaceId}_BACKUP_`)) {
                    const data = doc.data();
                    history.push({
                        id: doc.id,
                        date: data.snapshotDate,
                        label: new Date(data.snapshotDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                    });
                }
            });

            setSnapshotDates({});
            const sortedHistory = history.sort((a, b) => b.date - a.date);
            setAvailableBackups(sortedHistory.slice(0, 3));

            // Automatic Daily Backup Check
            const today = new Date().toISOString().split('T')[0];
            const autoId = `${workspaceId}_BACKUP_AUTO_${today}`;
            const exists = history.some(h => h.id === autoId);

            if (!exists && accounts.length > 0) {
                console.log("Creating daily auto-backup...");
                handleCreateSnapshot(`AUTO_${today}`, true);

                // Cleanup: Delete backups older than 3 days
                if (sortedHistory.length >= 3) {
                    const toDelete = sortedHistory.slice(3);
                    toDelete.forEach(async (oldSnap) => {
                        try {
                            const oldTxsRef = collection(db, "backups", oldSnap.id, "transactions");
                            const oldTxs = await getDocs(oldTxsRef);
                            const batch = writeBatch(db);
                            oldTxs.forEach(d => batch.delete(doc(oldTxsRef, d.id)));
                            await batch.commit();
                            await deleteDoc(doc(db, "backups", oldSnap.id));
                        } catch (e) {
                            console.error("Pruning Error:", e);
                        }
                    });
                }
            }
        };
        fetchBackups();
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
                if (t.type === 'REPAYMENT') {
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

            const docRef = doc(db, "workspaces", trimmedWorkspace, "transactions", txId);
            await setDoc(docRef, deepClean(newTx));
            console.log("Transaction saved successfully:", txId);

            setShowForm(false);
            setEditingTransaction(null);
        } catch (e) {
            console.error("Add Tx Error:", e);
            alert("Failed to save transaction to cloud. Check console for details.");
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
            const today = new Date().toISOString().split('T')[0];
            const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }).replace(':', '-');
            const snapshotId = `${workspaceId}_BACKUP_AUTO_${today}_${timeStr}`;

            // 1. Get Metadata
            const docRef = doc(db, "workspaces", workspaceId);
            const docSnap = await getDoc(docRef);
            const meta = docSnap.data();

            if (!meta) return;

            // 2. Save Backup Metadata
            const backupRef = doc(db, "backups", snapshotId);
            await setDoc(backupRef, {
                ...meta,
                snapshotDate: Date.now(),
                label: label,
                originalWorkspace: workspaceId
            });

            // 3. Save Backup Transactions (Chunked batching to handle 500+ items)
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

            // Refresh available backups and keep only the latest 3
            const backupsRef = collection(db, "backups");
            const snap = await getDocs(backupsRef);
            const history: any[] = [];
            snap.forEach(d => {
                if (d.id.startsWith(`${workspaceId}_BACKUP_`)) {
                    const data = d.data();
                    history.push({
                        id: d.id,
                        date: data.snapshotDate,
                        label: new Date(data.snapshotDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                    });
                }
            });

            const sortedHistory = history.sort((a, b) => b.date - a.date);

            // Delete older backups beyond the 3 recent ones from the cloud
            if (sortedHistory.length > 3) {
                const backupsToDelete = sortedHistory.slice(3);
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

            setAvailableBackups(sortedHistory.slice(0, 3));

            if (!isAuto) alert("Protection Point Saved Successfully!");
        } catch (e) {
            console.error("Snapshot Error:", e);
            if (!isAuto) alert("Failed to create snapshot");
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
            const docRef = doc(db, "workspaces", workspaceId, "transactions", id);
            await deleteDoc(docRef);
        } catch (e) {
            console.error("Delete Tx Error:", e);
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
                        {activeTab === 'dashboard' && (
                            <button
                                onClick={handleExport}
                                className="flex items-center gap-2.5 px-6 py-4 bg-white/40 backdrop-blur-md border border-white/60 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-white/60 transition-all shadow-lg shadow-indigo-500/5 group hover:border-indigo-200 hover:-translate-y-1"
                            >
                                <Cloud size={16} className="text-indigo-500 group-hover:scale-110 transition-transform" />
                                Cloud Backup
                            </button>
                        )}
                        <div className="hidden lg:flex flex-col items-end px-8 border-l-2 border-white/20">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Financial Node</span>
                            <span className="text-base font-black text-slate-800 tracking-tighter">{workspaceId}</span>
                        </div>
                    </div>
                </header>

                {activeTab === 'dashboard' && <Dashboard stats={currentStats} accounts={computedAccounts} transactions={transactions} categories={categories} onBackup={handleExport} />}

                {activeTab === 'accounts' && <AccountManager accounts={computedAccounts} onAdd={handleAddAccount} onUpdate={handleUpdateAccount} onDelete={handleDeleteAccount} onRestoreFromDump={handleRestoreFromLocalDump} />}
                {activeTab === 'history' && (
                    <HistoryList
                        transactions={transactions}
                        deleteTransaction={deleteTransaction}
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
                        url={cloudUrl}
                        setUrl={(url) => {
                            setCloudUrl(url);
                            persistAndSync(undefined, undefined, undefined, undefined, url);
                        }}
                        workspaceId={workspaceId}
                        loading={loadingSync}
                        lastSynced={lastSynced}
                        onLogout={handleLogout}
                        onDeleteWorkspace={handleDeleteWorkspace}
                        onExport={handleExport}
                        onCreateSnapshot={handleCreateSnapshot}
                        onRestoreSnapshot={handleRestoreFromSnapshot}
                        snapshotDates={snapshotDates}
                    />
                )}

                {activeTab === 'backup' && (
                    <BackupManager
                        backups={availableBackups}
                        onRestore={handleRestoreFromSnapshot}
                        loading={loadingSync}
                    />
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
        </div>
    );
};

export default App;
// Build Trigger
