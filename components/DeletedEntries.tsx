import React, { useState, useMemo } from 'react';
import { Trash2, RotateCcw, Search, AlertCircle, CheckSquare, Square, ShieldAlert, ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Clock, Check } from 'lucide-react';
import { DeletedTransaction, Account, ExpenseCategory } from '../types';

interface DeletedEntriesProps {
  deletedTransactions: DeletedTransaction[];
  accounts: Account[];
  categories: ExpenseCategory[];
  onRestore: (txId: string) => void;
  onBulkRestore: (txIds: string[]) => void;
  onPermanentDelete: (txId: string) => void;
  onEmptyTrash: () => void;
}

export const DeletedEntries: React.FC<DeletedEntriesProps> = ({
  deletedTransactions = [],
  accounts = [],
  categories = [],
  onRestore,
  onBulkRestore,
  onPermanentDelete,
  onEmptyTrash
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const safeAccounts = useMemo(() => Array.isArray(accounts) ? accounts : [], [accounts]);
  const safeCategories = useMemo(() => Array.isArray(categories) ? categories : [], [categories]);

  const getAccountName = (id?: string) => {
    if (!id) return '—';
    return safeAccounts.find(a => a.id === id)?.name || id;
  };

  const getCategoryLabel = (id?: string) => {
    if (!id) return 'Misc';
    return safeCategories.find(c => c.id === id)?.label || id;
  };

  const getTimeRemaining = (deletedAt: number) => {
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    const expiresAt = deletedAt + SEVEN_DAYS_MS;
    const diff = expiresAt - Date.now();
    if (diff <= 0) return { label: 'Expiring today', urgent: true };
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    if (days > 0) return { label: `${days}d ${hours}h left`, urgent: days <= 1 };
    return { label: `${hours}h left`, urgent: true };
  };

  const filteredEntries = useMemo(() => {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return deletedTransactions
      .filter(t => (t.deletedAt || t.date) >= sevenDaysAgo)
      .filter(t => {
        if (typeFilter !== 'ALL' && t.type !== typeFilter) return false;
        if (!searchTerm.trim()) return true;
        const q = searchTerm.toLowerCase();
        const desc = (t.description || '').toLowerCase();
        const acc = getAccountName(t.sourceAccountId).toLowerCase();
        const cat = getCategoryLabel(t.expenseCategory).toLowerCase();
        const amt = String(t.amount);
        return desc.includes(q) || acc.includes(q) || cat.includes(q) || amt.includes(q);
      })
      .sort((a, b) => (b.deletedAt || b.date) - (a.deletedAt || a.date));
  }, [deletedTransactions, searchTerm, typeFilter, safeAccounts, safeCategories]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredEntries.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredEntries.map(t => t.id));
    }
  };

  const handleSingleRestore = async (id: string) => {
    setRestoringId(id);
    await onRestore(id);
    setSelectedIds(prev => prev.filter(item => item !== id));
    setRestoringId(null);
  };

  const handleBulkRestoreClick = () => {
    if (selectedIds.length === 0) return;
    onBulkRestore(selectedIds);
    setSelectedIds([]);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300 pb-12">
      
      {/* Top Banner / Retention Info */}
      <div className="bg-slate-50 border border-slate-200 p-4 md:p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-start md:items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center flex-shrink-0 border border-rose-100">
            <Trash2 size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 tracking-tight">Deleted Entries (Last 7 Days)</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-200/80 text-slate-700">
                {filteredEntries.length} Items
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Accidentally deleted transactions are stored here for 7 days. You can restore them anytime back into your active ledger.
            </p>
          </div>
        </div>

        {filteredEntries.length > 0 && (
          <div className="flex items-center gap-2 self-end md:self-auto">
            <button
              onClick={() => {
                if (window.confirm(`Restore all ${filteredEntries.length} deleted transactions back to ledger?`)) {
                  onBulkRestore(filteredEntries.map(t => t.id));
                  setSelectedIds([]);
                }
              }}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
            >
              <RotateCcw size={14} />
              <span>Restore All</span>
            </button>
            <button
              onClick={() => {
                if (window.confirm("Permanently empty all entries in trash? This cannot be undone.")) {
                  onEmptyTrash();
                  setSelectedIds([]);
                }
              }}
              className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-600 hover:text-rose-600 rounded-xl text-xs font-bold transition-all shadow-xs"
            >
              <Trash2 size={14} />
              <span className="hidden sm:inline">Empty Trash</span>
            </button>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-2 justify-between items-stretch sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search deleted entries by description, account, category, or amount..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-xs"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 overflow-x-auto">
          {['ALL', 'EXPENSE', 'INCOME', 'TRANSFER', 'REPAYMENT'].map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                typeFilter === t
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Floating Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <div className="bg-slate-900 text-white p-3 px-4 rounded-xl flex items-center justify-between shadow-lg animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2">
            <CheckSquare size={16} className="text-emerald-400" />
            <span className="text-xs font-bold">{selectedIds.length} item(s) selected</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleBulkRestoreClick}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all"
            >
              <RotateCcw size={14} />
              Restore Selected ({selectedIds.length})
            </button>
            <button
              onClick={() => {
                if (window.confirm(`Permanently delete ${selectedIds.length} item(s)?`)) {
                  selectedIds.forEach(id => onPermanentDelete(id));
                  setSelectedIds([]);
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600/80 hover:bg-rose-600 text-white rounded-lg text-xs font-bold transition-all"
            >
              <Trash2 size={14} />
              Purge
            </button>
          </div>
        </div>
      )}

      {/* Entries List / Table */}
      {filteredEntries.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
            <Trash2 size={24} />
          </div>
          <h4 className="text-base font-bold text-slate-800 mb-1">Trash is Empty</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchTerm || typeFilter !== 'ALL' 
              ? 'No deleted entries match your current search or type filter.' 
              : 'There are no deleted transactions in the last 7 days. Everything you delete will be safely kept here for 7 days.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <th className="p-3.5 pl-4 w-10">
                    <button 
                      onClick={toggleSelectAll} 
                      className="text-slate-400 hover:text-slate-700"
                    >
                      {selectedIds.length === filteredEntries.length && filteredEntries.length > 0 ? (
                        <CheckSquare size={16} className="text-indigo-600" />
                      ) : (
                        <Square size={16} />
                      )}
                    </button>
                  </th>
                  <th className="p-3.5">Date & Time</th>
                  <th className="p-3.5">Description</th>
                  <th className="p-3.5">Account / Category</th>
                  <th className="p-3.5 text-right">Amount</th>
                  <th className="p-3.5 text-center">Expires In</th>
                  <th className="p-3.5 text-right pr-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredEntries.map(tx => {
                  const remaining = getTimeRemaining(tx.deletedAt || tx.date);
                  const isSelected = selectedIds.includes(tx.id);
                  const isIncome = tx.type === 'INCOME';
                  const isExpense = tx.type === 'EXPENSE';

                  return (
                    <tr 
                      key={tx.id} 
                      className={`hover:bg-slate-50/70 transition-colors ${isSelected ? 'bg-indigo-50/30' : ''}`}
                    >
                      {/* Checkbox */}
                      <td className="p-3.5 pl-4">
                        <button 
                          onClick={() => toggleSelect(tx.id)}
                          className="text-slate-400 hover:text-slate-700"
                        >
                          {isSelected ? (
                            <CheckSquare size={16} className="text-indigo-600" />
                          ) : (
                            <Square size={16} />
                          )}
                        </button>
                      </td>

                      {/* Date */}
                      <td className="p-3.5 whitespace-nowrap">
                        <div className="font-bold text-slate-900">
                          {new Date(tx.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Clock size={10} />
                          <span>Deleted {new Date(tx.deletedAt || tx.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                        </div>
                      </td>

                      {/* Description & Type Badge */}
                      <td className="p-3.5 max-w-xs">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                            isIncome ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            isExpense ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                            'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}>
                            {tx.type}
                          </span>
                          <span className="font-semibold text-slate-900 truncate" title={tx.description}>
                            {tx.description || '—'}
                          </span>
                        </div>
                        {tx.notes && (
                          <p className="text-[10px] text-slate-400 truncate mt-0.5">{tx.notes}</p>
                        )}
                      </td>

                      {/* Account & Category */}
                      <td className="p-3.5 whitespace-nowrap">
                        <div className="font-medium text-slate-800">
                          {getAccountName(tx.sourceAccountId)}
                          {tx.destinationAccountId && ` → ${getAccountName(tx.destinationAccountId)}`}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {getCategoryLabel(tx.expenseCategory)}
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="p-3.5 text-right whitespace-nowrap">
                        <span className={`font-black text-sm ${
                          isIncome ? 'text-emerald-600' :
                          isExpense ? 'text-slate-900' :
                          'text-indigo-600'
                        }`}>
                          {isIncome ? '+' : isExpense ? '-' : ''}₹{Number(tx.amount || 0).toLocaleString('en-IN')}
                        </span>
                      </td>

                      {/* Expires In */}
                      <td className="p-3.5 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          remaining.urgent 
                            ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          <Clock size={10} />
                          {remaining.label}
                        </span>
                      </td>

                      {/* Actions: Restore & Permanent Delete */}
                      <td className="p-3.5 text-right pr-4 whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleSingleRestore(tx.id)}
                            disabled={restoringId === tx.id}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-[11px] font-bold transition-all shadow-xs"
                            title="Restore this transaction back to active ledger"
                          >
                            <RotateCcw size={12} className={restoringId === tx.id ? 'animate-spin' : ''} />
                            <span>Restore</span>
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm("Permanently delete this entry from trash?")) {
                                onPermanentDelete(tx.id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                            title="Delete Permanently"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
