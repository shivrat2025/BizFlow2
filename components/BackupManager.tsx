import React from 'react';
import { History, Shield, Info, RefreshCw, Trash2, Clock } from 'lucide-react';

interface Props {
    backups: { id: string, date: number, label: string }[];
    onRestore: (id: string) => void;
    loading?: boolean;
}

const BackupManager: React.FC<Props> = ({ backups, onRestore, loading }) => {
    return (
        <div className="max-w-6xl mx-auto p-4 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4">
                <div>
                    <h2 className="text-4xl font-black text-slate-800 tracking-tight flex items-center gap-4">
                        <div className="bg-indigo-600 p-2.5 rounded-2xl text-white shadow-xl shadow-indigo-100">
                            <Shield size={32} strokeWidth={2.5} />
                        </div>
                        Data Backup Center
                    </h2>
                    <p className="text-slate-500 font-bold mt-2 ml-16 tracking-tight">
                        Restoration points for your entire financial ledger
                    </p>
                </div>

                <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-5 py-2.5 rounded-2xl border border-emerald-100 shadow-sm animate-pulse-slow">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                    <span className="text-xs font-black uppercase tracking-widest">Auto-Save Protection Active</span>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
                <div className="bg-white/60 backdrop-blur-xl border border-white/80 rounded-[2.5rem] p-8 shadow-2xl shadow-indigo-100/50">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <History className="text-indigo-600" size={24} strokeWidth={2.5} />
                            <h3 className="text-xl font-black text-slate-800 tracking-tight uppercase tracking-widest text-sm">7-Day Rolling History</h3>
                        </div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-lg">
                            {backups.length} Saved Points
                        </div>
                    </div>

                    {backups.length === 0 ? (
                        <div className="py-20 text-center border-2 border-dashed border-slate-200 rounded-[2rem] bg-slate-50/50">
                            <Shield className="mx-auto text-slate-300 mb-4" size={48} />
                            <p className="text-slate-500 text-sm font-black uppercase tracking-widest">No automated backups found yet.</p>
                            <p className="text-slate-400 text-xs font-bold mt-2 italic">Backups are created automatically on your first login of the day.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {backups.map((b) => (
                                <div
                                    key={b.id}
                                    className="group bg-white border border-slate-100 p-6 rounded-[2rem] shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between relative overflow-hidden"
                                >
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-bl-[4rem] -mr-8 -mt-8 opacity-40 transition-transform group-hover:scale-110"></div>

                                    <div className="relative z-10">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                                                <Clock size={18} />
                                            </div>
                                            <p className="text-lg font-black text-slate-800">{b.label}</p>
                                        </div>

                                        <div className="bg-slate-50 px-4 py-2 rounded-xl mb-6 inline-flex items-center gap-2">
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">
                                                Saved at {new Date(b.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                            </span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => onRestore(b.id)}
                                        disabled={loading}
                                        className="w-full py-4 bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-3 group-hover:scale-[1.02]"
                                    >
                                        <RefreshCw size={14} className={loading && b.id.includes('AUTO') ? 'animate-spin' : ''} />
                                        Restore This State
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="mt-10 p-6 bg-indigo-50/50 rounded-3xl border border-indigo-100 flex items-start gap-4">
                        <div className="bg-indigo-600 text-white p-2 rounded-xl mt-0.5">
                            <Info size={16} />
                        </div>
                        <div>
                            <p className="text-sm font-black text-indigo-900 tracking-tight">Security Protocol Advisory</p>
                            <p className="text-xs font-bold text-indigo-700/70 mt-1 leading-relaxed">
                                The restoration process will completely replace your current ledger data with the data from the selected date. This action is atomic and irreversible. Ensure you have no unsaved work before proceeding.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BackupManager;
