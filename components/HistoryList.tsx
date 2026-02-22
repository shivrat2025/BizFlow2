import React, { useState, useMemo } from 'react';
import { Trash2, TrendingUp, TrendingDown, PiggyBank, Package, Truck, Facebook, CreditCard, Landmark, ArrowRight, Tag, FileText, Pencil, Filter, Calendar, ChevronDown, Clock, Copy, Search, Check, X, Wallet, ArrowUpDown, ArrowUp, ArrowDown, AlertCircle, RefreshCw } from 'lucide-react';
import { Transaction, Account, ExpenseCategory } from '../types';

interface Props {
  transactions: Transaction[];
  deleteTransaction: (id: string) => void;
  onEdit: (tx: Transaction) => void;
  onDuplicate: (tx: Transaction) => void;
  accounts: Account[];
  categories: ExpenseCategory[];
  onUpdate: (id: string, updates: Partial<Transaction>) => void;
}

const HistoryList: React.FC<Props> = ({ transactions, deleteTransaction, onEdit, onDuplicate, accounts, categories, onUpdate }) => {
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('ALL_TIME');
  const [selectedTag, setSelectedTag] = useState('ALL_TAGS');
  const [selectedAccountId, setSelectedAccountId] = useState('ALL_ACCOUNTS');
  const [searchTerm, setSearchTerm] = useState('');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [viewingAttachment, setViewingAttachment] = useState<{ url: string, title: string } | null>(null);
  const [sortKey, setSortKey] = useState<'date' | 'amount' | 'createdAt'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    transactions.forEach(t => t.tags?.forEach(tag => tags.add(tag)));
    return Array.from(tags).sort();
  }, [transactions]);

  const filters = [
    { id: 'ALL', label: 'All', icon: Filter },
    { id: 'COD_POOL', label: 'COD Flow', icon: RefreshCw, color: 'text-indigo-600' },
    { id: 'PREPAID_POOL', label: 'Prepaid Flow', icon: RefreshCw, color: 'text-emerald-600' },
    { id: 'FB_ADS', label: 'FB Ads', icon: Facebook, color: 'text-blue-600' },
    { id: 'SHIPPING', label: 'Shipping', icon: Truck, color: 'text-amber-600' },
    { id: 'PRODUCT', label: 'Product', icon: Package, color: 'text-indigo-600' },
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

  const getAccountName = (id?: string) => {
    return accounts.find(a => a.id === id)?.name || 'N/A';
  };

  const getCategoryLabel = (id?: string) => {
    if (!id) return 'Misc';
    return categories.find(c => c.id === id)?.label || id;
  };

  const filteredTransactions = useMemo(() => {
    let list = [...transactions];

    // Filter by Category/Type
    if (activeFilter !== 'ALL') {
      list = list.filter(t => {
        if (activeFilter === 'FB_ADS') return t.type === 'EXPENSE' && t.expenseCategory === 'FB_ADS';
        if (activeFilter === 'SHIPPING') return t.type === 'EXPENSE' && t.expenseCategory === 'SHIPPING';
        if (activeFilter === 'PRODUCT') return t.type === 'EXPENSE' && t.expenseCategory === 'PRODUCT';
        if (activeFilter === 'COD_SALES') return t.type === 'INCOME' && t.incomeSource === 'COD';
        if (activeFilter === 'PREPAID_SALES') return t.type === 'INCOME' && t.incomeSource === 'PREPAID';
        if (activeFilter === 'COD_POOL') return t.incomeSource === 'COD';
        if (activeFilter === 'PREPAID_POOL') return t.incomeSource === 'PREPAID';
        if (activeFilter === 'REPAYMENT') return t.type === 'REPAYMENT';
        if (activeFilter === 'WITHDRAWAL') return t.type === 'WITHDRAWAL';
        if (activeFilter === 'OTHER') return t.type === 'EXPENSE' && !['FB_ADS', 'SHIPPING', 'PRODUCT'].includes(t.expenseCategory || '');
        return true;
      });
    }

    // Filter by Tag
    if (selectedTag !== 'ALL_TAGS') {
      list = list.filter(t => t.tags?.includes(selectedTag));
    }

    // Filter by Account (Fund Flow)
    if (selectedAccountId !== 'ALL_ACCOUNTS') {
      list = list.filter(t => t.sourceAccountId === selectedAccountId || t.destinationAccountId === selectedAccountId);
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
        const txTime = t.date;

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
        const descriptionMatch = t.description?.toLowerCase().includes(term);
        const tagsMatch = t.tags?.some(tag => tag.toLowerCase().includes(term));
        const notesMatch = t.notes?.toLowerCase().includes(term);
        const amountMatch = t.amount.toString().includes(term);
        const categoryMatch = getCategoryLabel(t.expenseCategory).toLowerCase().includes(term);
        const accountMatch = getAccountName(t.sourceAccountId).toLowerCase().includes(term);

        return descriptionMatch || tagsMatch || notesMatch || amountMatch || categoryMatch || accountMatch;
      });
    }

    // Sorting
    list.sort((a, b) => {
      const multiplier = sortOrder === 'asc' ? 1 : -1;
      if (sortKey === 'date') return (a.date - b.date) * multiplier;
      if (sortKey === 'amount') return (a.amount - b.amount) * multiplier;
      if (sortKey === 'createdAt') {
        const aTime = a.createdAt || a.date;
        const bTime = b.createdAt || b.date;
        return (aTime - bTime) * multiplier;
      }
      return 0;
    });

    return list;
  }, [transactions, activeFilter, dateFilter, selectedTag, selectedAccountId, searchTerm, customStart, customEnd, sortKey, sortOrder]);

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
    if (t.type === 'WITHDRAWAL') return <PiggyBank className="text-amber-500" />;
    if (t.type === 'REPAYMENT') return <CreditCard className="text-blue-500" />;
    if (t.type === 'INCOME') return <TrendingUp className="text-green-500" />;

    switch (t.expenseCategory) {
      case 'FB_ADS': return <Facebook className="text-blue-600" />;
      case 'SHIPPING': return <Truck className="text-amber-600" />;
      case 'PRODUCT': return <Package className="text-indigo-600" />;
      default: return <Landmark className="text-red-500" />;
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
    return sortOrder === 'asc' ? <ArrowUp size={12} className="text-indigo-600" /> : <ArrowDown size={12} className="text-indigo-600" />;
  };

  const formatTime = (timestamp?: number) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).toUpperCase();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="bg-white/70 backdrop-blur-xl rounded-[2rem] p-5 md:p-6 border border-white/40 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-5">
        {/* Top Row: Global Search (Compact) */}
        <div className="flex justify-center">
          <div className="relative group w-full max-w-xl">
            <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-all duration-300">
              <Search size={18} strokeWidth={2.5} />
            </div>
            <input
              type="text"
              placeholder="Quick search ledger..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-12 py-3 bg-white/50 border border-white/50 rounded-2xl text-[13px] font-bold text-slate-700 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 focus:bg-white/80 transition-all duration-300 shadow-inner placeholder:text-slate-400 backdrop-blur-md"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-slate-200 hover:bg-slate-900 p-1.5 rounded-full text-slate-500 hover:text-white transition-all duration-200 shadow-sm"
                title="Clear"
              >
                <X size={12} strokeWidth={3} />
              </button>
            )}
          </div>
        </div>

        {/* Middle Row: Category Shortcuts (Horizontal Scroll) */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Quick Filters</span>
            {(activeFilter !== 'ALL' || selectedTag !== 'ALL_TAGS' || selectedAccountId !== 'ALL_ACCOUNTS') && (
              <button
                onClick={() => {
                  setActiveFilter('ALL');
                  setSelectedTag('ALL_TAGS');
                  setSelectedAccountId('ALL_ACCOUNTS');
                }}
                className="text-[9px] font-black text-indigo-500 uppercase tracking-widest hover:underline"
              >
                Clear All
              </button>
            )}
          </div>
          <div className="overflow-x-auto hide-scrollbar -mx-2 px-2">
            <div className="flex items-center gap-2 min-w-max pb-1">
              {filters.map(filter => (
                <button
                  key={filter.id}
                  onClick={() => setActiveFilter(filter.id)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl whitespace-nowrap transition-all border ${activeFilter === filter.id
                    ? 'bg-gradient-to-r from-slate-900 to-slate-800 border-slate-900 text-white shadow-lg shadow-slate-900/20 scale-[1.02]'
                    : 'bg-white/50 border-white/60 text-slate-600 hover:bg-white/70 hover:border-white/80 backdrop-blur-md'
                    }`}
                >
                  <filter.icon size={12} className={activeFilter === filter.id ? 'text-white' : filter.color} />
                  <span className="text-[10px] font-black uppercase tracking-tight">{filter.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Row: Date & Tag Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-50">
          {/* Tag Filter */}
          <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              <Tag size={13} />
            </div>
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="w-full pl-10 pr-10 py-3.5 bg-white/50 border border-white/50 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-700 outline-none appearance-none cursor-pointer hover:bg-white/70 transition-all backdrop-blur-md"
            >
              <option value="ALL_TAGS">All Tags</option>
              {allTags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Account Filter (Fund Flow) */}
          <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              <Wallet size={13} />
            </div>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="w-full pl-10 pr-10 py-3.5 bg-white/50 border border-white/50 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-700 outline-none appearance-none cursor-pointer hover:bg-white/70 transition-all backdrop-blur-md"
            >
              <option value="ALL_ACCOUNTS">All Accounts</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.name}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Date Range Picker */}
          <div className="relative group lg:col-span-1">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              <Calendar size={14} />
            </div>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full pl-11 pr-10 py-3.5 bg-white/50 border border-white/50 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-700 outline-none appearance-none cursor-pointer hover:bg-white/70 transition-all backdrop-blur-md"
            >
              {dateFilters.map(df => (
                <option key={df.id} value={df.id}>{df.label}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Custom Date Inputs (Conditional) */}
          {dateFilter === 'CUSTOM' && (
            <div className="lg:col-span-2 flex items-center bg-slate-50 border border-slate-100 rounded-2xl px-4 py-2 hover:bg-white hover:border-slate-200 transition-all">
              <div className="flex-1 flex flex-col">
                <span className="text-[7px] font-black text-slate-400 uppercase leading-none mb-1">Start Date</span>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="bg-transparent text-[10px] font-bold text-slate-600 outline-none w-full"
                />
              </div>
              <div className="w-px h-6 bg-slate-200 mx-4" />
              <div className="flex-1 flex flex-col">
                <span className="text-[7px] font-black text-slate-400 uppercase leading-none mb-1">End Date</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="bg-transparent text-[10px] font-bold text-slate-600 outline-none w-full"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white/70 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-white/50 text-slate-500 text-[10px] uppercase tracking-widest font-black border-b border-white/40">
              <tr>
                <th className="px-6 py-4 cursor-pointer group" onClick={() => toggleSort(sortKey === 'createdAt' ? 'date' : 'createdAt')}>
                  <div className="flex items-center gap-1">
                    {sortKey === 'createdAt' ? 'Entry Time' : 'Date'} <SortIcon k={sortKey === 'createdAt' ? 'createdAt' : 'date'} />
                  </div>
                </th>
                <th className="px-6 py-4">Details</th>
                <th className="px-6 py-4">Fund Flow</th>
                <th className="px-6 py-4 text-center">Attachments</th>
                <th className="px-6 py-4">Tags & Notes</th>
                <th className="px-6 py-4 text-right cursor-pointer group" onClick={() => toggleSort('amount')}>
                  <div className="flex items-center justify-end gap-1">
                    Amount <SortIcon k="amount" />
                  </div>
                </th>
                <th className="px-6 py-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-300 font-bold uppercase tracking-widest text-[10px]">
                    No records found for selected filters.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map(t => (
                  <tr key={t.id} className="hover:bg-white/60 transition-colors border-b border-gray-50/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-400">{formatDate(t.date)}</span>
                        {t.createdAt && (
                          <span className="text-[8px] text-slate-300 font-medium tracking-tight mt-0.5">Entered at {formatTime(t.createdAt)}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-50 rounded-xl">{getIcon(t)}</div>
                        <div>
                          <p className="font-black text-slate-800 text-xs uppercase tracking-tight">
                            {t.type === 'EXPENSE' ? getCategoryLabel(t.expenseCategory) :
                              t.type === 'INCOME' ? (t.incomeSource === 'COD' ? 'COD Sale' : 'Prepaid Sale') :
                                t.type}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {t.incomeSource && (
                              <span className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase ring-1 ring-inset ${t.incomeSource === 'COD' ? 'bg-indigo-50 text-indigo-600 ring-indigo-200' :
                                t.incomeSource === 'PREPAID' ? 'bg-emerald-50 text-emerald-600 ring-emerald-200' :
                                  'bg-slate-50 text-slate-500 ring-slate-200'
                                }`}>
                                {t.incomeSource}
                              </span>
                            )}
                            <span className="text-[9px] text-slate-400 truncate max-w-[100px]">
                              {t.description || 'No description'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[10px] font-bold text-slate-500">
                      {getAccountName(t.sourceAccountId)}
                      {t.type === 'REPAYMENT' && (
                        <span className="ml-1 text-slate-300 font-normal">→ {getAccountName(t.destinationAccountId)}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {t.expenseCategory === 'PRODUCT' && (
                        <div className="flex flex-col gap-2 min-w-[150px]">
                          {t.invoiceUrl ? (
                            <div className="flex items-center gap-1">
                              <button onClick={() => setViewingAttachment({ url: t.invoiceUrl!, title: 'Invoice/Bill' })} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-lg text-[8px] font-black uppercase text-indigo-600 hover:bg-indigo-100 transition-all">
                                <FileText size={10} /> View Bill
                              </button>
                              <button onClick={() => { if (confirm('Remove this bill?')) onUpdate(t.id, { invoiceUrl: '' }) }} className="p-1.5 bg-rose-50 border border-rose-100 rounded-lg text-rose-500 hover:bg-rose-100 transition-all">
                                <Trash2 size={10} />
                              </button>
                            </div>
                          ) : (
                            <div className="relative">
                              <input type="file" accept="image/*,application/pdf" onChange={(e) => handleRowFileChange(e, t.id, 'invoiceUrl')} className="hidden" id={`bill-${t.id}`} />
                              <label htmlFor={`bill-${t.id}`} className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white/50 border border-indigo-100/30 rounded-lg text-[8px] font-black uppercase text-slate-500 hover:bg-white hover:border-indigo-200 hover:text-indigo-500 cursor-pointer transition-all">
                                <FileText size={10} /> Attach Bill
                              </label>
                            </div>
                          )}

                          {t.paymentProofUrl ? (
                            <div className="flex items-center gap-1">
                              <button onClick={() => setViewingAttachment({ url: t.paymentProofUrl!, title: 'Payment Proof' })} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-lg text-[8px] font-black uppercase text-emerald-600 hover:bg-emerald-100 transition-all">
                                <Check size={10} /> View Proof
                              </button>
                              <button onClick={() => { if (confirm('Remove this proof?')) onUpdate(t.id, { paymentProofUrl: '' }) }} className="p-1.5 bg-rose-50 border border-rose-100 rounded-lg text-rose-500 hover:bg-rose-100 transition-all">
                                <Trash2 size={10} />
                              </button>
                            </div>
                          ) : (
                            <div className="relative">
                              <input type="file" accept="image/*,application/pdf" onChange={(e) => handleRowFileChange(e, t.id, 'paymentProofUrl')} className="hidden" id={`proof-${t.id}`} />
                              <label htmlFor={`proof-${t.id}`} className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white/50 border border-indigo-100/30 rounded-lg text-[8px] font-black uppercase text-slate-500 hover:bg-white hover:border-emerald-200 hover:text-emerald-500 cursor-pointer transition-all">
                                <Check size={10} /> Attach Proof
                              </label>
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1.5 max-w-[200px]">
                        {t.tags && t.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {t.tags.map(tag => (
                              <span key={tag} className="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[8px] font-bold uppercase rounded-md border border-slate-200">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        {t.notes && (
                          <div className="text-[9px] text-slate-400 font-medium italic truncate" title={t.notes}>
                            "{t.notes}"
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`font-mono font-black text-sm ${(t.type === 'INCOME') ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {(t.type === 'INCOME') ? '+' : '-'}₹{t.amount.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => onDuplicate(t)} className="p-2 text-slate-300 hover:text-green-600" title="Duplicate"><Copy size={16} /></button>
                        <button onClick={() => onEdit(t)} className="p-2 text-slate-300 hover:text-indigo-600"><Pencil size={16} /></button>
                        <button onClick={() => deleteTransaction(t.id)} className="p-2 text-slate-300 hover:text-red-500"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-2">
        {filteredTransactions.length === 0 ? (
          <div className="py-20 text-center text-slate-300 font-black uppercase tracking-widest text-[10px]">No records found.</div>
        ) : (
          filteredTransactions.map(t => (
            <div key={t.id} className="bg-white/70 backdrop-blur-xl px-4 py-3 rounded-2xl border border-white/40 shadow-sm active:bg-white/80 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-50 rounded-xl flex-shrink-0">
                  {getIcon(t)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col">
                      <p className="text-[11px] font-black text-slate-800 uppercase tracking-tight truncate">
                        {t.type === 'EXPENSE' ? getCategoryLabel(t.expenseCategory) : t.type === 'INCOME' ? (t.incomeSource === 'COD' ? 'COD Sale' : 'Prepaid Sale') : t.type}
                      </p>
                      {t.incomeSource && (
                        <div className="mt-0.5">
                          <span className={`px-1 py-0.5 rounded-[4px] text-[6px] font-black uppercase ring-1 ring-inset ${t.incomeSource === 'COD' ? 'bg-indigo-50 text-indigo-600 ring-indigo-200' :
                            t.incomeSource === 'PREPAID' ? 'bg-emerald-50 text-emerald-600 ring-emerald-200' :
                              'bg-slate-50 text-slate-500 ring-slate-200'
                            }`}>
                            {t.incomeSource}
                          </span>
                        </div>
                      )}
                    </div>
                    <p className={`font-mono font-black text-xs ${(t.type === 'INCOME') ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {(t.type === 'INCOME') ? '+' : '-'}₹{t.amount.toLocaleString()}
                    </p>
                  </div>
                  <div className="flex justify-between items-center mt-0.5">
                    <div className="flex flex-col min-w-0 flex-1 pr-2">
                      <p className="text-[9px] text-slate-400 font-bold uppercase truncate">{t.description || 'Manual'}</p>
                      {t.tags && t.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {t.tags.map(tag => (
                            <span key={tag} className="px-1 py-0.5 bg-white/50 text-slate-500 text-[7px] font-black uppercase rounded-md border border-white/60">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end flex-shrink-0">
                      <div className="flex flex-col items-end">
                        <p className="text-[8px] text-slate-400 font-bold">{formatDate(t.date)}</p>
                        {t.createdAt && <p className="text-[7px] text-slate-300 font-medium">At {formatTime(t.createdAt)}</p>}
                      </div>
                      <p className="text-[8px] text-slate-300 font-black uppercase tracking-widest">{getAccountName(t.sourceAccountId).split(' ')[0]}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-50">
                <div className="flex gap-2">
                  {t.expenseCategory === 'PRODUCT' && (
                    <>
                      {!t.invoiceUrl ? (
                        <div className="relative">
                          <input type="file" accept="image/*,application/pdf" onChange={(e) => handleRowFileChange(e, t.id, 'invoiceUrl')} className="hidden" id={`mob-bill-${t.id}`} />
                          <label htmlFor={`mob-bill-${t.id}`} className="px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg text-[8px] font-black uppercase text-slate-400">Attach Bill</label>
                        </div>
                      ) : (
                        <button onClick={() => setViewingAttachment({ url: t.invoiceUrl!, title: 'Invoice/Bill' })} className="px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-lg text-[8px] font-black uppercase text-indigo-600 font-black uppercase tracking-widest">View Bill</button>
                      )}
                      {!t.paymentProofUrl ? (
                        <div className="relative">
                          <input type="file" accept="image/*,application/pdf" onChange={(e) => handleRowFileChange(e, t.id, 'paymentProofUrl')} className="hidden" id={`mob-proof-${t.id}`} />
                          <label htmlFor={`mob-proof-${t.id}`} className="px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg text-[8px] font-black uppercase text-slate-400">Attach Proof</label>
                        </div>
                      ) : (
                        <button onClick={() => setViewingAttachment({ url: t.paymentProofUrl!, title: 'Payment Proof' })} className="px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-lg text-[8px] font-black uppercase text-emerald-600 font-black uppercase tracking-widest">View Proof</button>
                      )}
                    </>
                  )}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => onDuplicate(t)} className="p-2 text-slate-200 hover:text-green-500"><Copy size={16} /></button>
                  <button onClick={() => onEdit(t)} className="p-2 text-slate-200 hover:text-indigo-500"><Pencil size={16} /></button>
                  <button onClick={() => deleteTransaction(t.id)} className="p-2 text-slate-200 hover:text-red-500"><Trash2 size={16} /></button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Attachment Preview Modal */}
      {viewingAttachment && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[1000] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-800 tracking-tight">{viewingAttachment.title}</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Business Verification Document</p>
              </div>
              <button
                onClick={() => setViewingAttachment(null)}
                className="p-3 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-red-500 rounded-2xl transition-all"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-hidden bg-slate-50 flex items-center justify-center relative">
              {viewingAttachment.url.startsWith('data:application/pdf') ? (
                <iframe
                  src={viewingAttachment.url}
                  className="w-full h-full border-none shadow-inner"
                  title={viewingAttachment.title}
                />
              ) : (
                <div className="p-4 overflow-auto flex items-center justify-center w-full h-full">
                  <img
                    src={viewingAttachment.url}
                    alt={viewingAttachment.title}
                    className="max-w-full max-h-full h-auto rounded-xl shadow-lg border border-slate-200 object-contain"
                  />
                </div>
              )}
            </div>
            <div className="p-6 border-t border-slate-100 bg-white">
              <button
                onClick={() => setViewingAttachment(null)}
                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-black transition-all"
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

export default HistoryList;