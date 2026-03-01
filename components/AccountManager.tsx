import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Landmark, CreditCard, Pencil, Wallet, RefreshCw, AlertCircle, X, TrendingUp, TrendingDown, FileText, ArrowUpDown } from 'lucide-react';
import { Account, AccountType, Transaction } from '../types';
import { getBankLogo } from '../utils/bankLogos';

interface Props {
  accounts: Account[];
  transactions: Transaction[];
  onAdd: (acc: Omit<Account, 'id' | 'balance'>) => void;
  onUpdate: (id: string, updates: Partial<Account>) => void;
  onDelete: (id: string) => void;
  onSync?: (id: string) => void;
  onRestoreFromDump?: () => void;
}

// ─── Account Statement Modal ────────────────────────────────────────────────
const StatementModal: React.FC<{ acc: Account; transactions: Transaction[]; onClose: () => void }> = ({ acc, transactions, onClose }) => {
  const logo = getBankLogo(acc.name);

  // All txns for this account (source or destination), sorted oldest → newest
  const accTxns = useMemo(() => {
    return transactions
      .filter(t => t.sourceAccountId === acc.id || t.destinationAccountId === acc.id)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
  }, [transactions, acc.id]);

  // Compute running balance starting from opening balance (limit for BANK/CURRENT)
  const openingBalance = acc.limit || 0;
  const rows = useMemo(() => {
    let running = openingBalance;
    return accTxns.map(t => {
      let debit = 0, credit = 0;
      if (t.sourceAccountId === acc.id) {
        if (t.type === 'INCOME') { credit = t.amount; running += t.amount; }
        else { debit = t.amount; running -= t.amount; }
      } else if (t.destinationAccountId === acc.id) {
        // REPAYMENT coming in
        credit = t.amount; running += t.amount;
      }
      return { t, debit, credit, running };
    });
  }, [accTxns, openingBalance, acc.id]);

  const totalDebit = rows.reduce((s, r) => s + r.debit, 0);
  const totalCredit = rows.reduce((s, r) => s + r.credit, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            {logo ? (
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden border border-slate-100 shadow-sm" style={{ background: logo.bg }}>
                <img src={logo.url} alt={acc.name} className="w-8 h-8 object-contain"
                  onError={(e) => { const p = (e.target as HTMLImageElement).parentElement!; p.innerHTML = `<span style="color:${logo.color};font-size:12px;font-weight:900">${logo.initials}</span>`; }} />
              </div>
            ) : (
              <div className="p-2.5 bg-indigo-50 rounded-xl"><Landmark size={18} className="text-indigo-600" /></div>
            )}
            <div>
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">{acc.name}</h2>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                {acc.type === 'CREDIT_CARD' ? 'Credit Card Statement' : 'Account Statement'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all">
            <X size={16} />
          </button>
        </div>

        {/* Summary Strip */}
        <div className="grid grid-cols-3 gap-0 border-b border-slate-100 flex-shrink-0">
          <div className="px-6 py-3 border-r border-slate-100">
            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Opening Balance</p>
            <p className="text-sm font-black text-slate-700 mt-0.5">₹{openingBalance.toLocaleString()}</p>
          </div>
          <div className="px-6 py-3 border-r border-slate-100">
            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1"><TrendingUp size={9} className="text-emerald-500" /> Total Credit</p>
            <p className="text-sm font-black text-emerald-600 mt-0.5">+₹{totalCredit.toLocaleString()}</p>
          </div>
          <div className="px-6 py-3">
            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1"><TrendingDown size={9} className="text-rose-500" /> Total Debit</p>
            <p className="text-sm font-black text-rose-600 mt-0.5">−₹{totalDebit.toLocaleString()}</p>
          </div>
        </div>

        {/* Table */}
        {accTxns.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-16 text-slate-300">
            <FileText size={40} className="mb-3" />
            <p className="text-[11px] font-black uppercase tracking-widest">No transactions recorded for this account</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left text-[10px]">
              <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-100">
                <tr>
                  <th className="px-4 py-2.5 font-black uppercase tracking-widest text-slate-400">Date</th>
                  <th className="px-4 py-2.5 font-black uppercase tracking-widest text-slate-400">Description</th>
                  <th className="px-4 py-2.5 font-black uppercase tracking-widest text-slate-400 text-right">Debit</th>
                  <th className="px-4 py-2.5 font-black uppercase tracking-widest text-slate-400 text-right">Credit</th>
                  <th className="px-4 py-2.5 font-black uppercase tracking-widest text-slate-400 text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {/* Opening row */}
                <tr className="border-b border-slate-50 bg-indigo-50/30">
                  <td className="px-4 py-2 text-slate-400">—</td>
                  <td className="px-4 py-2 font-bold text-slate-500 italic">Opening Balance</td>
                  <td className="px-4 py-2"></td>
                  <td className="px-4 py-2"></td>
                  <td className="px-4 py-2 text-right font-black text-slate-700">₹{openingBalance.toLocaleString()}</td>
                </tr>
                {rows.map(({ t, debit, credit, running }, i) => (
                  <tr key={t.id} className={`border-b border-slate-50 hover:bg-blue-50/30 transition-colors ${i % 2 === 0 ? '' : 'bg-slate-50/20'}`}>
                    <td className="px-4 py-2 whitespace-nowrap text-slate-500 font-semibold">
                      {new Date(t.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}
                    </td>
                    <td className="px-4 py-2 max-w-[220px]">
                      <div className="font-black text-slate-700 uppercase truncate text-[9px]">
                        {t.type === 'INCOME' ? (t.incomeSource === 'COD' ? 'COD Sale' : 'Prepaid Sale')
                          : t.expenseCategory || t.type}
                      </div>
                      {t.description && <div className="text-[8px] text-slate-400 truncate">{t.description}</div>}
                    </td>
                    <td className="px-4 py-2 text-right font-bold text-rose-600">
                      {debit > 0 ? `₹${debit.toLocaleString()}` : ''}
                    </td>
                    <td className="px-4 py-2 text-right font-bold text-emerald-600">
                      {credit > 0 ? `₹${credit.toLocaleString()}` : ''}
                    </td>
                    <td className={`px-4 py-2 text-right font-black ${running >= 0 ? 'text-slate-800' : 'text-rose-600'}`}>
                      {running < 0 ? '−' : ''}₹{Math.abs(running).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
              {/* Closing row */}
              <tfoot className="sticky bottom-0 bg-white border-t-2 border-slate-200">
                <tr>
                  <td className="px-4 py-2.5 font-black text-slate-500 text-[9px] uppercase tracking-widest" colSpan={2}>Closing Balance</td>
                  <td className="px-4 py-2.5 text-right font-black text-rose-600">₹{totalDebit.toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-right font-black text-emerald-600">₹{totalCredit.toLocaleString()}</td>
                  <td className={`px-4 py-2.5 text-right font-black text-sm ${acc.balance >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
                    ₹{acc.balance.toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Account Card ────────────────────────────────────────────────────────────
const AccountCard: React.FC<{
  acc: Account;
  transactions: Transaction[];
  editingId: string | null;
  handleEdit: (acc: Account) => void;
  onDelete: (id: string) => void;
  onViewStatement: (acc: Account) => void;
}> = ({ acc, transactions, editingId, handleEdit, onDelete, onViewStatement }) => {
  const logo = getBankLogo(acc.name);
  return (
    <div
      onClick={() => onViewStatement(acc)}
      className={`bg-white/70 backdrop-blur-xl p-4 rounded-[1.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border transition-all group relative cursor-pointer hover:scale-[1.02] hover:shadow-lg duration-200 ${editingId === acc.id ? 'border-indigo-400 ring-2 ring-indigo-50' : 'border-white/50 hover:border-indigo-200'}`}
    >
      {/* Tap hint */}
      <div className="absolute top-3 right-12 opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-[7px] font-black uppercase tracking-widest text-indigo-400 flex items-center gap-0.5"><ArrowUpDown size={8} /> Statement</span>
      </div>

      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          {logo ? (
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden border border-slate-100 shadow-sm" style={{ background: logo.bg }}>
              <img src={logo.url} alt={acc.name} className="w-7 h-7 object-contain"
                onError={(e) => {
                  const parent = (e.target as HTMLImageElement).parentElement!;
                  parent.innerHTML = `<span style="color:${logo.color};font-size:11px;font-weight:900;letter-spacing:-0.5px">${logo.initials}</span>`;
                }} />
            </div>
          ) : (
            <div className={`p-2 rounded-xl ${acc.type === 'BANK' ? 'bg-indigo-50 text-indigo-600' : acc.type === 'CURRENT' ? 'bg-emerald-50 text-emerald-600' : acc.type === 'CREDIT_CARD' ? 'bg-purple-50 text-purple-600' : 'bg-rose-50 text-rose-600'}`}>
              {acc.type === 'BANK' ? <Landmark size={14} /> : acc.type === 'CURRENT' ? <Wallet size={14} /> : <CreditCard size={14} />}
            </div>
          )}
          <div>
            <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-tight">{acc.name}</h4>
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">
              {acc.type === 'OD' ? 'Overdraft' : acc.type === 'CREDIT_CARD' ? 'Credit Card' : acc.type === 'BANK' ? 'Savings Account' : 'Current Account'}
            </p>
          </div>
        </div>
        <div className="flex gap-1" onClick={e => e.stopPropagation()}>
          <button onClick={() => handleEdit(acc)} className="text-slate-200 hover:text-indigo-500 p-1 transition-colors"><Pencil size={12} /></button>
          <button onClick={() => onDelete(acc.id)} className="text-slate-200 hover:text-rose-500 p-1 transition-colors"><Trash2 size={12} /></button>
        </div>
      </div>

      <div className="mt-3">
        <div className="flex justify-between items-end">
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
            {['OD', 'CREDIT_CARD'].includes(acc.type) ? 'Available' : 'Balance'}
          </span>
          <span className={`text-sm font-black tracking-tight ${(['OD', 'CREDIT_CARD'].includes(acc.type) ? acc.balance > 0 : acc.balance >= 0) ? (['OD', 'CREDIT_CARD'].includes(acc.type) ? 'text-emerald-600' : 'text-slate-900') : 'text-rose-600'}`}>
            ₹{acc.balance.toLocaleString()}
          </span>
        </div>
        {acc.limit !== undefined && !['BANK', 'CURRENT'].includes(acc.type) && (
          <div className="mt-2">
            <div className="w-full bg-slate-50 h-1 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${acc.type === 'CREDIT_CARD' ? 'bg-purple-500' : 'bg-rose-500'}`}
                style={{ width: `${Math.min(100, (((acc.limit || 0) - acc.balance) / (acc.limit || 1)) * 100)}%` }} />
            </div>
            <div className="flex justify-between items-center mt-1">
              <span className="text-[7px] font-black text-slate-300 uppercase tracking-widest">Limit Usage</span>
              <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">L: ₹{acc.limit.toLocaleString()}</span>
            </div>
          </div>
        )}
        {acc.limit !== undefined && ['BANK', 'CURRENT'].includes(acc.type) && (
          <div className="mt-2 flex justify-between items-center">
            <span className="text-[7px] font-black text-slate-300 uppercase tracking-widest">Opening Balance</span>
            <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">₹{acc.limit.toLocaleString()}</span>
          </div>
        )}
        {/* Txn count */}
        {(() => {
          const count = transactions.filter(tx => tx.sourceAccountId === acc.id || tx.destinationAccountId === acc.id).length;
          return count > 0 ? (
            <div className="mt-2 pt-2 border-t border-slate-50 flex items-center justify-between">
              <span className="text-[7px] text-slate-400 font-black uppercase tracking-widest">{count} Transactions</span>
              <span className="text-[7px] text-indigo-500 font-black uppercase tracking-widest">Tap to view →</span>
            </div>
          ) : null;
        })()}
      </div>
    </div>
  );
};

// ─── Main AccountManager ─────────────────────────────────────────────────────
const AccountManager: React.FC<Props> = ({ accounts, transactions, onAdd, onUpdate, onDelete, onSync, onRestoreFromDump }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('BANK');
  const [limit, setLimit] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [statementAcc, setStatementAcc] = useState<Account | null>(null);

  useEffect(() => {
    if (editingId) {
      const acc = accounts.find(a => a.id === editingId);
      if (acc) { setName(acc.name); setType(acc.type); setLimit(acc.limit?.toString() || ''); }
    } else {
      setName(''); setType('BANK'); setLimit('');
    }
  }, [editingId, accounts]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    if (editingId) {
      onUpdate(editingId, { name, type, limit: limit ? Number(limit) : undefined });
      setEditingId(null);
    } else {
      onAdd({ name, type, limit: limit ? Number(limit) : undefined });
    }
    setName(''); setLimit('');
  };

  const cardProps = (acc: Account) => ({
    acc, transactions, editingId,
    handleEdit: (a: Account) => setEditingId(a.id),
    onDelete,
    onViewStatement: (a: Account) => setStatementAcc(a),
  });

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      {/* Statement Modal */}
      {statementAcc && (
        <StatementModal
          acc={statementAcc}
          transactions={transactions}
          onClose={() => setStatementAcc(null)}
        />
      )}

      {/* Add / Edit Form */}
      <div className="bg-white/70 backdrop-blur-3xl p-5 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-black text-slate-800 flex items-center gap-2 uppercase tracking-tight">
            {editingId ? <Pencil className="text-amber-500" size={14} /> : <Plus className="text-indigo-600" size={14} />}
            {editingId ? 'Edit Financial Hub' : 'Add Financial Hub'}
          </h3>
          {editingId && (
            <button onClick={() => setEditingId(null)} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-rose-500 transition-colors">Cancel</button>
          )}
        </div>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-1">
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Account Name"
              className="w-full px-4 py-2 bg-white/50 border border-white/60 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all backdrop-blur-md placeholder:text-slate-400 focus:bg-white/80" required />
          </div>
          <div>
            <select value={type} onChange={e => setType(e.target.value as AccountType)}
              className="w-full px-4 py-2 bg-white/50 border border-white/60 rounded-xl text-xs font-bold outline-none appearance-none backdrop-blur-md focus:bg-white/80">
              <option value="BANK">Savings</option>
              <option value="CURRENT">Current</option>
              <option value="OD">OD/Limit</option>
              <option value="CREDIT_CARD">Credit Card</option>
            </select>
          </div>
          <div>
            <input type="number" value={limit} onChange={e => setLimit(e.target.value)}
              placeholder={['BANK', 'CURRENT'].includes(type) ? 'Initial Balance' : 'Credit Limit'}
              className="w-full px-4 py-2 bg-white/50 border border-white/60 rounded-xl text-xs font-bold outline-none backdrop-blur-md placeholder:text-slate-400 focus:bg-white/80" />
          </div>
          <button type="submit"
            className={`py-2 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95 ${editingId ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/20' : 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/20'}`}>
            {editingId ? 'Save Hub' : 'Add Hub'}
          </button>
        </form>
      </div>

      {accounts.length === 0 ? (
        <div className="py-12 text-center bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-100">
          <AlertCircle className="mx-auto text-slate-200 mb-2" size={32} />
          <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest mb-4">No hubs registered.</p>
          {onRestoreFromDump && (
            <button onClick={onRestoreFromDump} className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center gap-2 mx-auto">
              <RefreshCw size={14} /> Rescue Hubs from Backup
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {accounts.some(acc => ['BANK', 'CURRENT'].includes(acc.type) && !acc.name.toUpperCase().includes('OD')) && (
            <div className="space-y-3">
              <h3 className="text-[10px] font-black text-slate-400 flex items-center gap-2 uppercase tracking-widest px-2">
                <Landmark size={14} className="text-indigo-400" /> Bank Accounts
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {accounts.filter(acc => ['BANK', 'CURRENT'].includes(acc.type) && !acc.name.toUpperCase().includes('OD')).map(acc => (
                  <AccountCard key={acc.id} {...cardProps(acc)} />
                ))}
              </div>
            </div>
          )}

          {accounts.some(acc => acc.type === 'OD' || acc.name.toUpperCase().includes('OD')) && (
            <div className="space-y-3">
              <h3 className="text-[10px] font-black text-slate-400 flex items-center gap-2 uppercase tracking-widest px-2">
                <Wallet size={14} className="text-rose-400" /> Credit Facilities (OD)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {accounts.filter(acc => acc.type === 'OD' || acc.name.toUpperCase().includes('OD')).map(acc => (
                  <AccountCard key={acc.id} {...cardProps({ ...acc, type: acc.type === 'BANK' || acc.type === 'CURRENT' ? 'OD' : acc.type })} />
                ))}
              </div>
            </div>
          )}

          {accounts.some(acc => acc.type === 'CREDIT_CARD') && (
            <div className="space-y-3">
              <h3 className="text-[10px] font-black text-slate-400 flex items-center gap-2 uppercase tracking-widest px-2">
                <CreditCard size={14} className="text-emerald-400" /> Credit Cards
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {accounts.filter(acc => acc.type === 'CREDIT_CARD').map(acc => (
                  <AccountCard key={acc.id} {...cardProps(acc)} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AccountManager;
