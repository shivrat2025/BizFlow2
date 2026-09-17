import React, { useState } from 'react';
import { X, Copy, Check, Sparkles, Bot, Terminal, ShieldCheck, ChevronRight, ExternalLink } from 'lucide-react';

interface McpModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const McpModal: React.FC<McpModalProps> = ({ isOpen, onClose }) => {
    const [copiedEndpoint, setCopiedEndpoint] = useState(false);
    const [copiedJson, setCopiedJson] = useState(false);
    const [activeTab, setActiveTab] = useState<'claude' | 'chatgpt' | 'cursor'>('claude');

    if (!isOpen) return null;

    const mcpUrl = typeof window !== 'undefined' 
        ? `${window.location.origin}/api/mcp` 
        : 'https://bizflow.admagic.in/api/mcp';

    const claudeJson = JSON.stringify({
        mcpServers: {
            bizflow: {
                url: mcpUrl
            }
        }
    }, null, 2);

    const claudeStdioJson = JSON.stringify({
        mcpServers: {
            bizflow: {
                command: "npx",
                args: ["-y", "mcp-remote", mcpUrl]
            }
        }
    }, null, 2);

    const handleCopyEndpoint = () => {
        navigator.clipboard.writeText(mcpUrl);
        setCopiedEndpoint(true);
        setTimeout(() => setCopiedEndpoint(false), 2000);
    };

    const handleCopyJson = (content: string) => {
        navigator.clipboard.writeText(content);
        setCopiedJson(true);
        setTimeout(() => setCopiedJson(false), 2000);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
                
                {/* Header */}
                <div className="p-5 md:p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-indigo-50/40">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200">
                            <Sparkles size={20} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-base md:text-lg font-black text-slate-900 tracking-tight">Connect Claude & ChatGPT</h3>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                    MCP Online
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 font-medium">Use AI agents to view balances, add expenses, and query ledger</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-5 md:p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">

                    {/* Server URL Box */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Remote MCP Server URL</span>
                            <span className="text-[10px] font-semibold text-indigo-600">SSE + JSON-RPC 2.0</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <input 
                                type="text" 
                                readOnly 
                                value={mcpUrl} 
                                className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-semibold text-slate-800 select-all outline-none"
                            />
                            <button
                                onClick={handleCopyEndpoint}
                                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
                                    copiedEndpoint 
                                        ? 'bg-emerald-600 text-white' 
                                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                                }`}
                            >
                                {copiedEndpoint ? <Check size={14} /> : <Copy size={14} />}
                                {copiedEndpoint ? 'Copied!' : 'Copy URL'}
                            </button>
                        </div>
                    </div>

                    {/* Guide Tabs */}
                    <div>
                        <div className="flex gap-2 p-1 bg-slate-100 rounded-xl mb-4">
                            <button
                                onClick={() => setActiveTab('claude')}
                                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                                    activeTab === 'claude' 
                                        ? 'bg-white text-indigo-700 shadow-xs' 
                                        : 'text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                <Bot size={14} /> Claude Desktop
                            </button>
                            <button
                                onClick={() => setActiveTab('chatgpt')}
                                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                                    activeTab === 'chatgpt' 
                                        ? 'bg-white text-emerald-700 shadow-xs' 
                                        : 'text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                <Bot size={14} /> ChatGPT
                            </button>
                            <button
                                onClick={() => setActiveTab('cursor')}
                                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                                    activeTab === 'cursor' 
                                        ? 'bg-white text-slate-900 shadow-xs' 
                                        : 'text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                <Terminal size={14} /> Cursor / IDE
                            </button>
                        </div>

                        {/* Claude Tab Content */}
                        {activeTab === 'claude' && (
                            <div className="space-y-4">
                                <div className="text-xs text-slate-600 space-y-1">
                                    <p className="font-semibold text-slate-800">1. Open Claude Desktop configuration:</p>
                                    <code className="block bg-slate-100 text-slate-700 p-2 rounded-lg text-[11px] font-mono select-all">
                                        ~/Library/Application Support/Claude/claude_desktop_config.json
                                    </code>
                                </div>

                                <div className="text-xs text-slate-600 space-y-1">
                                    <div className="flex items-center justify-between">
                                        <p className="font-semibold text-slate-800">2. Paste this configuration:</p>
                                        <button 
                                            onClick={() => handleCopyJson(claudeStdioJson)}
                                            className="text-indigo-600 hover:text-indigo-700 text-[11px] font-bold flex items-center gap-1"
                                        >
                                            <Copy size={12} /> {copiedJson ? 'Copied!' : 'Copy Config'}
                                        </button>
                                    </div>
                                    <pre className="bg-slate-900 text-indigo-200 p-3 rounded-xl text-[11px] font-mono overflow-x-auto">
                                        {claudeStdioJson}
                                    </pre>
                                </div>
                                <p className="text-[11px] text-slate-500">
                                    💡 Restart Claude Desktop. The 🔨 tool icon will activate with BizFlow tools: <b>add_transaction</b>, <b>get_account_balances</b>, <b>search_transactions</b>.
                                </p>
                            </div>
                        )}

                        {/* ChatGPT Tab Content */}
                        {activeTab === 'chatgpt' && (
                            <div className="space-y-3 text-xs text-slate-600">
                                <p className="font-semibold text-slate-800">Connect with Custom GPT or ChatGPT Actions:</p>
                                <ol className="list-decimal pl-5 space-y-1.5">
                                    <li>Go to <b>ChatGPT</b> &gt; <b>Explore GPTs</b> &gt; <b>Create</b></li>
                                    <li>Navigate to the <b>Configure</b> tab and click <b>Create new action</b></li>
                                    <li>Set the Base Server URL to: <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-[10px] text-slate-800">{mcpUrl}</code></li>
                                    <li>Authentication: <b>None</b> (Dual secured via workspace header)</li>
                                </ol>
                                <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl text-emerald-800 text-[11px]">
                                    ✨ ChatGPT can now understand statements, calculate ROI, and push expenses directly to your BizFlow ledger!
                                </div>
                            </div>
                        )}

                        {/* Cursor Tab Content */}
                        {activeTab === 'cursor' && (
                            <div className="space-y-3 text-xs text-slate-600">
                                <p className="font-semibold text-slate-800">Connect in Cursor / Windsurf Settings:</p>
                                <ol className="list-decimal pl-5 space-y-1.5">
                                    <li>Open <b>Settings</b> &gt; <b>Features</b> &gt; <b>MCP</b></li>
                                    <li>Click <b>+ Add New MCP Server</b></li>
                                    <li>Type: <b>SSE</b></li>
                                    <li>Server URL: <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-[10px] text-slate-800">{mcpUrl}</code></li>
                                </ol>
                            </div>
                        )}
                    </div>

                    {/* Example Prompts */}
                    <div className="border-t border-slate-100 pt-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Sample Prompts you can ask your AI:</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-[11px] text-slate-700">
                                💬 <i>"Add an expense of ₹15,000 for FB Ads today from IDFC Bank"</i>
                            </div>
                            <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-[11px] text-slate-700">
                                💬 <i>"What is my current IDFC and IndusInd Bank balance?"</i>
                            </div>
                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-black transition-all"
                    >
                        Done
                    </button>
                </div>

            </div>
        </div>
    );
};
