
import React, { useState } from 'react';
import { Cloud, Copy, Check, ShieldCheck, RefreshCw, LogOut, Zap, Trash2, AlertTriangle, ShieldAlert, Shield } from 'lucide-react';

interface Props {
  workspaceId: string;
  loading: boolean;
  lastSynced: number | null;
  onLogout: () => void;
  onDeleteWorkspace: () => void;
  onExport: () => void;
  onCreateSnapshot: (label: string) => void;
}

const CloudSync: React.FC<Props> = ({ workspaceId, loading, lastSynced, onLogout, onDeleteWorkspace, onExport, onCreateSnapshot }) => {
  const [copiedKey, setCopiedKey] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const copyKey = () => {
    navigator.clipboard.writeText(workspaceId);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 max-w-5xl">
      <div className="bg-white/70 backdrop-blur-3xl p-8 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-10 gap-6">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-indigo-50 text-indigo-600 rounded-3xl shadow-lg shadow-indigo-50">
              <ShieldCheck size={32} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">Cloud Workspace</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Real-time sync and Ledger Vault</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-2 text-indigo-600 font-black text-[10px] uppercase tracking-widest bg-indigo-50 px-6 py-4 rounded-2xl hover:bg-indigo-100 transition-all shadow-sm"
          >
            <LogOut size={16} /> Logout from Device
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Workspace Key */}
          <div className="p-8 bg-slate-50/50 rounded-[2rem] border border-slate-100 flex flex-col justify-between lg:col-span-1">
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Your Secret Workspace Key</span>
              <div className="flex items-center justify-between bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <span className="font-mono font-black text-slate-700 tracking-tighter text-lg">{workspaceId}</span>
                <button onClick={copyKey} className="text-indigo-600 bg-indigo-50 p-2 rounded-xl hover:bg-indigo-100 transition-all">
                  {copiedKey ? <Check size={20} /> : <Copy size={20} />}
                </button>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 mt-6 leading-relaxed font-bold bg-white/50 p-4 rounded-xl border border-dashed border-slate-200">
              Share this key to access your ledger from multiple phones or PCs.
            </p>
          </div>

          {/* JSON Export */}
          <div className="p-8 bg-emerald-600 text-white rounded-[2rem] shadow-xl flex flex-col justify-between relative overflow-hidden group hover:scale-[1.02] transition-all cursor-pointer" onClick={onExport}>
            <RefreshCw size={120} className="absolute -bottom-8 -right-8 text-white/10 rotate-12" />
            <div className="relative z-10">
              <span className="text-[10px] font-black text-emerald-100 uppercase tracking-widest block mb-1">Safety First</span>
              <h4 className="text-lg font-black mb-4">JSON Data Export</h4>
              <p className="text-[10px] font-bold text-emerald-50 mb-6 leading-relaxed">
                Download a complete copy of your accounts and transactions as a secure JSON file for offline storage.
              </p>
              <button className="w-full bg-white text-emerald-600 py-4 rounded-2xl font-black text-[10px] uppercase shadow-lg group-hover:bg-emerald-50 transition-all">
                Export All Data (.json)
              </button>
            </div>
          </div>

          {/* Save Point */}
          <div
            className="p-8 bg-amber-600 text-white rounded-[2rem] shadow-xl flex flex-col justify-between relative overflow-hidden group hover:scale-[1.02] transition-all cursor-pointer"
            onClick={() => onCreateSnapshot('Manual Protection Point')}
          >
            <Shield size={120} className="absolute -bottom-8 -right-8 text-white/10 rotate-12" />
            <div className="relative z-10">
              <span className="text-[10px] font-black text-amber-100 uppercase tracking-widest block mb-1">Instant Protection</span>
              <h4 className="text-lg font-black mb-4">Save Point Now</h4>
              <p className="text-[10px] font-bold text-amber-50 mb-6 leading-relaxed">
                Manually trigger a snapshot of your entire database. It will be stored in your date-wise history for 3 days.
              </p>
              <button className="w-full bg-white text-amber-600 py-4 rounded-2xl font-black text-[10px] uppercase shadow-lg group-hover:bg-amber-50 transition-all flex items-center justify-center gap-3">
                <Shield size={16} strokeWidth={3} /> Backup Current State
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-red-50/30 backdrop-blur-xl border border-red-100/60 p-8 rounded-[2.5rem] mt-12 overflow-hidden relative shadow-sm">
        <ShieldAlert size={120} className="absolute -bottom-10 -right-10 text-red-500/5 rotate-12" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-red-100 text-red-600 rounded-2xl">
              <Trash2 size={24} />
            </div>
            <div>
              <h3 className="text-lg font-black text-red-900">Danger Zone</h3>
              <p className="text-[10px] font-black text-red-400 uppercase tracking-widest">Permanent Account Deletion</p>
            </div>
          </div>

          {!showDeleteConfirm ? (
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="max-w-md">
                <p className="text-sm font-bold text-red-900/60 mb-2">Delete Workspace forever?</p>
                <p className="text-[11px] text-red-800/40 font-medium leading-relaxed">
                  This will wipe all accounts, transactions, rules, and categories from the cloud database. This action cannot be undone.
                </p>
              </div>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="bg-red-600 text-white px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-red-200 hover:bg-red-700 transition-all"
              >
                Delete Everything Forever
              </button>
            </div>
          ) : (
            <div className="bg-white p-6 rounded-[2rem] border border-red-200 animate-in zoom-in-95">
              <p className="text-xs font-black text-red-600 mb-4 uppercase tracking-widest flex items-center gap-2">
                <AlertTriangle size={14} /> Confirmation Required
              </p>
              <p className="text-xs text-slate-500 font-medium mb-6">
                Please type your Workspace Key <span className="font-black text-slate-900 select-all">"{workspaceId}"</span> to confirm.
              </p>
              <div className="flex flex-col md:flex-row gap-4">
                <input
                  type="text"
                  placeholder="Enter Workspace Key..."
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  className="flex-1 px-5 py-3 border border-slate-200/60 bg-white/50 backdrop-blur-md rounded-xl font-mono text-sm outline-none focus:border-red-500 focus:bg-white/70"
                />
                <button
                  disabled={deleteConfirmText !== workspaceId}
                  onClick={onDeleteWorkspace}
                  className="bg-red-600 text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase disabled:opacity-30 disabled:grayscale transition-all"
                >
                  Wipe Data Now
                </button>
                <button
                  onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); }}
                  className="bg-slate-100 text-slate-600 px-6 py-3 rounded-xl font-black text-[10px] uppercase"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CloudSync;
