import React, { useState } from 'react';
import { History, Shield, RefreshCw, Clock, Download, AlertCircle, Zap, CheckCircle } from 'lucide-react';

interface BackupEntry {
    id: string;
    date: number;
    label: string;
    isManual?: boolean;
}

interface Props {
    backups: BackupEntry[];
    onRestore: (id: string) => void;
    onCreateSnapshot?: (label?: string, isAuto?: boolean) => Promise<void>;
    loading?: boolean;
}

const BackupManager: React.FC<Props> = ({ backups, onRestore, onCreateSnapshot, loading }) => {
    const [saving, setSaving] = useState(false);

    const handleManualBackup = async () => {
        if (!onCreateSnapshot) return;
        setSaving(true);
        try {
            await onCreateSnapshot(undefined, false);
        } finally {
            setSaving(false);
        }
    };

    // Split into manual and auto
    const manualBackups = backups.filter(b => b.isManual);
    const autoBackups = backups.filter(b => !b.isManual);

    const BackupCard = ({ entry }: { entry: BackupEntry }) => (
        <div className="group bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-lg hover:border-indigo-200 transition-all duration-200 flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-start gap-3">
                <div className={`p-2 rounded-xl flex-shrink-0 ${entry.isManual ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-500'}`}>
                    {entry.isManual ? <Zap size={16} /> : <Clock size={16} />}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${entry.isManual ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                            {entry.isManual ? 'Manual' : 'Auto'}
                        </span>
                    </div>
                    <p className="text-sm font-black text-slate-800 mt-1 leading-tight">{entry.label}</p>
                    <p className="text-[9px] text-slate-400 font-medium mt-0.5">
                        {new Date(entry.date).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                </div>
            </div>

            {/* Restore Button */}
            <button
                onClick={() => onRestore(entry.id)}
                disabled={loading}
                className="w-full py-2.5 bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-sm shadow-indigo-200 flex items-center justify-center gap-2 group-hover:shadow-md"
            >
                <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
                Restore This State
            </button>
        </div>
    );

    return (
        <div className="max-w-5xl mx-auto p-4 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-8">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-4">
                        <div className="bg-indigo-600 p-2.5 rounded-2xl text-white shadow-xl shadow-indigo-100">
                            <Shield size={28} strokeWidth={2.5} />
                        </div>
                        Data Backup Center
                    </h2>
                    <p className="text-slate-500 font-bold mt-2 ml-[60px] tracking-tight text-sm">
                        Auto-backup every 12 hrs · 3-day rolling history · up to 12 snapshots
                    </p>
                </div>
                <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-2xl border border-emerald-100 shadow-sm">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                    <span className="text-xs font-black uppercase tracking-widest">Auto-Save Active</span>
                </div>
            </div>

            {/* ── BACKUP NOW CTA ────────────────────────────────── */}
            <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-3xl p-6 shadow-2xl shadow-indigo-200 text-white relative overflow-hidden">
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white to-transparent pointer-events-none" />
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-5">
                    <div>
                        <p className="text-xs font-black uppercase tracking-widest text-indigo-200 mb-1">Manual Backup</p>
                        <h3 className="text-xl font-black tracking-tight">Save Current State Now</h3>
                        <p className="text-indigo-200 text-sm font-medium mt-1">
                            Captures all transactions, accounts & balances at this exact moment.
                        </p>
                    </div>
                    <button
                        onClick={handleManualBackup}
                        disabled={saving || loading}
                        className="flex-shrink-0 flex items-center gap-3 bg-white text-indigo-700 hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg transition-all active:scale-95"
                    >
                        {saving ? (
                            <><RefreshCw size={18} className="animate-spin" /> Saving…</>
                        ) : (
                            <><Download size={18} /> Backup Now</>
                        )}
                    </button>
                </div>
            </div>

            {/* ── BACKUP LIST ────────────────────────────────────── */}
            {backups.length === 0 ? (
                <div className="py-20 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
                    <Shield className="mx-auto text-slate-300 mb-4" size={48} />
                    <p className="text-slate-500 text-sm font-black uppercase tracking-widest">No backups yet.</p>
                    <p className="text-slate-400 text-xs font-medium mt-2">
                        Click "Backup Now" above or wait for the automatic 12-hour checkpoint.
                    </p>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Manual backups */}
                    {manualBackups.length > 0 && (
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <Zap size={13} className="text-indigo-500" />
                                <h4 className="text-[9px] font-black uppercase tracking-widest text-slate-500">Manual Backups</h4>
                                <span className="text-[8px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-black">{manualBackups.length}</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {manualBackups.map(b => <BackupCard key={b.id} entry={b} />)}
                            </div>
                        </div>
                    )}

                    {/* Auto backups */}
                    {autoBackups.length > 0 && (
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <Clock size={13} className="text-slate-400" />
                                <h4 className="text-[9px] font-black uppercase tracking-widest text-slate-400">Automatic Backups (every 12h)</h4>
                                <span className="text-[8px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-black">{autoBackups.length} / 12</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {autoBackups.map(b => <BackupCard key={b.id} entry={b} />)}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Info box */}
            <div className="p-5 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-3">
                <AlertCircle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                    <p className="text-sm font-black text-amber-900">Restore Warning</p>
                    <p className="text-xs font-medium text-amber-700/80 mt-0.5 leading-relaxed">
                        Restoring replaces your current ledger completely with the selected snapshot. This action cannot be undone — back up your current state first before restoring an older one.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default BackupManager;
