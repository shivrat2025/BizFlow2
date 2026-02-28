
import React from 'react';
import { Wallet, Landmark, CreditCard, PiggyBank, TrendingDown, DollarSign, ArrowDownLeft, Facebook, Truck, ShoppingBag, Box, TrendingUp, AlertCircle, Info, RefreshCw, Sparkles, Cloud } from 'lucide-react';
import { DashboardStats, Account, Transaction, ExpenseCategory } from '../types';
import {
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  AreaChart,
  Area
} from 'recharts';

interface DashboardProps {
  stats: DashboardStats;
  accounts: Account[];
  transactions: Transaction[];
  categories: ExpenseCategory[];
  onBackup: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ stats, accounts, transactions, categories, onBackup }) => {
  if (accounts.length === 0 && transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
        <div className="bg-indigo-50 p-6 rounded-full mb-6">
          <Landmark size={48} className="text-indigo-600" />
        </div>
        <h3 className="text-2xl font-bold text-gray-800 mb-2">Welcome to BizFlow</h3>
        <p className="text-gray-500 text-center max-w-sm px-6">
          Add your bank and OD accounts to start tracking your business flow.
        </p>
      </div>
    );
  }

  // Calculate Monthly Trends (Last 7 Days)
  const getTrendData = () => {
    const days = 14;
    const data = [];
    const now = new Date();
    for (let i = days; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dateStr = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });

      const dayTxs = transactions.filter(t => {
        const txDate = new Date(t.date);
        return txDate.toDateString() === d.toDateString();
      });

      const income = dayTxs.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
      const expense = dayTxs.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);

      data.push({ name: dateStr, income, expense });
    }
    return data;
  };

  const trendData = getTrendData();

  const totalSuggestedWithdrawal = (stats.totalCodIncome + stats.totalPrepaidIncome) * 0.05;
  const alreadyWithdrawn = stats.totalWithdrawals;
  const availableToWithdraw = Math.max(0, totalSuggestedWithdrawal - alreadyWithdrawn);
  const withdrawalProgress = totalSuggestedWithdrawal > 0
    ? (alreadyWithdrawn / totalSuggestedWithdrawal) * 100
    : 0;

  const totalAssets = accounts
    .filter(a => ['BANK', 'CURRENT'].includes(a.type))
    .reduce((sum, a) => sum + Math.max(0, a.balance), 0);

  const bankAccounts = accounts.filter(a => ['BANK', 'CURRENT'].includes(a.type));

  const categoryData = (Object.entries(stats.categoryBreakdown) as [string, number][]).map(([id, value]) => {
    const label = categories.find(c => c.id === id)?.label || id;
    return { name: label, value };
  }).filter(item => item.value > 0);

  const debtAccounts = accounts.filter(a =>
    ((a.type === 'OD' || a.type === 'CREDIT_CARD') && (a.limit || 0) > a.balance) ||
    (['BANK', 'CURRENT'].includes(a.type) && a.balance < 0)
  ).map(a => {
    let debt = 0;
    if (a.type === 'OD' || a.type === 'CREDIT_CARD') {
      debt = (a.limit || 0) - a.balance;
    } else {
      debt = Math.abs(a.balance);
    }
    return { ...a, debt };
  });

  const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];
  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-12">
      {/* Compact Stat Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-white/70 backdrop-blur-xl p-4 rounded-[1.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 active:bg-white/80 transition-all group hover:scale-[1.02] duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg group-active:bg-indigo-600 group-active:text-white transition-colors">
              <Box size={12} />
            </div>
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">COD Pool</p>
          </div>
          <p className="text-lg font-black text-slate-900 tracking-tight">₹{stats.codPool.toLocaleString()}</p>
          <div className="mt-2 pt-2 border-t border-slate-50">
            <div className="flex justify-between items-center text-[7px] font-black text-slate-400 uppercase tracking-tight">
              <span>{accounts.find(a => a.name.toUpperCase().includes('IDFC'))?.name || 'IDFC BANK'}</span>
            </div>
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-xl p-4 rounded-[1.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 active:bg-white/80 transition-all group hover:scale-[1.02] duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg group-active:bg-amber-600 group-active:text-white transition-colors">
              <RefreshCw size={12} />
            </div>
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Prepaid Pool</p>
          </div>
          <p className="text-lg font-black text-slate-900 tracking-tight">₹{stats.prepaidPool.toLocaleString()}</p>
          <div className="mt-2 pt-2 border-t border-slate-50">
            <div className="flex justify-between items-center text-[7px] font-black text-slate-400 uppercase tracking-tight">
              <span>{accounts.find(a => a.name.toUpperCase().includes('INDUSIND'))?.name || 'INDUSIND BANK'}</span>
            </div>
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-xl p-4 rounded-[1.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 active:bg-white/80 transition-all group hover:scale-[1.02] duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg group-active:bg-emerald-600 group-active:text-white transition-colors">
              <Wallet size={12} />
            </div>
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Total Bank Balance</p>
          </div>
          <p className="text-lg font-black text-emerald-600 tracking-tight">₹{totalAssets.toLocaleString()}</p>
          <div className="mt-2 space-y-1 pt-2 border-t border-slate-50">
            {bankAccounts.map(acc => (
              <div key={acc.id} className="flex justify-between items-center text-[7px] font-black text-slate-400 uppercase tracking-tight">
                <span className="truncate max-w-[50px]">{acc.name}</span>
                <span className="text-slate-600">₹{acc.balance.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-xl p-4 rounded-[1.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 active:bg-white/80 transition-all group hover:scale-[1.02] duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-red-50 text-red-600 rounded-lg group-active:bg-red-600 group-active:text-white transition-colors">
              <CreditCard size={12} />
            </div>
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Debt</p>
          </div>
          <p className="text-lg font-black text-red-600 tracking-tight">₹{stats.totalExternalCap.toLocaleString()}</p>
          <div className="mt-2 space-y-1 pt-2 border-t border-slate-50">
            {debtAccounts.map(acc => (
              <div key={acc.id} className="flex justify-between items-center text-[7px] font-black text-slate-400 uppercase tracking-tight">
                <span className="truncate max-w-[50px]">{acc.name}</span>
                <span className="text-rose-600">₹{acc.debt.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-2 lg:col-span-1 bg-gradient-to-br from-indigo-600 to-purple-600 backdrop-blur-md p-4 rounded-[1.5rem] shadow-lg shadow-indigo-500/20 text-white relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300 border border-white/20">
          <Sparkles className="absolute -top-2 -right-2 text-indigo-400/20 w-16 h-16 rotate-12" />
          <div className="relative z-10">
            <p className="text-[8px] font-black text-indigo-200 uppercase tracking-widest mb-1">Available Profit</p>
            <p className="text-lg font-black tracking-tight">₹{availableToWithdraw.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Trend Analysis - More compact on mobile */}
        <div className="lg:col-span-2 bg-white/70 backdrop-blur-xl p-5 rounded-[1.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-sm font-black text-slate-800 tracking-tight">Cash Flow</h3>
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">14 Day Engine</p>
            </div>
            <div className="flex gap-3">
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-[8px] font-black text-slate-500 uppercase">IN</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                <span className="text-[8px] font-black text-slate-500 uppercase">OUT</span>
              </div>
            </div>
          </div>
          <div className="h-40 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" fontSize={7} fontWeight="900" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} hide={window.innerWidth < 768} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', fontWeight: '900', fontSize: '8px' }}
                />
                <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorIncome)" />
                <Area type="monotone" dataKey="expense" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorExpense)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expense Breakdown - More compact */}
        <div className="bg-white/70 backdrop-blur-xl p-5 rounded-[1.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 flex flex-col hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
          <h3 className="text-sm font-black text-slate-800 tracking-tight text-center mb-1">Top Sources</h3>
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest text-center mb-4">Expenditure Radius</p>

          <div className="flex-1 flex flex-row lg:flex-col items-center justify-around gap-4">
            <div className="h-28 w-28 lg:h-36 lg:w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={35} outerRadius={45} paddingAngle={4} dataKey="value" stroke="none">
                    {categoryData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} cornerRadius={4} />)}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: '8px', borderRadius: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="flex-1 lg:w-full space-y-2 lg:px-4">
              {categoryData.slice(0, 3).map((cat, i) => (
                <div key={cat.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-[7px] font-black text-slate-500 uppercase tracking-tight truncate w-16">{cat.name}</span>
                  </div>
                  <span className="text-[8px] font-black text-slate-900">₹{cat.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Profit Rule Card - Compact */}
        <div className="bg-slate-900 p-5 rounded-[1.5rem] text-white shadow-xl shadow-slate-900/10 relative overflow-hidden border border-white/10 ring-1 ring-white/10">
          <div className="relative z-10">
            <h3 className="text-sm font-black tracking-tight mb-4 flex items-center gap-2">
              <DollarSign size={14} className="text-indigo-400" />
              5% Rule Pulse
            </h3>

            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[7px] font-black text-indigo-300 uppercase tracking-widest mb-0.5">Threshold</p>
                  <p className="text-xl font-black tracking-tighter">₹{totalSuggestedWithdrawal.toLocaleString()}</p>
                </div>
                <p className="text-sm font-black text-indigo-400">{Math.round(withdrawalProgress)}%</p>
              </div>

              <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-indigo-500 h-full rounded-full transition-all duration-1000"
                  style={{ width: `${Math.min(100, withdrawalProgress)}%` }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/5 p-2.5 rounded-xl border border-white/5 text-center">
                  <p className="text-[7px] font-black text-indigo-200 uppercase mb-0.5">Withdrawn</p>
                  <p className="text-xs font-black text-emerald-400">₹{alreadyWithdrawn.toLocaleString()}</p>
                </div>
                <div className="bg-white/5 p-2.5 rounded-xl border border-white/5 text-center">
                  <p className="text-[7px] font-black text-indigo-200 uppercase mb-0.5">Remaining</p>
                  <p className="text-xs font-black text-amber-400">₹{availableToWithdraw.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Source Distribution - Compact */}
        <div className="bg-white/70 backdrop-blur-xl p-5 rounded-[1.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60">
          <h3 className="text-sm font-black text-slate-800 tracking-tight mb-6">Source Dependency</h3>

          <div className="space-y-5">
            {[
              { label: 'COD Pipeline', val: stats.sourceBreakdown.cod, color: 'bg-indigo-500' },
              { label: 'Prepaid Logistics', val: stats.sourceBreakdown.prepaid, color: 'bg-emerald-500' },
              { label: 'Debt Usage', val: stats.sourceBreakdown.accounts, color: 'bg-red-500' }
            ].map(source => (
              <div key={source.label}>
                <div className="flex justify-between items-center mb-1.5 px-0.5">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{source.label}</span>
                  <span className="text-[10px] font-black text-slate-900">₹{source.val.toLocaleString()}</span>
                </div>
                <div className="w-full bg-slate-50 h-1.5 rounded-full overflow-hidden">
                  <div className={`${source.color} h-full rounded-full`} style={{ width: `${(source.val / (stats.totalExpenses + stats.totalWithdrawals || 1)) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
