import React, { Component, useState, useMemo } from 'react';
import { Trash2, TrendingUp, TrendingDown, PiggyBank, Package, Truck, Facebook, CreditCard, Landmark, ArrowRight, Tag, FileText, Pencil, Filter, Calendar, ChevronDown, Clock, Copy, Search, Check, X, Wallet, ArrowUpDown, ArrowUp, ArrowDown, AlertCircle, RefreshCw } from 'lucide-react';
import { Transaction, Account, ExpenseCategory } from '../types';
import { getBankLogo } from '../utils/bankLogos';

interface Props {
  transactions?: Transaction[];
  deleteTransaction: (id: string) => void;
  onBulkDelete?: (ids: string[]) => void;
  onEdit: (tx: Transaction) => void;
  onDuplicate: (tx: Transaction) => void;
  accounts?: Account[];
  categories?: ExpenseCategory[];
  onUpdate: (id: string, updates: Partial<Transaction>) => void;
}

class HistoryErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean, error: string }> {
  state: { hasError: boolean; error: string };
  props: { children: React.ReactNode };
  setState: any;
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: '' };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error: error?.message || 'Transaction rendering error' };
  }
  componentDidCatch(error: any, info: any) {
    console.error("HistoryList Render Error caught:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 bg-white rounded-2xl border border-rose-200 text-center space-y-4 shadow-sm my-6">
          <div className="w-12 h-12 bg-rose-50 border border-rose-100 rounded-2xl flex items-center justify-center mx-auto text-rose-500">
            <AlertCircle size={24} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">Unable to display ledger list</h3>
            <p className="text-xs font-medium text-slate-500 mt-1 max-w-md mx-auto">
              A formatting error occurred while processing one of your entries ({this.state.error}).
            </p>
          </div>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="px-6 py-3 bg-slate-900 text-white font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-black transition-all shadow-xs"
          >
            Reload Ledger View
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const HistoryListContent: React.FC<Props> = ({
  transactions = [],
  deleteTransaction,
  onBulkDelete,
  onEdit,
  onDuplicate,
  accounts = [],
  categories = [],
  onUpdate
}) => {
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('ALL_TIME');
  const [selectedTag, setSelectedTag] = useState('ALL_TAGS');
  const [selectedAccountId, setSelectedAccountId] = useState('ALL_ACCOUNTS');
  const [searchTerm, setSearchTerm] = useState('');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [viewingAttachment, setViewingAttachment] = useState<{ url: string, title: string } | null>(null);
  const [sortKey, setSortKey] = useState<'date' | 'amount' | 'createdAt'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [visibleCount, setVisibleCount] = useState(30);

  // Bulk selection state
  const [selectedTxIds, setSelectedTxIds] = useState<string[]>([]);

  const observerTargetRef = React.useRef<HTMLDivElement>(null);

  const safeAccounts = useMemo(() => Array.isArray(accounts) ? accounts : [], [accounts]);
  const safeCategories = useMemo(() => Array.isArray(categories) ? categories : [], [categories]);
  const safeTransactions = useMemo(() => Array.isArray(transactions) ? transactions : [], [transactions]);

  const getAccountName = (id?: string) => {
    if (!id) return 'N/A';
    return safeAccounts.find(a => a?.id === id)?.name || 'N/A';
  };

  const getCategoryLabel = (id?: string) => {
    if (!id) return 'Misc';
    return safeCategories.find(c => c?.id === id)?.label || id;
  };

  const filteredTransactions = useMemo(() => {
    let list = [...safeTransactions];

    // Filter by Category/Type
    if (activeFilter !== 'ALL') {
      list = list.filter(t => {
        if (!t) return false;
        if (activeFilter === 'FB_ADS') return t.type === 'EXPENSE' && t.expenseCategory === 'FB_ADS';
        if (activeFilter === 'SHIPPING') return t.type === 'EXPENSE' && t.expenseCategory === 'SHIPPING';
        if (activeFilter === 'PRODUCT') return t.type === 'EXPENSE' && t.expenseCategory === 'PRODUCT';
        if (activeFilter === 'COD_SALES') return t.type === 'INCOME' && t.incomeSource === 'COD';
        if (activeFilter === 'PREPAID_SALES') return t.type === 'INCOME' && t.incomeSource === 'PREPAID';
        if (activeFilter === 'COD_POOL') return t.incomeSource === 'COD';
        if (activeFilter === 'PREPAID_POOL') return t.incomeSource === 'PREPAID';
        if (activeFilter === 'TRANSFER') return t.type === 'TRANSFER';
        if (activeFilter === 'REPAYMENT') return t.type === 'REPAYMENT';
        if (activeFilter === 'WITHDRAWAL') return t.type === 'WITHDRAWAL';
        if (activeFilter === 'OTHER') return t.type === 'EXPENSE' && !['FB_ADS', 'SHIPPING', 'PRODUCT'].includes(t.expenseCategory || '');
        return true;
      });
    }

    // Filter by Tag
    if (selectedTag !== 'ALL_TAGS') {
      list = list.filter(t => t?.tags?.includes(selectedTag));
    }

    // Filter by Account (Fund Flow)
    if (selectedAccountId !== 'ALL_ACCOUNTS') {
      list = list.filter(t => t?.sourceAccountId === selectedAccountId || t?.destinationAccountId === selectedAccountId);
    }

    // Filter by Date
    if (dateFilter !== 'ALL_TIME') {
      const now = new Date();
      const startOfDay = (d: Date) => {
        const nd = new Date(d);
        nd.setHours(0, 0, 0, 0);
        return nd.getTime();
      };
      const endOfDay = (d: Date) => {
        const nd = new Date(d);
        nd.setHours(23, 59, 59, 999);
        return nd.getTime();
      };

      list = list.filter(t => {
        if (!t || !t.date) return false;
        const txTime = typeof t.date === 'number' ? t.date : new Date(t.date).getTime();
        if (isNaN(txTime)) return false;

        switch (dateFilter) {
          case 'TODAY':
            return txTime >= startOfDay(now) && txTime <= endOfDay(now);
          case 'YESTERDAY':
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            return txTime >= startOfDay(yesterday) && txTime <= endOfDay(yesterday);
          case 'MTD':
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            return txTime >= startOfDay(monthStart) && txTime <= endOfDay(now);
          case 'LAST_MONTH':
            const firstOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const lastOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
            return txTime >= startOfDay(firstOfLastMonth) && txTime <= endOfDay(lastOfLastMonth);
          case 'THIS_YEAR':
            const yearStart = new Date(now.getFullYear(), 0, 1);
            return txTime >= startOfDay(yearStart) && txTime <= endOfDay(now);
          case 'LAST_YEAR':
            const lastYearStart = new Date(now.getFullYear() - 1, 0, 1);
            const lastYearEnd = new Date(now.getFullYear() - 1, 11, 31);
            return txTime >= startOfDay(lastYearStart) && txTime <= endOfDay(lastYearEnd);
          case 'CUSTOM':
            if (!customStart || !customEnd) return true;
            return txTime >= startOfDay(new Date(customStart)) && txTime <= endOfDay(new Date(customEnd));
          default:
            return true;
        }
      });
    }

    // Filter by Keyword Search
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      list = list.filter(t => {
        if (!t) return false;
        const descriptionMatch = t.description?.toLowerCase().includes(term);
        const tagsMatch = t.tags?.some(tag => tag.toLowerCase().includes(term));
        const notesMatch = t.notes?.toLowerCase().includes(term);
        const amountMatch = (t.amount ?? '').toString().includes(term);
        const categoryMatch = getCategoryLabel(t.expenseCategory).toLowerCase().includes(term);
        const accountMatch = getAccountName(t.sourceAccountId).toLowerCase().includes(term);

        return descriptionMatch || tagsMatch || notesMatch || amountMatch || categoryMatch || accountMatch;
      });
    }

    // Sorting
    list.sort((a, b) => {
      if (!a || !b) return 0;
      const multiplier = sortOrder === 'asc' ? 1 : -1;
      const aDate = typeof a.date === 'number' ? a.date : new Date(a.date || 0).getTime();
      const bDate = typeof b.date === 'number' ? b.date : new Date(b.date || 0).getTime();

      if (sortKey === 'date') return (aDate - bDate) * multiplier;
      if (sortKey === 'amount') return ((Number(a.amount) || 0) - (Number(b.amount) || 0)) * multiplier;
      if (sortKey === 'createdAt') {
        const aTime = a.createdAt || aDate;
        const bTime = b.createdAt || bDate;
        return (aTime - bTime) * multiplier;
      }
      return 0;
    });

    return list;
  }, [safeTransactions, activeFilter, dateFilter, selectedTag, selectedAccountId, searchTerm, customStart, customEnd, sortKey, sortOrder]);

  const displayedTransactions = useMemo(() => {
    return filteredTransactions.slice(0, visibleCount);
  }, [filteredTransactions, visibleCount]);

  React.useEffect(() => {
    setVisibleCount(30);
  }, [activeFilter, dateFilter, selectedTag, selectedAccountId, searchTerm, sortKey, sortOrder, customStart, customEnd]);

  React.useEffect(() => {
    const target = observerTargetRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0] && entries[0].isIntersecting && filteredTransactions.length > visibleCount) {
          setVisibleCount(prev => Math.min(prev + 40, filteredTransactions.length));
        }
      },
      { threshold: 0.1, rootMargin: '250px' }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [filteredTransactions.length, visibleCount]);

  // Bulk Selection Helpers
  const toggleSelectTx = (id: string) => {
    setSelectedTxIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const isAllVisibleSelected = displayedTransactions.length > 0 && displayedTransactions.every(t => selectedTxIds.includes(t.id));
  const isSomeVisibleSelected = displayedTransactions.some(t => selectedTxIds.includes(t.id)) && !isAllVisibleSelected;

  const toggleSelectAll = () => {
    const visibleIds = displayedTransactions.map(t => t.id);
    if (isAllVisibleSelected) {
      setSelectedTxIds(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      setSelectedTxIds(prev => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const handleBulkDelete = () => {
    if (selectedTxIds.length === 0) return;
    if (window.confirm(`Are you sure you want to delete ${selectedTxIds.length} selected transaction(s)? They will be safely moved to 'Deleted Entries' where you can restore them within 7 days.`)) {
      if (onBulkDelete) {
        onBulkDelete(selectedTxIds);
      } else {
        selectedTxIds.forEach(id => deleteTransaction(id));
      }
      setSelectedTxIds([]);
    }
  };

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    safeTransactions.forEach(t => t?.tags?.forEach(tag => {
      if (tag) tags.add(tag);
    }));
    return Array.from(tags).sort();
  }, [safeTransactions]);

  const filters = [
    { id: 'ALL', label: 'All', icon: Filter },
    { id: 'COD_POOL', label: 'COD Flow', icon: RefreshCw, color: 'text-indigo-600' },
    { id: 'PREPAID_POOL', label: 'Prepaid Flow', icon: RefreshCw, color: 'text-emerald-600' },
    { id: 'FB_ADS', label: 'FB Ads', icon: Facebook, color: 'text-blue-600' },
    { id: 'SHIPPING', label: 'Shipping', icon: Truck, color: 'text-amber-600' },
    { id: 'PRODUCT', label: 'Product', icon: Package, color: 'text-indigo-600' },
    { id: 'TRANSFER', label: 'Transfers', icon: RefreshCw, color: 'text-purple-600' },
    { id: 'REPAYMENT', label: 'Repayments', icon: CreditCard, color: 'text-blue-500' },
    { id: 'WITHDRAWAL', label: 'Profit', icon: PiggyBank, color: 'text-amber-500' },
    { id: 'OTHER', label: 'Others', icon: Landmark, color: 'text-slate-500' },
  ];

  const dateFilters = [
    { id: 'ALL_TIME', label: 'All Time' },
    { id: 'TODAY', label: 'Today' },
    { id: 'YESTERDAY', label: 'Yesterday' },
    { id: 'MTD', label: 'This Month (MTD)' },
    { id: 'LAST_MONTH', label: 'Last Month' },
    { id: 'THIS_YEAR', label: 'This Year' },
    { id: 'LAST_YEAR', label: 'Last Year' },
    { id: 'CUSTOM', label: 'Custom Range' },
  ];

  const compressImage = (base64Str: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.4));
      };
    });
  };

  const handleRowFileChange = (e: React.ChangeEvent<HTMLInputElement>, id: string, field: 'invoiceUrl' | 'paymentProofUrl') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      let dataUrl = reader.result as string;
      if (file.type.startsWith('image/')) {
        dataUrl = await compressImage(dataUrl);
      }
      onUpdate(id, { [field]: dataUrl });
    };
    reader.readAsDataURL(file);
  };

  const getIcon = (t: Transaction) => {
    if (!t) return <Landmark className="text-slate-400" />;
    if (t.type === 'WITHDRAWAL') return <PiggyBank className="text-amber-500" />;
    if (t.type === 'REPAYMENT') return <CreditCard className="text-blue-500" />;
    if (t.type === 'TRANSFER') return <RefreshCw className="text-purple-600" />;
    if (t.type === 'INCOME') return <TrendingUp className="text-emerald-500" />;

    switch (t.expenseCategory) {
      case 'FB_ADS': return <Facebook className="text-blue-600" />;
      case 'SHIPPING': return <Truck className="text-amber-600" />;
      case 'PRODUCT': return <Package className="text-indigo-600" />;
      default: return <Landmark className="text-rose-500" />;
    }
  };

  const toggleSort = (key: 'date' | 'amount' | 'createdAt') => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  };

  const SortIcon = ({ k }: { k: 'date' | 'amount' | 'createdAt' }) => {
    if (sortKey !== k) return <ArrowUpDown size={12} className="opacity-30 group-hover:opacity-100" />;
    return sortOrder === 'asc' ? <ArrowUp size={12} className="text-slate-900" /> : <ArrowDown size={12} className="text-slate-900" />;
  };

  const formatTime = (timestamp?: number) => {
    if (!timestamp || isNaN(timestamp)) return '';
    return new Date(timestamp).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp || isNaN(timestamp)) return 'N/A';
    return new Date(timestamp).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).toUpperCase();
  };

  const formatAmount = (val?: number | string) => {
    const num = Number(val) || 0;
    return num.toLocaleString('en-IN');
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300 pb-20">
      {/* Floating Bulk Actions Bar */}
      {selectedTxIds.length > 0 && (
        <div className="bg-slate-900 text-white rounded-2xl px-5 py-3.5 flex items-center justify-between shadow-lg animate-in slide-in-from-top duration-300 border border-slate-800">
          <div className="flex items-center gap-3">
            <span className="w-6 h-6 rounded-full bg-slate-700 text-white font-bold text-xs flex items-center justify-center">
              {selectedTxIds.length}
            </span>
            <span className="text-xs font-semibold text-slate-200">
              {selectedTxIds.length === 1 ? '1 entry selected' : `${selectedTxIds.length} entries selected`}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedTxIds([])}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Deselect All
            </button>
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all active:scale-95"
            >
              <Trash2 size={14} />
              <span>Bulk Delete ({selectedTxIds.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* Modern SaaS Toolbar & Filters */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3">
        {/* Top Filter Row */}
        <div className="flex flex-col md:flex-row items-center gap-2.5">
          {/* Quick Search */}
          <div className="relative group w-full md:flex-1">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors">
              <Search size={14} strokeWidth={2} />
            </div>
            <input
              type="text"
              placeholder="Search by note, category, account, amount..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-slate-400 transition-all placeholder:text-slate-400"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 bg-slate-200 hover:bg-slate-900 p-0.5 rounded-full text-slate-500 hover:text-white transition-all"
              >
                <X size={10} strokeWidth={3} />
              </button>
            )}
          </div>

          {/* Tag Filter */}
          <div className="relative group w-full md:w-36">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"><Tag size={12} /></div>
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="w-full pl-8 pr-7 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none appearance-none cursor-pointer hover:bg-slate-100/70 focus:bg-white transition-all"
            >
              <option value="ALL_TAGS">All Tags</option>
              {allTags.map(tag => <option key={tag} value={tag}>{tag}</option>)}
            </select>
            <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Account Filter */}
          <div className="relative group w-full md:w-40">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"><Wallet size={12} /></div>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="w-full pl-8 pr-7 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none appearance-none cursor-pointer hover:bg-slate-100/70 focus:bg-white transition-all"
            >
              <option value="ALL_ACCOUNTS">All Accounts</option>
              {safeAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name?.substring(0, 14) || 'Account'}</option>)}
            </select>
            <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Date Filter */}
          <div className="relative group w-full md:w-40">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"><Calendar size={12} /></div>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full pl-8 pr-7 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none appearance-none cursor-pointer hover:bg-slate-100/70 focus:bg-white transition-all"
            >
              {dateFilters.map(df => <option key={df.id} value={df.id}>{df.label}</option>)}
            </select>
            <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Custom Date Inputs */}
        {dateFilter === 'CUSTOM' && (
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 w-fit">
            <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="bg-transparent text-xs font-medium text-slate-700 outline-none" />
            <span className="text-[10px] font-bold text-slate-400">TO</span>
            <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="bg-transparent text-xs font-medium text-slate-700 outline-none" />
          </div>
        )}

        {/* Category Shortcuts */}
        <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar pt-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider hidden md:inline mr-1">Type:</span>
          {filters.map(filter => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap transition-all border text-xs font-semibold ${activeFilter === filter.id
                ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
            >
              <filter.icon size={11} className={activeFilter === filter.id ? 'text-white' : filter.color} />
              <span>{filter.label}</span>
            </button>
          ))}
          {(activeFilter !== 'ALL' || selectedTag !== 'ALL_TAGS' || selectedAccountId !== 'ALL_ACCOUNTS' || searchTerm !== '') && (
            <button onClick={() => { setActiveFilter('ALL'); setSelectedTag('ALL_TAGS'); setSelectedAccountId('ALL_ACCOUNTS'); setSearchTerm(''); }} className="text-xs font-bold text-slate-500 hover:text-slate-900 px-2 flex-shrink-0 underline">
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Desktop Modern SaaS Table */}
      <div className="hidden md:block bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <table className="w-full text-left table-fixed">
          <colgroup>
            <col style={{ width: '36px' }} />
            <col style={{ width: '88px' }} />
            <col style={{ width: '76px' }} />
            <col style={{ width: '180px' }} />
            <col style={{ width: '90px' }} />
            <col style={{ width: '100px' }} />
            <col style={{ width: '110px' }} />
            <col style={{ width: '95px' }} />
            <col style={{ width: '70px' }} />
          </colgroup>
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
            <tr>
              <th className="px-3 py-2 text-center align-middle">
                <input
                  type="checkbox"
                  checked={isAllVisibleSelected}
                  ref={input => { if (input) input.indeterminate = isSomeVisibleSelected; }}
                  onChange={toggleSelectAll}
                  className="w-3.5 h-3.5 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer accent-slate-900"
                  title="Select all displayed transactions"
                />
              </th>
              <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 cursor-pointer group" onClick={() => toggleSort('createdAt')}>
                <div className="flex items-center gap-1">Entered <SortIcon k="createdAt" /></div>
              </th>
              <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 cursor-pointer group" onClick={() => toggleSort('date')}>
                <div className="flex items-center gap-1">Date <SortIcon k="date" /></div>
              </th>
              <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">Details</th>
              <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">Account</th>
              <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">Files</th>
              <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">Tags & Notes</th>
              <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-right cursor-pointer group" onClick={() => toggleSort('amount')}>
                <div className="flex items-center justify-end gap-1">Amount <SortIcon k="amount" /></div>
              </th>
              <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-6 py-16 text-center text-slate-400 font-medium text-xs">
                  No records match the active search/filters.
                </td>
              </tr>
            ) : (
              displayedTransactions.map((t, i) => {
                const isSelected = selectedTxIds.includes(t.id);
                return (
                  <tr key={t.id || `tx-${i}`} className={`transition-colors ${isSelected ? 'bg-slate-100/70' : i % 2 === 0 ? 'bg-white hover:bg-slate-50/80' : 'bg-slate-50/40 hover:bg-slate-50'}`}>
                    {/* Checkbox Column */}
                    <td className="px-3 py-2 text-center align-middle">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectTx(t.id)}
                        className="w-3.5 h-3.5 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer accent-slate-900"
                      />
                    </td>

                    {/* Col 1: Entered At */}
                    <td className="px-3 py-2 align-middle">
                      {t.createdAt ? (
                        <div className="leading-tight">
                          <div className="text-[10px] font-semibold text-slate-600">{new Date(t.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase()}</div>
                          <div className="text-[9px] text-slate-400">{formatTime(t.createdAt)}</div>
                        </div>
                      ) : <span className="text-[10px] text-slate-300">—</span>}
                    </td>

                    {/* Col 2: Tx Date */}
                    <td className="px-3 py-2 align-middle">
                      <div className="text-xs font-semibold text-slate-800 leading-tight">
                        {formatDate(t.date)}
                      </div>
                    </td>

                    {/* Col 3: Details */}
                    <td className="px-3 py-2 align-middle">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-slate-100 rounded-lg flex-shrink-0">{getIcon(t)}</div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-slate-900 leading-tight">
                              {t.type === 'EXPENSE' ? getCategoryLabel(t.expenseCategory)
                                : t.type === 'INCOME' ? (t.incomeSource === 'COD' ? 'COD Sale' : 'Prepaid Sale')
                                  : t.type}
                            </span>
                            {t.incomeSource && (
                              <span className={`flex-shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase leading-tight ${t.incomeSource === 'COD' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : t.incomeSource === 'PREPAID' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                                {t.incomeSource}
                              </span>
                            )}
                          </div>
                          {t.description && (
                            <div className="text-[10px] text-slate-500 truncate mt-0.5">{t.description}</div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Col 4: Account */}
                    <td className="px-3 py-2 align-middle">
                      {(() => {
                        const name = getAccountName(t.sourceAccountId);
                        const logo = getBankLogo(name);
                        return (
                          <div className="flex items-center gap-1.5">
                            {logo ? (
                              <img src={logo.url} alt={name} className="w-4 h-4 rounded object-contain flex-shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                            ) : null}
                            <div>
                              <div className="text-xs font-medium text-slate-700 truncate">{name}</div>
                              {(t.type === 'REPAYMENT' || t.type === 'TRANSFER') && (
                                <div className="text-[9px] text-purple-600 font-bold truncate">→ {getAccountName(t.destinationAccountId)}</div>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </td>

                    {/* Col 5: Attachments */}
                    <td className="px-3 py-2 align-middle">
                      {t.expenseCategory === 'PRODUCT' && (
                        <div className="flex flex-col gap-1">
                          {t.invoiceUrl ? (
                            <div className="flex items-center gap-1">
                              <button onClick={() => setViewingAttachment({ url: t.invoiceUrl!, title: 'Invoice/Bill' })}
                                className="flex items-center gap-1 px-2 py-0.5 bg-indigo-50 border border-indigo-200 rounded text-[9px] font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors">
                                <FileText size={10} /> Bill
                              </button>
                              <button onClick={() => { if (confirm('Remove bill?')) onUpdate(t.id, { invoiceUrl: '' }) }}
                                className="p-0.5 text-slate-400 hover:text-rose-600 transition-colors">
                                <Trash2 size={10} />
                              </button>
                            </div>
                          ) : (
                            <>
                              <input type="file" accept="image/*,application/pdf" onChange={(e) => handleRowFileChange(e, t.id, 'invoiceUrl')} className="hidden" id={`bill-${t.id}`} />
                              <label htmlFor={`bill-${t.id}`} className="flex items-center gap-1 px-2 py-0.5 bg-slate-50 border border-dashed border-slate-300 rounded text-[9px] font-semibold text-slate-500 hover:border-slate-400 hover:text-slate-800 cursor-pointer transition-colors">
                                <FileText size={10} /> + Bill
                              </label>
                            </>
                          )}
                          {t.paymentProofUrl ? (
                            <div className="flex items-center gap-1">
                              <button onClick={() => setViewingAttachment({ url: t.paymentProofUrl!, title: 'Payment Proof' })}
                                className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 border border-emerald-200 rounded text-[9px] font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors">
                                <Check size={10} /> Proof
                              </button>
                              <button onClick={() => { if (confirm('Remove proof?')) onUpdate(t.id, { paymentProofUrl: '' }) }}
                                className="p-0.5 text-slate-400 hover:text-rose-600 transition-colors">
                                <Trash2 size={10} />
                              </button>
                            </div>
                          ) : (
                            <>
                              <input type="file" accept="image/*,application/pdf" onChange={(e) => handleRowFileChange(e, t.id, 'paymentProofUrl')} className="hidden" id={`proof-${t.id}`} />
                              <label htmlFor={`proof-${t.id}`} className="flex items-center gap-1 px-2 py-0.5 bg-slate-50 border border-dashed border-slate-300 rounded text-[9px] font-semibold text-slate-500 hover:border-slate-400 hover:text-slate-800 cursor-pointer transition-colors">
                                <Check size={10} /> + Proof
                              </label>
                            </>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Col 6: Tags & Notes */}
                    <td className="px-3 py-2 align-middle">
                      <div className="space-y-1">
                        {t.tags && t.tags.length > 0 && (
                          <div className="flex flex-wrap gap-0.5">
                            {t.tags.map(tag => (
                              <span key={tag} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[8px] font-semibold rounded border border-slate-200">{tag}</span>
                            ))}
                          </div>
                        )}
                        {t.notes && (
                          <div className="text-[10px] text-slate-500 truncate" title={t.notes}>{t.notes}</div>
                        )}
                      </div>
                    </td>

                    {/* Col 7: Amount */}
                    <td className="px-3 py-2 align-middle text-right">
                      <span className={`font-mono font-bold text-xs tabular-nums ${t.type === 'INCOME' ? 'text-emerald-600' : t.type === 'TRANSFER' ? 'text-purple-600' : 'text-slate-900'}`}>
                        {t.type === 'INCOME' ? '+' : t.type === 'TRANSFER' ? '⇄ ' : '−'}₹{formatAmount(t.amount)}
                      </span>
                    </td>

                    {/* Col 8: Actions */}
                    <td className="px-3 py-2 align-middle text-center">
                      <div className="flex items-center justify-center gap-0.5">
                        <button onClick={() => onDuplicate(t)} className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all" title="Duplicate"><Copy size={13} /></button>
                        <button onClick={() => onEdit(t)} className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all" title="Edit"><Pencil size={13} /></button>
                        <button onClick={() => deleteTransaction(t.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all" title="Move to Deleted Entries (7-day trash)"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile SaaS Card View */}
      <div className="md:hidden space-y-2">
        {filteredTransactions.length === 0 ? (
          <div className="py-16 text-center text-slate-400 font-medium text-xs">No records found.</div>
        ) : (
          displayedTransactions.map((t, i) => {
            const isSelected = selectedTxIds.includes(t.id);
            return (
              <div key={t.id || `mob-tx-${i}`} className={`p-3.5 rounded-2xl border transition-colors ${isSelected ? 'bg-slate-100 border-slate-300' : 'bg-white border-slate-200/80 shadow-xs'}`}>
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelectTx(t.id)}
                    className="mt-1 w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer accent-slate-900"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {t.type === 'EXPENSE' ? getCategoryLabel(t.expenseCategory) : t.type === 'INCOME' ? (t.incomeSource === 'COD' ? 'COD Sale' : 'Prepaid Sale') : t.type}
                        </p>
                        {t.incomeSource && (
                          <div className="mt-0.5">
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase border ${t.incomeSource === 'COD' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                              t.incomeSource === 'PREPAID' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                'bg-slate-100 text-slate-600 border-slate-200'
                              }`}>
                              {t.incomeSource}
                            </span>
                          </div>
                        )}
                      </div>
                      <p className={`font-mono font-bold text-xs ${t.type === 'INCOME' ? 'text-emerald-600' : 'text-slate-900'}`}>
                        {t.type === 'INCOME' ? '+' : '-'}₹{formatAmount(t.amount)}
                      </p>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <div className="flex flex-col min-w-0 flex-1 pr-2">
                        <p className="text-[10px] text-slate-500 font-medium truncate">{t.description || 'Manual'}</p>
                        {t.tags && t.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {t.tags.map(tag => (
                              <span key={tag} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[8px] font-medium rounded border border-slate-200">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end flex-shrink-0">
                        <p className="text-[9px] text-slate-500 font-medium">{formatDate(t.date)}</p>
                        <p className="text-[9px] text-slate-400 font-semibold">{getAccountName(t.sourceAccountId).split(' ')[0]}</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex justify-between items-center mt-3 pt-2.5 border-t border-slate-100">
                  <div className="flex gap-2">
                    {t.expenseCategory === 'PRODUCT' && (
                      <>
                        {!t.invoiceUrl ? (
                          <div className="relative">
                            <input type="file" accept="image/*,application/pdf" onChange={(e) => handleRowFileChange(e, t.id, 'invoiceUrl')} className="hidden" id={`mob-bill-${t.id}`} />
                            <label htmlFor={`mob-bill-${t.id}`} className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[9px] font-semibold text-slate-600 cursor-pointer">Attach Bill</label>
                          </div>
                        ) : (
                          <button onClick={() => setViewingAttachment({ url: t.invoiceUrl!, title: 'Invoice/Bill' })} className="px-2.5 py-1 bg-indigo-50 border border-indigo-200 rounded-lg text-[9px] font-semibold text-indigo-700">View Bill</button>
                        )}
                        {!t.paymentProofUrl ? (
                          <div className="relative">
                            <input type="file" accept="image/*,application/pdf" onChange={(e) => handleRowFileChange(e, t.id, 'paymentProofUrl')} className="hidden" id={`mob-proof-${t.id}`} />
                            <label htmlFor={`mob-proof-${t.id}`} className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[9px] font-semibold text-slate-600 cursor-pointer">Attach Proof</label>
                          </div>
                        ) : (
                          <button onClick={() => setViewingAttachment({ url: t.paymentProofUrl!, title: 'Payment Proof' })} className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-lg text-[9px] font-semibold text-emerald-700">View Proof</button>
                        )}
                      </>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => onDuplicate(t)} className="p-1.5 text-slate-400 hover:text-slate-900"><Copy size={14} /></button>
                    <button onClick={() => onEdit(t)} className="p-1.5 text-slate-400 hover:text-slate-900"><Pencil size={14} /></button>
                    <button onClick={() => deleteTransaction(t.id)} className="p-1.5 text-slate-400 hover:text-rose-600"><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Infinite Scroll / Sentinel */}
      {filteredTransactions.length > visibleCount && (
        <div ref={observerTargetRef} className="flex flex-col items-center justify-center py-6 gap-2">
          <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-slate-200 shadow-xs text-slate-600">
            <RefreshCw size={14} className="animate-spin text-slate-900" />
            <span className="text-xs font-semibold">
              Loading entries... ({displayedTransactions.length} of {filteredTransactions.length.toLocaleString()})
            </span>
          </div>
          <button
            onClick={() => setVisibleCount(filteredTransactions.length)}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 hover:underline mt-1 cursor-pointer"
          >
            Show All ({filteredTransactions.length.toLocaleString()})
          </button>
        </div>
      )}

      {/* Attachment Preview Modal */}
      {viewingAttachment && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[1000] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">{viewingAttachment.title}</h3>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Business Document</p>
              </div>
              <button
                onClick={() => setViewingAttachment(null)}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-hidden bg-slate-50 flex items-center justify-center relative">
              {viewingAttachment.url.startsWith('data:application/pdf') ? (
                <iframe
                  src={viewingAttachment.url}
                  className="w-full h-full border-none"
                  title={viewingAttachment.title}
                />
              ) : (
                <div className="p-4 overflow-auto flex items-center justify-center w-full h-full">
                  <img
                    src={viewingAttachment.url}
                    alt={viewingAttachment.title}
                    className="max-w-full max-h-full h-auto rounded-xl shadow-xs border border-slate-200 object-contain"
                  />
                </div>
              )}
            </div>
            <div className="p-4 border-t border-slate-200 bg-white">
              <button
                onClick={() => setViewingAttachment(null)}
                className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold uppercase tracking-wider text-xs hover:bg-black transition-all"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const HistoryList: React.FC<Props> = (props) => (
  <HistoryErrorBoundary>
    <HistoryListContent {...props} />
  </HistoryErrorBoundary>
);

export default HistoryList;