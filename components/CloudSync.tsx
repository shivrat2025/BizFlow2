
import React, { useState } from 'react';
import { Cloud, Copy, Check, ShieldCheck, RefreshCw, LogOut, Zap, Info, Trash2, AlertTriangle, ShieldAlert, Shield } from 'lucide-react';

interface Props {
  url: string;
  setUrl: (url: string) => void;
  workspaceId: string;
  loading: boolean;
  lastSynced: number | null;
  onLogout: () => void;
  onDeleteWorkspace: () => void;
  onExport: () => void;
  onCreateSnapshot: (label: string) => void;
}

const CloudSync: React.FC<Props> = ({ url, setUrl, workspaceId, loading, lastSynced, onLogout, onDeleteWorkspace, onExport, onCreateSnapshot }) => {
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const scriptCode = `// --- BIZFLOW ADVANCED TWO-WAY SYNC SCRIPT ---
function doGet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var accounts = getSheetDataAsJson(ss, "Accounts");
  var transactions = getSheetDataAsJson(ss, "Transactions");
  transactions = transactions.map(function(t) {
    if (t.date instanceof Date) t.date = t.date.getTime();
    return t;
  });
  return ContentService.createTextOutput(JSON.stringify({accounts: accounts, transactions: transactions}))
    .setMimeType(ContentService.MimeType.JSON);
}
function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  writeAccounts(ss, data.accounts);
  writeTransactions(ss, data.transactions);
  writeDashboard(ss, data.stats);
  return ContentService.createTextOutput("Success");
}
function getSheetDataAsJson(ss, sheetName) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  var headers = data[0];
  var rows = data.slice(1);
  return rows.map(function(row) {
    var obj = {};
    headers.forEach(function(header, i) { obj[header] = row[i]; });
    return obj;
  });
}
function writeAccounts(ss, accounts) {
  var sheet = ss.getSheetByName("Accounts") || ss.insertSheet("Accounts");
  sheet.clear();
  sheet.appendRow(["id", "name", "type", "balance", "limit"]);
  accounts.forEach(function(a) { sheet.appendRow([a.id, a.name, a.type, a.balance, a.limit || 0]); });
}
function writeTransactions(ss, txs) {
  var sheet = ss.getSheetByName("Transactions") || ss.insertSheet("Transactions");
  sheet.clear();
  sheet.appendRow(["id", "date", "amount", "type", "description", "sourceAccountId", "incomeSource", "expenseCategory", "isProfitWithdrawal"]);
  txs.forEach(function(t) { sheet.appendRow([t.id, new Date(t.date), t.amount, t.type, t.description, t.sourceAccountId || "", t.incomeSource || "", t.expenseCategory || "", t.isProfitWithdrawal]); });
}
function writeDashboard(ss, stats) {
  var sheet = ss.getSheetByName("Dashboard") || ss.insertSheet("Dashboard");
  sheet.clear();
  sheet.appendRow(["METRIC", "VALUE"]);
  sheet.appendRow(["COD Pool Balance", stats.codPool]);
  sheet.appendRow(["Prepaid Pool Balance", stats.prepaidPool]);
  sheet.appendRow(["Total COD Income", stats.totalCodIncome]);
  sheet.appendRow(["Total Prepaid Income", stats.totalPrepaidIncome]);
  sheet.appendRow(["OD Capital Usage", stats.totalExternalCap]);
  sheet.appendRow(["Total Expenses", stats.totalExpenses]);
  sheet.appendRow(["Total Profit Withdrawn", stats.totalWithdrawals]);
}`;

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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="p-8 bg-slate-50/50 rounded-[2rem] border border-slate-100 flex flex-col justify-between">
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

          <div className="p-8 bg-indigo-600 text-white rounded-[2rem] shadow-xl flex flex-col justify-between relative overflow-hidden">
            <Zap size={120} className="absolute -bottom-8 -right-8 text-indigo-500/20" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-black text-indigo-100 uppercase tracking-widest block">Google Sheets Sync Target</span>
                {loading ? (
                  <RefreshCw size={18} className="animate-spin text-white" />
                ) : (
                  <Zap size={18} className="text-amber-300 fill-amber-300" />
                )}
              </div>
              <input
                type="text"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="Paste App Script URL..."
                className="w-full px-5 py-4 bg-white/10 border border-white/20 rounded-2xl outline-none text-xs font-mono mb-4 text-white placeholder:text-white/40 focus:bg-white/20 transition-all backdrop-blur-md"
              />
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full shadow-sm ${url ? 'bg-green-400' : 'bg-white/20'}`} />
                <span className="text-[10px] font-black uppercase tracking-wider">
                  {url ? 'Sheets Connector Active' : 'Sheets Offline'}
                </span>
              </div>
            </div>
          </div>

          <div className="p-8 bg-emerald-600 text-white rounded-[2rem] shadow-xl flex flex-col justify-between relative overflow-hidden group hover:scale-[1.02] transition-all cursor-pointer" onClick={onExport}>
            <RefreshCw size={120} className="absolute -bottom-8 -right-8 text-white/10 rotate-12" />
            <div className="relative z-10">
              <span className="text-[10px] font-black text-emerald-100 uppercase tracking-widest block mb-1">Safety First</span>
              <h4 className="text-lg font-black mb-4">JSON Data Export</h4>
              <p className="text-[10px] font-bold text-emerald-50 mb-6 leading-relaxed">
                Download a complete copy of your accounts and transactions as a secure JSON file for offline storage.
              </p>
              <button
                className="w-full bg-white text-emerald-600 py-4 rounded-2xl font-black text-[10px] uppercase shadow-lg group-hover:bg-emerald-50 transition-all"
              >
                Export All Data (.json)
              </button>
            </div>
          </div>

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
              <button
                className="w-full bg-white text-amber-600 py-4 rounded-2xl font-black text-[10px] uppercase shadow-lg group-hover:bg-amber-50 transition-all flex items-center justify-center gap-3"
              >
                <Shield size={16} strokeWidth={3} /> Backup Current State
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white/70 backdrop-blur-3xl p-8 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
              <Info size={24} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800">Sheets Automation</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Connect your ledger to Excel/Sheets</p>
            </div>
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(scriptCode);
              setCopiedScript(true);
              setTimeout(() => setCopiedScript(false), 2000);
            }}
            className="flex items-center gap-2 text-indigo-600 font-black text-[10px] uppercase tracking-widest bg-indigo-50 px-6 py-4 rounded-2xl hover:bg-indigo-100 transition-all border border-indigo-100/50"
          >
            {copiedScript ? <Check size={16} /> : <Copy size={16} />}
            {copiedScript ? 'Copied' : 'Copy Script'}
          </button>
        </div>
        <pre className="bg-slate-900/90 backdrop-blur-xl text-slate-300 p-8 rounded-[2rem] text-[11px] overflow-x-auto font-mono leading-relaxed max-h-64 mb-6 border border-slate-800/50 shadow-inner">
          {scriptCode}
        </pre>
        <div className="bg-amber-50/50 backdrop-blur-sm border border-amber-100 p-5 rounded-2xl">
          <p className="text-[11px] text-amber-700 font-bold leading-relaxed flex items-start gap-3">
            <Zap className="shrink-0 mt-0.5" size={14} />
            Tip: Go to script.google.com, create a project, paste this code, and "Deploy as Web App". Once you paste the URL in the box above, your Google Sheet will become a live mirror of this app.
          </p>
        </div>
      </div>

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
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeleteConfirmText('');
                  }}
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
