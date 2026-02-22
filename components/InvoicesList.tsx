import React, { useState, useMemo } from 'react';
import { jsPDF } from 'jspdf';
import { Search, Filter, Download, Plus, FileText, Check, Trash2, Calendar, LayoutGrid, FileSpreadsheet, Printer, X, Pencil, Package, Eye, ArrowUpDown, ArrowUp, ArrowDown, AlertCircle } from 'lucide-react';
import { Transaction, Account, ExpenseCategory } from '../types';

interface Props {
    transactions: Transaction[];
    accounts: Account[];
    categories: ExpenseCategory[];
    onUpdate: (id: string, updates: Partial<Transaction>) => void;
    onDelete: (id: string) => void;
    onEdit: (tx: Transaction) => void;
    suppliers: { id: string; name: string }[];
}

const InvoicesList: React.FC<Props> = ({ transactions, accounts, categories, onUpdate, onDelete, onEdit, suppliers }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFilter, setDateFilter] = useState('ALL_TIME');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'PAID' | 'PENDING'>('ALL');
    const [supplierFilter, setSupplierFilter] = useState('ALL');
    const [viewingAttachment, setViewingAttachment] = useState<{ url: string; title: string } | null>(null);
    const [sortKey, setSortKey] = useState<'date' | 'amount' | 'status' | 'createdAt'>('createdAt');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    const getAccountName = (id?: string) => {
        return accounts.find(a => a.id === id)?.name || 'N/A';
    };

    const getCategoryLabel = (id?: string) => {
        if (!id) return 'Misc';
        return categories.find(c => c.id === id)?.label || id;
    };

    const getSupplierName = (id?: string) => {
        if (!id) return 'Unknown';
        return suppliers.find(s => s.id === id)?.name || 'Unknown';
    };

    const invoiceTransactions = useMemo(() => {
        return transactions
            .filter(t => (t.type === 'EXPENSE' && t.expenseCategory === 'PRODUCT') || t.invoiceUrl || t.paymentProofUrl);
    }, [transactions]);

    const filteredInvoices = useMemo(() => {
        let list = [...invoiceTransactions];

        if (searchTerm) {
            const lowSearch = searchTerm.toLowerCase();
            list = list.filter(t =>
                t.description?.toLowerCase().includes(lowSearch) ||
                t.amount.toString().includes(lowSearch) ||
                t.notes?.toLowerCase().includes(lowSearch) ||
                getCategoryLabel(t.expenseCategory).toLowerCase().includes(lowSearch) ||
                getAccountName(t.sourceAccountId).toLowerCase().includes(lowSearch) ||
                getSupplierName(t.supplierId).toLowerCase().includes(lowSearch)
            );
        }

        if (supplierFilter !== 'ALL') {
            list = list.filter(t => t.supplierId === supplierFilter);
        }

        if (dateFilter !== 'ALL_TIME') {
            const now = Date.now();
            const dayMs = 24 * 60 * 60 * 1000;
            if (dateFilter === 'TODAY') list = list.filter(t => now - t.date < dayMs);
            if (dateFilter === 'THIS_WEEK') list = list.filter(t => now - t.date < 7 * dayMs);
            if (dateFilter === 'THIS_MONTH') list = list.filter(t => now - t.date < 30 * dayMs);
            if (dateFilter === 'THIS_YEAR') {
                const yearStart = new Date(new Date().getFullYear(), 0, 1).getTime();
                list = list.filter(t => t.date >= yearStart);
            }
        }

        if (statusFilter !== 'ALL') {
            list = list.filter(t => {
                const isPaid = !!t.paymentProofUrl;
                return statusFilter === 'PAID' ? isPaid : !isPaid;
            });
        }

        // Sorting
        list.sort((a, b) => {
            const multiplier = sortOrder === 'asc' ? 1 : -1;
            if (sortKey === 'date') return (a.date - b.date) * multiplier;
            if (sortKey === 'amount') return (a.amount - b.amount) * multiplier;
            if (sortKey === 'status') {
                const aPaid = !!a.paymentProofUrl;
                const bPaid = !!b.paymentProofUrl;
                if (aPaid === bPaid) return 0;
                return (aPaid ? 1 : -1) * multiplier;
            }
            if (sortKey === 'createdAt') {
                const aTime = a.createdAt || a.date;
                const bTime = b.createdAt || b.date;
                return (aTime - bTime) * multiplier;
            }
            return 0;
        });

        return list;
    }, [invoiceTransactions, dateFilter, searchTerm, statusFilter, supplierFilter, suppliers, sortKey, sortOrder]);

    const toggleSort = (key: 'date' | 'amount' | 'status' | 'createdAt') => {
        if (sortKey === key) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortOrder('desc');
        }
    };

    const SortIcon = ({ k }: { k: 'date' | 'amount' | 'status' | 'createdAt' }) => {
        if (sortKey !== k) return <ArrowUpDown size={12} className="opacity-30 group-hover:opacity-100 ml-1" />;
        return sortOrder === 'asc' ? <ArrowUp size={12} className="text-indigo-600 ml-1" /> : <ArrowDown size={12} className="text-indigo-600 ml-1" />;
    };

    const exportToCSV = () => {
        const headers = ['Date', 'Description', 'Category', 'Account', 'Amount', 'Status'];
        const rows = filteredInvoices.map(t => [
            new Date(t.date).toLocaleDateString(),
            t.description || 'N/A',
            getCategoryLabel(t.expenseCategory),
            getAccountName(t.sourceAccountId),
            t.amount,
            t.paymentProofUrl ? 'Paid' : 'Unpaid'
        ]);

        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `invoices_export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const exportToPDF = async () => {
        const doc = new jsPDF();
        let yPos = 20;

        doc.setFontSize(22);
        doc.setTextColor(30, 41, 59);
        doc.text("Business Invoices Report", 105, yPos, { align: 'center' });
        yPos += 15;

        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 105, yPos, { align: 'center' });
        yPos += 20;

        // Summary Table
        doc.setFillColor(241, 245, 249);
        doc.rect(14, yPos, 182, 10, 'F');
        doc.setFontSize(10);
        doc.setTextColor(30, 41, 59);
        doc.setFont("helvetica", "bold");
        doc.text("Date", 20, yPos + 7);
        doc.text("Description", 50, yPos + 7);
        doc.text("Amount", 140, yPos + 7);
        doc.text("Status", 170, yPos + 7);
        yPos += 15;

        doc.setFont("helvetica", "normal");
        filteredInvoices.forEach((t) => {
            if (yPos > 270) {
                doc.addPage();
                yPos = 20;
            }
            doc.text(new Date(t.date).toLocaleDateString(), 20, yPos);
            doc.text((t.description || 'N/A').substring(0, 40), 50, yPos);
            doc.text(`Rs. ${t.amount.toLocaleString()}`, 140, yPos);
            doc.text(t.paymentProofUrl ? "PAID" : "PENDING", 170, yPos);
            yPos += 10;
        });

        // Bills
        const billsToInclude = filteredInvoices.filter(t => t.invoiceUrl && t.invoiceUrl.startsWith('data:image/'));
        for (const t of billsToInclude) {
            doc.addPage();
            doc.setFontSize(16);
            doc.setFont("helvetica", "bold");
            doc.text(`Bill For: ${t.description}`, 20, 20);
            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.text(`Date: ${new Date(t.date).toLocaleDateString()} | Amount: Rs. ${t.amount.toLocaleString()}`, 20, 30);

            try {
                doc.addImage(t.invoiceUrl!, 'JPEG', 20, 40, 170, 0);
            } catch (e) {
                doc.text("Image rendering failed.", 20, 50);
            }
        }

        doc.save(`ledger_report_${new Date().toISOString().split('T')[0]}.pdf`);
    };

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

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, id: string, field: 'invoiceUrl' | 'paymentProofUrl') => {
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

    const formatTime = (timestamp?: number) => {
        if (!timestamp) return '';
        return new Date(timestamp).toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit'
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
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
            {/* Professional Toolbar */}
            <div className="bg-white/70 backdrop-blur-3xl rounded-[2rem] border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
                <div className="p-4 md:p-6 flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6 bg-transparent">
                    {/* Search & Pending Group */}
                    <div className="flex-1 flex items-center gap-4">
                        <div className="relative flex-1 group">
                            <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors">
                                <Search size={18} />
                            </div>
                            <input
                                type="text"
                                placeholder="Search amount, supplier or details..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full h-12 pl-12 pr-6 bg-white/50 border border-white/60 rounded-2xl text-[12px] font-bold text-slate-700 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 focus:bg-white/80 transition-all duration-300 placeholder:text-slate-400 shadow-inner backdrop-blur-md"
                            />
                        </div>

                        {invoiceTransactions.filter(t => !t.paymentProofUrl).length > 0 && (
                            <div className="flex h-12 px-5 items-center gap-3 bg-amber-50 rounded-2xl border border-amber-100/50 shrink-0">
                                <AlertCircle size={14} className="text-amber-500" />
                                <div className="flex flex-col">
                                    <span className="text-[7px] font-black text-amber-600 uppercase tracking-widest leading-none">Due</span>
                                    <span className="text-xs font-black text-slate-900 leading-none mt-1">
                                        {invoiceTransactions.filter(t => !t.paymentProofUrl).length}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Filter Cluster */}
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center h-12 px-2 bg-white/50 border border-white/60 rounded-2xl gap-1 backdrop-blur-md">
                            {[
                                { id: 'ALL', label: 'All' },
                                { id: 'PAID', label: 'Paid' },
                                { id: 'PENDING', label: 'Due' }
                            ].map(status => (
                                <button
                                    key={status.id}
                                    onClick={() => setStatusFilter(status.id as any)}
                                    className={`h-8 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${statusFilter === status.id ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    {status.label}
                                </button>
                            ))}
                        </div>

                        <select
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                            className="h-12 px-5 bg-white/50 border border-white/60 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-700 outline-none hover:bg-white/70 hover:border-indigo-200 transition-all cursor-pointer min-w-[130px] shadow-sm appearance-none backdrop-blur-md"
                        >
                            <option value="ALL_TIME">Timeline: All</option>
                            <option value="TODAY">Last 24h</option>
                            <option value="THIS_WEEK">Weekly</option>
                            <option value="THIS_MONTH">Monthly</option>
                        </select>

                        <select
                            value={supplierFilter}
                            onChange={(e) => setSupplierFilter(e.target.value)}
                            className="h-12 px-5 bg-white/50 border border-white/60 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-700 outline-none hover:bg-white/70 hover:border-indigo-200 transition-all cursor-pointer min-w-[150px] shadow-sm appearance-none backdrop-blur-md"
                        >
                            <option value="ALL">All Suppliers</option>
                            {suppliers.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>

                        <div className="flex items-center gap-1.5 h-12 pl-2 pr-2 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-100">
                            <button
                                onClick={exportToCSV}
                                className="w-8 h-8 flex items-center justify-center text-white/70 hover:text-white transition-colors"
                                title="CSV"
                            >
                                <FileSpreadsheet size={16} />
                            </button>
                            <div className="w-px h-6 bg-white/20" />
                            <button
                                onClick={exportToPDF}
                                className="flex h-8 items-center gap-2 px-4 text-white font-black text-[10px] uppercase tracking-widest hover:text-indigo-200 transition-all"
                            >
                                <Printer size={16} /> Print Report
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Desktop View */}
            <div className="hidden md:block bg-white/70 backdrop-blur-3xl rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-white/50 border-b border-white/40">
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer group" onClick={() => toggleSort(sortKey === 'createdAt' ? 'date' : 'createdAt')}>
                                    <div className="flex items-center">{sortKey === 'createdAt' ? 'Entry Time' : 'Invoice Date'} <SortIcon k={sortKey === 'createdAt' ? 'createdAt' : 'date'} /></div>
                                </th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Expense Details</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center cursor-pointer group" onClick={() => toggleSort('amount')}>
                                    <div className="flex items-center justify-center">Amount <SortIcon k="amount" /></div>
                                </th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center cursor-pointer group" onClick={() => toggleSort('status')}>
                                    <div className="flex items-center justify-center">Status <SortIcon k="status" /></div>
                                </th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Docs</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredInvoices.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-300 font-bold uppercase tracking-widest text-[10px]">
                                        No invoices found.
                                    </td>
                                </tr>
                            ) : (
                                filteredInvoices.map(t => (
                                    <tr key={t.id} className="hover:bg-white/50 transition-colors group border-b border-gray-50/30">
                                        <td className="px-8 py-6">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-black text-slate-700">{formatDate(t.date)}</span>
                                                {t.createdAt && <span className="text-[8px] text-slate-300 font-medium tracking-tight mt-0.5">Entered at {formatTime(t.createdAt)}</span>}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                                                    <Package size={18} />
                                                </div>
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-xs font-black text-slate-800">{getCategoryLabel(t.expenseCategory)}</span>
                                                        {t.supplierId && (
                                                            <span className="text-[9px] font-black bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-md uppercase tracking-tighter">
                                                                {getSupplierName(t.supplierId)}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className="text-[10px] font-bold text-slate-400 leading-tight">{t.description}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="text-center">
                                                <span className="text-xs font-black text-slate-800">₹{t.amount.toLocaleString()}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex justify-center">
                                                {t.paymentProofUrl ? (
                                                    <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100">
                                                        <Check size={10} />
                                                        <span className="text-[8px] font-black uppercase">Paid</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-600 rounded-full border border-amber-100">
                                                        <X size={10} />
                                                        <span className="text-[8px] font-black uppercase tracking-widest">Pending</span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center justify-center gap-3">
                                                <div className="flex flex-col gap-2 min-w-[120px]">
                                                    {t.invoiceUrl ? (
                                                        <div className="flex items-center gap-1">
                                                            <button
                                                                onClick={() => setViewingAttachment({ url: t.invoiceUrl!, title: 'Invoice/Bill' })}
                                                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-lg text-[8px] font-black uppercase text-indigo-600 hover:bg-indigo-100 transition-all"
                                                            >
                                                                <FileText size={10} /> View Bill
                                                            </button>
                                                            <button
                                                                onClick={() => { if (confirm('Remove this bill?')) onUpdate(t.id, { invoiceUrl: '' }) }}
                                                                className="p-1.5 bg-rose-50 border border-rose-100 rounded-lg text-rose-500 hover:bg-rose-100 transition-all"
                                                                title="Delete Bill"
                                                            >
                                                                <Trash2 size={10} />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="relative">
                                                            <input type="file" accept="image/*,application/pdf" onChange={(e) => handleFileChange(e, t.id, 'invoiceUrl')} className="hidden" id={`inv-bill-${t.id}`} />
                                                            <label htmlFor={`inv-bill-${t.id}`} className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white/50 border border-slate-100 rounded-lg text-[8px] font-black uppercase text-slate-500 hover:bg-white hover:border-indigo-200 hover:text-indigo-500 cursor-pointer transition-all">
                                                                <Plus size={10} /> Add Bill
                                                            </label>
                                                        </div>
                                                    )}

                                                    {t.paymentProofUrl ? (
                                                        <div className="flex items-center gap-1">
                                                            <button
                                                                onClick={() => setViewingAttachment({ url: t.paymentProofUrl!, title: 'Payment Proof' })}
                                                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-lg text-[8px] font-black uppercase text-emerald-600 hover:bg-emerald-100 transition-all"
                                                            >
                                                                <Check size={10} /> View Proof
                                                            </button>
                                                            <button
                                                                onClick={() => { if (confirm('Remove this proof?')) onUpdate(t.id, { paymentProofUrl: '' }) }}
                                                                className="p-1.5 bg-rose-50 border border-rose-100 rounded-lg text-rose-500 hover:bg-rose-100 transition-all"
                                                                title="Delete Proof"
                                                            >
                                                                <Trash2 size={10} />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="relative">
                                                            <input type="file" accept="image/*,application/pdf" onChange={(e) => handleFileChange(e, t.id, 'paymentProofUrl')} className="hidden" id={`inv-proof-${t.id}`} />
                                                            <label htmlFor={`inv-proof-${t.id}`} className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white/50 border border-slate-100 rounded-lg text-[8px] font-black uppercase text-slate-500 hover:bg-white hover:border-emerald-200 hover:text-emerald-500 cursor-pointer transition-all">
                                                                <Plus size={10} /> Add Proof
                                                            </label>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => onEdit(t)}
                                                    className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 transition-all"
                                                >
                                                    <Pencil size={16} />
                                                </button>
                                                <button
                                                    onClick={() => { if (confirm('Delete entire transaction?')) onDelete(t.id) }}
                                                    className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:bg-rose-50 hover:text-rose-600 transition-all"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Mobile View */}
            <div className="md:hidden space-y-3">
                {filteredInvoices.map(t => (
                    <div key={t.id} className="bg-white/70 backdrop-blur-xl p-4 rounded-2xl border border-white/60 shadow-sm">
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white rounded-xl shadow-sm text-indigo-600">
                                    <FileText size={18} />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="text-[11px] font-black text-slate-800 uppercase tracking-tight truncate">{getCategoryLabel(t.expenseCategory)}</p>
                                        {t.supplierId && (
                                            <span className="text-[8px] font-black bg-indigo-50 text-indigo-500 px-1.5 py-0.5 rounded uppercase flex-shrink-0">
                                                {getSupplierName(t.supplierId)}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[9px] text-slate-400 font-bold">{formatDate(t.date)}</p>
                                    {t.createdAt && <p className="text-[7px] text-slate-300 font-medium tracking-tight">At {formatTime(t.createdAt)}</p>}
                                </div>
                            </div>
                            <p className="font-mono font-black text-sm text-slate-900">₹{t.amount.toLocaleString()}</p>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-slate-200/50">
                            <div className="flex gap-2">
                                {t.invoiceUrl && (
                                    <button
                                        onClick={() => setViewingAttachment({ url: t.invoiceUrl!, title: 'Invoice' })}
                                        className="px-3 py-2 bg-indigo-600 text-white rounded-xl text-[8px] font-black uppercase tracking-widest"
                                    >
                                        Bill
                                    </button>
                                )}
                                {t.paymentProofUrl && (
                                    <button
                                        onClick={() => setViewingAttachment({ url: t.paymentProofUrl!, title: 'Proof' })}
                                        className="px-3 py-2 bg-emerald-600 text-white rounded-xl text-[8px] font-black uppercase tracking-widest"
                                    >
                                        Proof
                                    </button>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => onEdit(t)} className="p-2 text-slate-400"><Pencil size={18} /></button>
                                <button onClick={() => onDelete(t.id)} className="p-2 text-slate-400"><Trash2 size={18} /></button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Attachment Preview Modal */}
            {viewingAttachment && (
                <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-[1000] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">{viewingAttachment.title}</h3>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px]">Attached Document Preview</p>
                            </div>
                            <div className="flex gap-2">
                                <a
                                    href={viewingAttachment.url}
                                    download={`document_${Date.now()}`}
                                    className="p-3 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-2xl transition-all"
                                    title="Download"
                                >
                                    <Download size={20} />
                                </a>
                                <button
                                    onClick={() => setViewingAttachment(null)}
                                    className="p-3 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-red-500 rounded-2xl transition-all"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-auto bg-slate-100 p-4 flex items-center justify-center min-h-[400px]">
                            {viewingAttachment.url.startsWith('data:application/pdf') ? (
                                <iframe src={viewingAttachment.url} className="w-full h-full min-h-[500px] border-none" />
                            ) : (
                                <img src={viewingAttachment.url} alt="Preview" className="max-w-full h-auto rounded-xl shadow-lg border border-white" />
                            )}
                        </div>
                        <div className="p-6 border-t border-slate-100 bg-white">
                            <button
                                onClick={() => setViewingAttachment(null)}
                                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs"
                            >
                                Close document
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InvoicesList;
