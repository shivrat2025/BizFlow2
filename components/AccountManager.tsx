import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Landmark, CreditCard, ShieldCheck, AlertCircle, Pencil, X, Wallet, RefreshCw } from 'lucide-react';
import { Account, AccountType } from '../types';
import { getBankLogo } from '../utils/bankLogos';

interface Props {
  accounts: Account[];
  onAdd: (acc: Omit<Account, 'id' | 'balance'>) => void;
  onUpdate: (id: string, updates: Partial<Account>) => void;
  onDelete: (id: string) => void;
  onSync?: (id: string) => void;
  onRestoreFromDump?: () => void;
}

const AccountManager: React.FC<Props> = ({ accounts, onAdd, onUpdate, onDelete, onSync, onRestoreFromDump }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('BANK');
  const [limit, setLimit] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (editingId) {
      const acc = accounts.find(a => a.id === editingId);
      if (acc) {
        setName(acc.name);
        setType(acc.type);
        setLimit(acc.limit?.toString() || '');
      }
    } else {
      setName('');
      setType('BANK');
      setLimit('');
    }
  }, [editingId, accounts]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    if (editingId) {
      onUpdate(editingId, {
        name,
        type,
        limit: limit ? Number(limit) : undefined
      });
      setEditingId(null);
    } else {
      onAdd({
        name,
        type,
        limit: limit ? Number(limit) : undefined
      });
    }
    setName('');
    setLimit('');
  };

  const handleEdit = (acc: Account) => {
    setEditingId(acc.id);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="bg-white/70 backdrop-blur-3xl p-5 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-black text-slate-800 flex items-center gap-2 uppercase tracking-tight">
            {editingId ? <Pencil className="text-amber-500" size={14} /> : <Plus className="text-indigo-600" size={14} />}
            {editingId ? 'Edit Financial Hub' : 'Add Financial Hub'}
          </h3>
          {editingId && (
            <button onClick={cancelEdit} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-rose-500 transition-colors">
              Cancel
            </button>
          )}
        </div>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-1">
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Account Name"
              className="w-full px-4 py-2 bg-white/50 border border-white/60 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all backdrop-blur-md placeholder:text-slate-400 focus:bg-white/80"
              required
            />
          </div>
          <div>
            <select
              value={type}
              onChange={e => setType(e.target.value as AccountType)}
              className="w-full px-4 py-2 bg-white/50 border border-white/60 rounded-xl text-xs font-bold outline-none appearance-none backdrop-blur-md focus:bg-white/80"
            >
              <option value="BANK">Savings</option>
              <option value="CURRENT">Current</option>
              <option value="OD">OD/Limit</option>
              <option value="CREDIT_CARD">Credit Card</option>
            </select>
          </div>
          <div>
            <input
              type="number"
              value={limit}
              onChange={e => setLimit(e.target.value)}
              placeholder={['BANK', 'CURRENT'].includes(type) ? "Initial Balance" : "Credit Limit"}
              className="w-full px-4 py-2 bg-white/50 border border-white/60 rounded-xl text-xs font-bold outline-none backdrop-blur-md placeholder:text-slate-400 focus:bg-white/80"
            />
          </div>
          <button
            type="submit"
            className={`py-2 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95 ${editingId
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/20'
              : 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/20'
              }`}
          >
            {editingId ? 'Save Hub' : 'Add Hub'}
          </button>
        </form>
      </div>

      {accounts.length === 0 ? (
        <div className="py-12 text-center bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-100">
          <AlertCircle className="mx-auto text-slate-200 mb-2" size={32} />
          <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest mb-4">No hubs registered.</p>
          {onRestoreFromDump && (
            <button
              onClick={onRestoreFromDump}
              className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center gap-2 mx-auto"
            >
              <RefreshCw size={14} /> Rescue Hubs from Backup
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {/* Section: Bank Accounts */}
          {accounts.some(acc => ['BANK', 'CURRENT'].includes(acc.type) && !acc.name.toUpperCase().includes('OD')) && (
            <div className="space-y-3">
              <h3 className="text-[10px] font-black text-slate-400 flex items-center gap-2 uppercase tracking-widest px-2">
                <Landmark size={14} className="text-indigo-400" /> Basic Hubs
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {accounts.filter(acc => ['BANK', 'CURRENT'].includes(acc.type) && !acc.name.toUpperCase().includes('OD')).map(acc => (
                  <AccountCard key={acc.id} acc={acc} editingId={editingId} handleEdit={handleEdit} onDelete={onDelete} />
                ))}
              </div>
            </div>
          )}

          {/* Section: Overdrafts */}
          {accounts.some(acc => acc.type === 'OD' || acc.name.toUpperCase().includes('OD')) && (
            <div className="space-y-3">
              <h3 className="text-[10px] font-black text-slate-400 flex items-center gap-2 uppercase tracking-widest px-2">
                <Wallet size={14} className="text-rose-400" /> Credit Facilities (OD)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {accounts.filter(acc => acc.type === 'OD' || acc.name.toUpperCase().includes('OD')).map(acc => (
                  <AccountCard key={acc.id} acc={{ ...acc, type: acc.type === 'BANK' || acc.type === 'CURRENT' ? 'OD' : acc.type }} editingId={editingId} handleEdit={handleEdit} onDelete={onDelete} />
                ))}
              </div>
            </div>
          )}

          {/* Section: Credit Cards */}
          {accounts.some(acc => acc.type === 'CREDIT_CARD') && (
            <div className="space-y-3">
              <h3 className="text-[10px] font-black text-slate-400 flex items-center gap-2 uppercase tracking-widest px-2">
                <CreditCard size={14} className="text-emerald-400" /> Credit Cards
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {accounts.filter(acc => acc.type === 'CREDIT_CARD').map(acc => (
                  <AccountCard key={acc.id} acc={acc} editingId={editingId} handleEdit={handleEdit} onDelete={onDelete} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Extracted reusable card component
const AccountCard: React.FC<{ acc: Account, editingId: string | null, handleEdit: (acc: Account) => void, onDelete: (id: string) => void }> = ({ acc, editingId, handleEdit, onDelete }) => (
  <div
    className={`bg-white/70 backdrop-blur-xl p-4 rounded-[1.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border transition-all group relative hover:scale-[1.02] duration-300 ${editingId === acc.id ? 'border-indigo-400 ring-2 ring-indigo-50' : 'border-white/50 hover:bg-white/60'
      }`}
  >
    <div className="flex justify-between items-start mb-2">
      <div className="flex items-center gap-2">
        {(() => {
          const logo = getBankLogo(acc.name);
          return logo ? (
            <img src={logo.url} alt={acc.name} className="w-8 h-8 rounded-xl object-contain bg-white border border-slate-100 shadow-sm flex-shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          ) : (
            <div className={`p-2 rounded-xl ${acc.type === 'BANK' ? 'bg-indigo-50 text-indigo-600' : acc.type === 'CURRENT' ? 'bg-emerald-50 text-emerald-600' : acc.type === 'CREDIT_CARD' ? 'bg-purple-50 text-purple-600' : 'bg-rose-50 text-rose-600'}`}>
              {acc.type === 'BANK' ? <Landmark size={14} /> : acc.type === 'CURRENT' ? <Wallet size={14} /> : <CreditCard size={14} />}
            </div>
          );
        })()}
        <div>
          <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-tight">{acc.name}</h4>
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">
            {acc.type === 'OD' ? 'Overdraft Limit' : acc.type === 'CREDIT_CARD' ? 'Credit Card' : acc.type === 'BANK' ? 'Savings Account' : 'Current Account'}
          </p>
        </div>
      </div>
      <div className="flex gap-1">
        <button
          onClick={() => handleEdit(acc)}
          className="text-slate-200 hover:text-indigo-500 p-1 transition-colors"
        >
          <Pencil size={12} />
        </button>
        <button
          onClick={() => onDelete(acc.id)}
          className="text-slate-200 hover:text-rose-500 p-1 transition-colors"
        >
          <Trash2 size={12} />
        </button>
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
            <div
              className={`h-full rounded-full transition-all ${acc.type === 'CREDIT_CARD' ? 'bg-purple-500' : 'bg-rose-500'}`}
              style={{ width: `${Math.min(100, (((acc.limit || 0) - acc.balance) / (acc.limit || 1)) * 100)}%` }}
            />
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
    </div>
  </div>
);

export default AccountManager;
