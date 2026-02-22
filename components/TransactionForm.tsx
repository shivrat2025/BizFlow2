import React, { useState, useEffect, useRef } from 'react';
import { X, TrendingUp, TrendingDown, PiggyBank, CreditCard, Plus, Check, ArrowRight, Tag, FileText, ChevronDown, ChevronUp, Camera, Calendar, ChevronRight } from 'lucide-react';
import { Account, Transaction, TransactionType, IncomeSource, DashboardStats, ExpenseCategory } from '../types';

interface Props {
  onClose: () => void;
  onSubmit: (data: any) => void;
  onAddCategory: (label: string) => void;
  accounts: Account[];
  categories: ExpenseCategory[];
  currentStats: DashboardStats;
  initialData?: Transaction | null;
  allTags?: string[];
  suppliers?: { id: string; name: string }[];
  onAddSupplier?: (name: string) => Promise<{ id: string; name: string }>;
}

const TransactionForm: React.FC<Props> = ({ onClose, onSubmit, onAddCategory, accounts, categories, initialData, allTags = [], suppliers = [], onAddSupplier }) => {
  const [type, setType] = useState<TransactionType>('EXPENSE');
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [sourceId, setSourceId] = useState('');
  const [destinationId, setDestinationId] = useState('');

  const [incomeSource, setIncomeSource] = useState<IncomeSource | 'NONE'>('NONE');
  const [expenseCat, setExpenseCat] = useState<string>('FB_ADS');
  const [supplierId, setSupplierId] = useState<string>('');
  const [isWithdrawal, setIsWithdrawal] = useState(false);
  const [isAddingSupplier, setIsAddingSupplier] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCatLabel, setNewCatLabel] = useState('');

  const [invoiceUrl, setInvoiceUrl] = useState<string | undefined>(undefined);
  const [paymentProofUrl, setPaymentProofUrl] = useState<string | undefined>(undefined);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const initializedRef = useRef<string | null>(null);

  useEffect(() => {
    // Only initialize if we haven't initialized this transaction yet
    const txId = initialData?.id || 'new';
    if (initializedRef.current === txId) return;
    initializedRef.current = txId;

    if (initialData) {
      setType(initialData.type);
      setAmount(initialData.amount.toString());
      setDescription(initialData.description);
      setSourceId(initialData.sourceAccountId);
      setDestinationId(initialData.destinationAccountId || '');
      setIncomeSource(initialData.incomeSource || 'NONE');
      setExpenseCat(initialData.expenseCategory || 'FB_ADS');
      setSupplierId(initialData.supplierId || '');
      setIsWithdrawal(initialData.isProfitWithdrawal || initialData.type === 'WITHDRAWAL');
      setTags(initialData.tags?.join(', ') || '');
      setNotes(initialData.notes || '');
      setDate(new Date(initialData.date).toISOString().split('T')[0]);
      setInvoiceUrl(initialData.invoiceUrl);
      setPaymentProofUrl(initialData.paymentProofUrl);
      if (initialData.tags?.length || initialData.notes || initialData.invoiceUrl || initialData.paymentProofUrl || initialData.supplierId) setShowAdvanced(true);
    } else if (accounts.length > 0) {
      if (!sourceId) {
        const defaultAcc = accounts[0];
        setSourceId(defaultAcc.id);
        if ((defaultAcc.type === 'BANK' || defaultAcc.type === 'CURRENT') && (incomeSource === 'NONE' || !incomeSource)) {
          setIncomeSource('COD');
        }
      }
      if (!destinationId && type === 'REPAYMENT') {
        const odAcc = accounts.find(a => a.type === 'OD' || a.type === 'CREDIT_CARD');
        if (odAcc) setDestinationId(odAcc.id);
      }
    }
  }, [accounts, initialData, sourceId, destinationId, type]);



  const handleSourceSelect = (id: string) => {
    setSourceId(id);
    const selectedAccount = accounts.find(a => a.id === id);
    if (selectedAccount && (selectedAccount.type === 'BANK' || selectedAccount.type === 'CURRENT')) {
      if (incomeSource === 'NONE' || !incomeSource) {
        setIncomeSource('COD');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setter(reader.result as string);
    };
    reader.readAsDataURL(file);
  };


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number(amount);

    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      setError("Please enter an amount greater than 0");
      return;
    }

    if (type === 'REPAYMENT' && sourceId === destinationId) {
      setError("Source and Target accounts cannot be the same");
      return;
    }

    const processedTags = tags.split(',').map(tag => tag.trim()).filter(tag => tag !== '');

    setError(null);
    onSubmit({
      type: isWithdrawal ? 'WITHDRAWAL' : type,
      amount: numAmount,
      description: description,
      sourceAccountId: sourceId,
      destinationAccountId: type === 'REPAYMENT' ? destinationId : undefined,
      incomeSource: incomeSource === 'NONE' ? undefined : incomeSource,
      expenseCategory: type === 'EXPENSE' ? expenseCat : undefined,
      supplierId: type === 'EXPENSE' && expenseCat === 'PRODUCT' ? supplierId : undefined,
      isProfitWithdrawal: isWithdrawal,
      tags: processedTags,
      notes: notes.trim() || undefined,
      date: new Date(date).getTime(),
      invoiceUrl,
      paymentProofUrl
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-lg flex items-end md:items-center justify-center z-[100] p-0 md:p-4 animate-in fade-in duration-300">
      <div className="bg-white/95 backdrop-blur-3xl rounded-t-[2.5rem] md:rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden border border-white/50 relative animate-in slide-in-from-bottom-10 duration-500 max-h-[92vh] flex flex-col ring-1 ring-white/40">

        {/* Mobile Drag Handle */}
        <div className="md:hidden w-12 h-1 bg-white/20 rounded-full mx-auto mt-4 mb-2 flex-shrink-0" />

        <div className="p-6 border-b border-white/20 bg-white/50 backdrop-blur-md flex items-center justify-between flex-shrink-0 relative z-10">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl shadow-lg ring-1 ring-white/20 ${isWithdrawal ? 'bg-amber-100/80 text-amber-600 backdrop-blur-sm' :
              type === 'EXPENSE' ? 'bg-red-100/80 text-red-600 backdrop-blur-sm' :
                type === 'REPAYMENT' ? 'bg-blue-100/80 text-blue-600 backdrop-blur-sm' : 'bg-green-100/80 text-green-600 backdrop-blur-sm'
              }`}>
              {isWithdrawal ? <PiggyBank size={20} /> :
                type === 'EXPENSE' ? <TrendingDown size={20} /> :
                  type === 'REPAYMENT' ? <CreditCard size={20} /> : <TrendingUp size={20} />}
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800 tracking-tight leading-none drop-shadow-sm">
                {initialData ? (initialData.id ? 'Edit Entry' : 'Duplicate Entry') : type === 'REPAYMENT' ? 'Repayment Entry' : 'New Entry'}
              </h3>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Dual-Ledger Sync Engine</p>
            </div>
          </div>

          <button
            onClick={onClose}
            type="button"
            className="p-2 hover:bg-white/50 rounded-xl text-slate-500 hover:text-red-500 transition-colors"
          >
            <X size={20} />
          </button>
        </div>



        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1 bg-white/80 backdrop-blur-3xl">
          <div className="p-1 bg-white/50 backdrop-blur-md rounded-xl flex border border-white/30 shadow-inner">
            {[
              { id: 'EXPENSE', icon: TrendingDown, label: 'Expense', color: 'text-red-600' },
              { id: 'INCOME', icon: TrendingUp, label: 'Income', color: 'text-green-600' },
              { id: 'REPAYMENT', icon: CreditCard, label: 'Repay', color: 'text-blue-600' },
              { id: 'WITHDRAWAL', icon: PiggyBank, label: 'Profit', color: 'text-amber-600' }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setError(null);
                  if (tab.id === 'WITHDRAWAL') {
                    setIsWithdrawal(true);
                    setType('WITHDRAWAL' as any);
                  } else {
                    setType(tab.id as TransactionType);
                    setIsWithdrawal(false);
                  }
                }}
                className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 rounded-lg transition-all font-black text-[9px] uppercase tracking-tighter ${(tab.id === 'WITHDRAWAL' ? isWithdrawal : (type === tab.id && !isWithdrawal))
                  ? `bg-white shadow-lg ${tab.color} ring-1 ring-black/5 scale-[1.02]`
                  : 'text-slate-500 hover:text-slate-700 hover:bg-white/30'
                  }`}
              >
                <tab.icon size={14} /> {tab.label}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <Calendar size={10} /> Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/50 border border-white/30 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/10 focus:bg-white/80 transition-all backdrop-blur-md placeholder:text-slate-400"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</label>
                <div className="relative group">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 font-black text-lg">₹</span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value);
                      if (error) setError(null);
                    }}
                    className={`w-full pl-7 pr-3 py-3 bg-white/50 border ${error ? 'border-red-500 bg-red-50/50' : 'border-white/30'} rounded-xl text-lg font-black text-slate-900 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all backdrop-blur-md placeholder:text-slate-400`}
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>
            </div>
            {error && <p className="text-[10px] font-bold text-red-500">{error}</p>}

            {type === 'REPAYMENT' ? (
              <div className="space-y-4 animate-in slide-in-from-top-2">
                <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl space-y-3">
                  <div className="space-y-1">
                    <label className="block text-[9px] font-black text-blue-400 uppercase tracking-widest">Business Pool (Source Fund)</label>
                    <select value={incomeSource} onChange={(e) => setIncomeSource(e.target.value as any)} className="w-full px-3 py-2.5 bg-white/80 border border-blue-200 rounded-xl text-[11px] font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20" required>
                      <option value="NONE">Debt / General</option>
                      <option value="COD">COD Pool</option>
                      <option value="PREPAID">Prepaid Pool</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[9px] font-black text-blue-400 uppercase tracking-widest">From Bank (Money Leaves)</label>
                    <select value={sourceId} onChange={(e) => handleSourceSelect(e.target.value)} className="w-full px-3 py-2.5 bg-white/80 border border-blue-200 rounded-xl text-[11px] font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20" required>
                      <option value="">Select Source...</option>
                      {accounts.filter(a => ['BANK', 'CURRENT'].includes(a.type)).map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.name} (₹{acc.balance.toLocaleString()})</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex justify-center text-blue-200">
                    <ArrowRight size={16} />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[9px] font-black text-blue-400 uppercase tracking-widest">To Debt (OD/Credit Card Debt Clear)</label>
                    <select value={destinationId} onChange={(e) => setDestinationId(e.target.value)} className="w-full px-3 py-2.5 bg-white/80 border border-blue-200 rounded-xl text-[11px] font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20" required>
                      <option value="">Select Target...</option>
                      {accounts.filter(a => ['OD', 'CREDIT_CARD'].includes(a.type)).map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.name} (Debt: ₹{Math.abs(Math.min(0, acc.balance)).toLocaleString()})</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-white/20 pb-1 mb-2">Fund Allocation</label>
                  <select value={incomeSource} onChange={(e) => setIncomeSource(e.target.value as any)} className="w-full px-3 py-3 bg-white/50 border border-white/30 rounded-xl text-[11px] font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 backdrop-blur-md">
                    <option value="NONE">Debt</option>
                    <option value="COD">COD Pool</option>
                    <option value="PREPAID">Prepaid Pool</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-white/20 pb-1 mb-2">Bank Account</label>
                  <select value={sourceId} onChange={(e) => handleSourceSelect(e.target.value)} className="w-full px-3 py-3 bg-white/50 border border-white/30 rounded-xl text-[11px] font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 backdrop-blur-md" required>
                    <option value="">Select Account...</option>
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({['OD', 'CREDIT_CARD'].includes(acc.type) ? 'Avail: ' : 'Bal: '}₹{acc.balance.toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}


            {type === 'EXPENSE' && (
              <div className="space-y-2 animate-in fade-in">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest flex justify-between items-center">
                  Category
                  {!isAddingCategory && (
                    <button type="button" onClick={() => setIsAddingCategory(true)} className="text-indigo-500 hover:text-indigo-600 flex items-center gap-1 group">
                      <Plus size={10} className="group-hover:scale-110 transition-transform" />
                      <span className="text-[9px]">Add New</span>
                    </button>
                  )}
                </label>

                {isAddingCategory ? (
                  <div className="flex gap-2 animate-in slide-in-from-top-1">
                    <input
                      type="text"
                      value={newCatLabel}
                      onChange={(e) => setNewCatLabel(e.target.value)}
                      placeholder="Category Name"
                      className="flex-1 px-3 py-2 bg-slate-50 border border-indigo-200 rounded-xl text-[11px] font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/10"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (newCatLabel.trim()) {
                            onAddCategory(newCatLabel.trim());
                            setExpenseCat(newCatLabel.trim());
                            setNewCatLabel('');
                            setIsAddingCategory(false);
                          }
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newCatLabel.trim()) {
                          onAddCategory(newCatLabel.trim());
                          setExpenseCat(newCatLabel.trim());
                          setNewCatLabel('');
                          setIsAddingCategory(false);
                        }
                      }}
                      className="px-3 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingCategory(false);
                        setNewCatLabel('');
                      }}
                      className="px-3 py-2 bg-slate-100 text-slate-400 rounded-xl text-[10px] font-black uppercase"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {categories.map(cat => (
                      <button key={cat.id} type="button" onClick={() => setExpenseCat(cat.id)} className={`py-2 px-1 rounded-xl border text-[9px] font-black uppercase transition-all backdrop-blur-md ${expenseCat === cat.id ? 'bg-slate-900 border-slate-900 text-white shadow-lg shadow-slate-900/20 scale-[1.02]' : 'bg-white/50 border-white/30 text-slate-500 hover:bg-white/70 hover:border-white/50 hover:text-slate-800'}`}>{cat.label}</button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setIsAddingCategory(true)}
                      className="py-2 px-1 rounded-xl border border-dashed border-white/30 bg-white/30 text-slate-400 hover:border-indigo-300 hover:text-indigo-500 hover:bg-white/50 transition-all flex items-center justify-center gap-1 backdrop-blur-sm"
                    >
                      <Plus size={10} />
                      <span className="text-[9px] font-black uppercase">More</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {type === 'EXPENSE' && expenseCat === 'PRODUCT' && (
              <div className="space-y-2 animate-in fade-in">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest flex justify-between items-center">
                  Supplier
                  {!isAddingSupplier && (
                    <button type="button" onClick={() => setIsAddingSupplier(true)} className="text-indigo-500 hover:text-indigo-600 flex items-center gap-1 group">
                      <Plus size={10} className="group-hover:scale-110 transition-transform" />
                      <span className="text-[9px]">Add New</span>
                    </button>
                  )}
                </label>

                {isAddingSupplier ? (
                  <div className="flex gap-2 animate-in slide-in-from-top-1">
                    <input
                      type="text"
                      value={newSupplierName}
                      onChange={(e) => setNewSupplierName(e.target.value)}
                      placeholder="Supplier Name"
                      className="flex-1 px-3 py-2 bg-slate-50 border border-indigo-200 rounded-xl text-[11px] font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/10"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        if (newSupplierName.trim() && onAddSupplier) {
                          const res = await onAddSupplier(newSupplierName.trim());
                          setSupplierId(res.id);
                          setNewSupplierName('');
                          setIsAddingSupplier(false);
                        }
                      }}
                      className="px-3 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingSupplier(false);
                        setNewSupplierName('');
                      }}
                      className="px-3 py-2 bg-slate-100 text-slate-400 rounded-xl text-[10px] font-black uppercase"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <select
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold text-slate-700 focus:outline-none focus:border-indigo-500 transition-all"
                    required={expenseCat === 'PRODUCT'}
                  >
                    <option value="">Select Supplier...</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                    <option value="NEW">+ Add New Supplier</option>
                  </select>
                )}
                {supplierId === 'NEW' && !isAddingSupplier && setIsAddingSupplier(true)}
              </div>
            )}

            {type === 'EXPENSE' && expenseCat === 'PRODUCT' && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                    <FileText size={10} /> Invoice / Bill
                  </label>
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => handleFileChange(e, setInvoiceUrl)}
                      className="hidden"
                      id="invoice-upload"
                    />
                    <label
                      htmlFor="invoice-upload"
                      className={`w-full flex flex-col items-center justify-center p-3 border-2 border-dashed rounded-xl transition-all cursor-pointer bg-white/50 backdrop-blur-sm ${invoiceUrl ? 'border-indigo-500 bg-indigo-50/50' : 'border-white/60 hover:border-indigo-300 hover:bg-white/70'}`}
                    >
                      {invoiceUrl ? (
                        <div className="flex flex-col items-center gap-1">
                          <Check size={16} className="text-indigo-600" />
                          <span className="text-[8px] font-black text-indigo-600 uppercase">Uploaded</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-slate-400">
                          <Camera size={16} />
                          <span className="text-[8px] font-black uppercase">Attach Bill</span>
                        </div>
                      )}
                    </label>
                    {invoiceUrl && (
                      <button
                        type="button"
                        onClick={() => setInvoiceUrl(undefined)}
                        className="absolute -top-1 -right-1 bg-white border border-slate-200 rounded-full p-0.5 text-slate-400 hover:text-red-500 shadow-sm"
                      >
                        <X size={10} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                    <Check size={10} /> Payment Proof
                  </label>
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => handleFileChange(e, setPaymentProofUrl)}
                      className="hidden"
                      id="proof-upload"
                    />
                    <label
                      htmlFor="proof-upload"
                      className={`w-full flex flex-col items-center justify-center p-3 border-2 border-dashed rounded-xl transition-all cursor-pointer bg-white/50 backdrop-blur-sm ${paymentProofUrl ? 'border-emerald-500 bg-emerald-50/50' : 'border-white/60 hover:border-emerald-300 hover:bg-white/70'}`}
                    >
                      {paymentProofUrl ? (
                        <div className="flex flex-col items-center gap-1">
                          <Check size={16} className="text-emerald-600" />
                          <span className="text-[8px] font-black text-emerald-600 uppercase">Attached</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-slate-400">
                          <Camera size={16} />
                          <span className="text-[8px] font-black uppercase">Attach Proof</span>
                        </div>
                      )}
                    </label>
                    {paymentProofUrl && (
                      <button
                        type="button"
                        onClick={() => setPaymentProofUrl(undefined)}
                        className="absolute -top-1 -right-1 bg-white border border-slate-200 rounded-full p-0.5 text-slate-400 hover:text-red-500 shadow-sm"
                      >
                        <X size={10} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</label>
              <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-4 py-3 bg-white/50 border border-white/60 rounded-xl text-[11px] font-medium placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 backdrop-blur-md" placeholder="e.g. FB Ad Payment" />
            </div>

            <div className="pt-2">
              <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} className="flex items-center gap-2 text-[10px] font-black text-indigo-500 uppercase tracking-widest hover:text-indigo-600 transition-colors">
                {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {showAdvanced ? 'Hide Advanced Context' : 'Add Context & Notes'}
              </button>

              {showAdvanced && (
                <div className="mt-4 space-y-4 animate-in slide-in-from-top-2">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><Tag size={10} /> Tags</label>
                    <input type="text" value={tags} onChange={(e) => setTags(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-medium" placeholder="comma separated" />
                    {allTags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {allTags.filter(tag => !tags.toLowerCase().includes(tag.toLowerCase())).slice(0, 8).map(tag => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => {
                              const currentTags = tags.split(',').map(t => t.trim()).filter(t => t !== '');
                              if (!currentTags.includes(tag)) {
                                setTags([...currentTags, tag].join(', ') + (currentTags.length > 0 ? '' : ''));
                              }
                            }}
                            className="px-2 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-100 border border-slate-200 rounded-lg text-[8px] font-black uppercase text-slate-400 transition-all"
                          >
                            + {tag}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><FileText size={10} /> Notes</label>
                    <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full px-4 py-3 bg-white/50 border border-white/60 rounded-xl text-[11px] font-medium min-h-[80px] resize-none focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 backdrop-blur-md placeholder:text-slate-400" placeholder="Extra details..." />
                  </div>
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={accounts.length === 0}
            className={`w-full py-4 rounded-2xl font-black text-white shadow-xl flex items-center justify-center gap-2 ${type === 'EXPENSE' ? 'bg-red-600 hover:bg-red-700 shadow-red-100' :
              type === 'REPAYMENT' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-100' :
                type === 'INCOME' ? 'bg-green-600 hover:bg-green-700 shadow-green-100' : 'bg-amber-600 hover:bg-amber-700 shadow-amber-100'
              } disabled:opacity-50 transition-all hover:scale-[1.01] active:scale-[0.99]`}
          >
            {type === 'REPAYMENT' ? 'Record Repayment' : (initialData && !initialData.id ? 'Add Duplicate' : 'Save Entry')} <ChevronRight size={16} />
          </button>
        </form >
      </div >
    </div >
  );
};

export default TransactionForm;