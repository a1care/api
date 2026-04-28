

import { useState, useEffect } from "react";
import { Search, Info, MessageSquare, AlertCircle, CheckCircle2, Ticket, ChevronRight, Send, X, Loader2 } from "lucide-react";
import { api } from "../lib/api";
import { toast } from "sonner";


interface Ticket {
    _id: string;
    staffId?: {
        _id: string;
        name: string;
        mobileNumber: string;
        roleId: string;
        status: string;
    };
    userId?: {
        _id: string;
        name: string;
        mobileNumber: string;
        profileImage?: string;
    };
    subject: string;
    description: string;
    status: "Pending" | "In Progress" | "Resolved" | "Closed";
    priority: "Low" | "Medium" | "High";
    createdAt: string;
}

interface Message {
    _id: string;
    senderType: "User" | "Staff";
    message: string;
    createdAt: string;
}

export function TicketsPage() {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshQueue, setRefreshQueue] = useState(0);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");

    // Chat State
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [replyMsg, setReplyMsg] = useState("");
    const [sending, setSending] = useState(false);
    const [fetchingMessages, setFetchingMessages] = useState(false);

    useEffect(() => {
        setLoading(true);

        const params = new URLSearchParams();
        params.set('page', String(page));
        params.set('limit', '50');
        if (searchQuery.trim()) params.set('search', searchQuery.trim());
        if (statusFilter !== 'All') params.set('status', statusFilter);

        api.get(`/tickets/all?${params.toString()}`)
            .then(res => {
                const payload = res?.data?.data;

                const items = Array.isArray(payload)
                    ? payload
                    : Array.isArray(payload?.items)
                        ? payload.items
                        : Array.isArray(payload?.tickets)
                            ? payload.tickets
                            : Array.isArray(payload?.results)
                                ? payload.results
                                : [];

                const pages = Number(
                    payload?.totalPages ??
                    payload?.pages ??
                    payload?.pageCount ??
                    payload?.meta?.totalPages ??
                    1
                );

                setTickets(items);
                setTotalPages(Number.isFinite(pages) && pages > 0 ? pages : 1);
                setLoading(false);
            })
            .catch(err => {
                console.error('Failed to load tickets', err);
                toast.error(err?.response?.data?.message || 'Failed to load tickets');
                setTickets([]);
                setTotalPages(1);
                setLoading(false);
            });
    }, [refreshQueue, page, searchQuery, statusFilter]);


    const updateStatus = async (id: string, newStatus: string) => {
        try {
            const res = await api.put(`/tickets/status/${id}`, { status: newStatus });
            if (res.status === 200) {
                setRefreshQueue(prev => prev + 1);
            }
        } catch (err) {
            console.error(err);
        }
    };


    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Pending': return 'bg-yellow-100 text-yellow-800';
            case 'In Progress': return 'bg-blue-100 text-blue-800';
            case 'Resolved': return 'bg-green-100 text-green-800';
            case 'Closed': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const fetchMessages = async (ticketId: string) => {
        setFetchingMessages(true);
        try {
            const res = await api.get(`/tickets/messages/${ticketId}`);
            const rawMessages = res.data.data;
            setMessages(Array.isArray(rawMessages) ? rawMessages : []);
        } catch (err) {
            toast.error("Failed to fetch messages");
        } finally {
            setFetchingMessages(false);
        }
    };

    const handleSendMessage = async () => {
        if (!replyMsg.trim() || !selectedTicket) return;
        setSending(true);
        try {
            await api.post("/tickets/messages/send", {
                ticketId: selectedTicket._id,
                message: replyMsg
            });
            setReplyMsg("");
            fetchMessages(selectedTicket._id);
        } catch (err) {
            toast.error("Failed to send message");
        } finally {
            setSending(false);
        }
    };

    useEffect(() => {
        if (selectedTicket) {
            fetchMessages(selectedTicket._id);
            const interval = setInterval(() => fetchMessages(selectedTicket._id), 5000);
            return () => clearInterval(interval);
        }
    }, [selectedTicket]);

    // Remove early return to prevent page blinking
    // if (loading) {
    //     return <div className="page-container p-6">Loading tickets...</div>;
    // }

    const stats = {
        total: tickets.length,
        active: tickets.filter(t => t.status?.toLowerCase() !== 'resolved' && t.status?.toLowerCase() !== 'closed').length,
        resolved: tickets.filter(t => t.status?.toLowerCase() === 'resolved').length
    };

    return (
        <div className="space-y-8 min-h-screen">
            {/* Premium Hero Section with Dynamic Background */}
            <div className="card p-0 overflow-hidden group shadow-2xl"
                style={{ border: 'none', background: 'linear-gradient(135deg, #1A7FD4 0%, #0d47a1 100%)' }}>
                <div className="relative p-12 flex justify-between items-center text-white">
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 text-blue-100 text-[10px] font-black uppercase tracking-[0.2em] mb-4 opacity-80">
                            <span className="hover:text-white transition-colors cursor-pointer">Network Hub</span>
                            <ChevronRight size={12} className="opacity-50" />
                            <span className="text-white">Crisis Management</span>
                        </div>
                        <h1 className="text-5xl font-black mb-4 tracking-tighter" style={{ color: 'white' }}>Support Tickets</h1>
                        <p className="text-blue-100/80 font-bold max-w-lg text-sm leading-relaxed">
                            Orchestrating operational excellence. Monitor partner nodes and resolve critical infrastructure queries in real-time.
                        </p>
                    </div>
                    {/* Decorative Elements */}
                    <div className="absolute top-[-50px] right-[-50px] w-96 h-96 bg-white/5 rounded-full blur-[100px]"></div>
                    <div className="absolute bottom-[-20px] left-[20%] w-64 h-64 bg-blue-400/10 rounded-full blur-[80px]"></div>
                    <MessageSquare size={160} className="text-white/5 absolute right-12 top-1/2 -translate-y-1/2 rotate-12 group-hover:rotate-[20deg] transition-transform duration-700" />
                </div>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="relative group flex-1 max-w-2xl">
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 z-10">
                        {/* <Search className="text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} /> */}
                    </div>
                    <input 
                        type="text" 
                        placeholder="Search by ID, Subject, Description or Node Details..."
                        className="w-full h-16 pl-16 pr-6 bg-white border border-slate-100 rounded-[28px] text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-50 transition-all shadow-sm"
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                    />
                </div>
                
                <div className="flex items-center bg-white p-2 rounded-[24px] border border-slate-100 shadow-sm">
                    {['All', 'Pending', 'In Progress', 'Resolved'].map((s) => (
                        <button
                            key={s}
                            onClick={() => { setStatusFilter(s); setPage(1); }}
                            className={`px-6 py-3 rounded-[18px] text-[10px] font-black uppercase tracking-widest transition-all ${
                                statusFilter === s ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-slate-400 hover:text-slate-600'
                            }`}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            </div>

            {/* Operational Intelligence Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { label: 'TOTAL TRAFFIC', val: tickets.length, icon: <Ticket size={24} />, color: '#3b82f6', bg: 'bg-blue-50 dark:bg-blue-500/10' },
                    { label: 'ACTIVE QUEUE', val: tickets.filter(t => t.status?.toLowerCase() !== 'resolved' && t.status?.toLowerCase() !== 'closed').length, icon: <AlertCircle size={24} />, color: '#f59e0b', bg: 'bg-amber-50 dark:bg-amber-500/10' },
                    { label: 'SUCCESS RESOLVED', val: tickets.filter(t => t.status?.toLowerCase() === 'resolved').length, icon: <CheckCircle2 size={24} />, color: '#10b981', bg: 'bg-emerald-50 dark:bg-emerald-500/10' }
                ].map((s, i) => (
                    <div key={i} className="card p-7 border-none shadow-blue-100/50 flex items-center justify-between hover:translate-y-[-4px] transition-all">
                        <div className="flex items-center gap-5">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${s.bg} dark:bg-white/5`} style={{ color: s.color }}>
                                {s.icon}
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">{s.label}</p>
                                <h2 className="text-3xl font-black text-[var(--text-main)] dark:text-white">{s.val}</h2>
                            </div>
                        </div>
                        <div className="text-[10px] font-bold text-[var(--text-muted)]">HUB-METRIC</div>
                    </div>
                ))}
            </div>

            {/* Refined Management Interface */}
            <div className="card p-0 overflow-hidden shadow-2xl border-none" style={{ borderRadius: '32px' }}>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[var(--bg-main)] border-b border-[var(--border-color)] text-[10px] uppercase font-black tracking-widest text-[var(--text-muted)]">
                                <th className="px-6 py-4">Sno</th>
                                <th className="px-6 py-4">Partner Node</th>
                                <th className="px-6 py-4">Context & Subject</th>
                                <th className="px-6 py-4">Operational State</th>
                                <th className="px-6 py-4 text-center">Action Channel</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="p-20 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Syncing HUB Data...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : tickets.map((t, index) => (
                                <tr key={t._id} className="hover:bg-[var(--bg-main)] dark:hover:bg-slate-900/40 transition-all duration-300">
                                    <td className="px-6 py-5 font-black text-slate-400 text-xs">
                                        {(index + 1).toString().padStart(2, '0')}
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-[var(--bg-main)] dark:bg-white/5 flex items-center justify-center font-black text-[#1A7FD4] shadow-sm">
                                                {t.staffId?.name?.charAt(0) || t.userId?.name?.charAt(0) || "U"}
                                            </div>
                                            <div>
                                                <p className="font-black text-[var(--text-main)] dark:text-white text-sm">
                                                    {t.staffId?.name || t.userId?.name || "Unknown Sender"}
                                                </p>
                                                <p className="text-[10px] font-bold text-[var(--text-muted)] dark:text-[var(--text-muted)] uppercase tracking-widest mt-0.5">
                                                    {t.staffId?.mobileNumber || t.userId?.mobileNumber || "REF: INTERNAL"}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <h4 className="font-black text-[var(--text-main)] dark:text-slate-200 text-sm">{t.subject}</h4>
                                        <p className="text-xs text-[var(--text-muted)] mt-1 max-w-xs truncate font-medium tracking-tight opacity-80" title={t.description}>
                                            {t.description}
                                        </p>
                                    </td>
                                    <td className="px-6 py-5">
                                        <span className={`inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest ${t.status?.toLowerCase() === 'resolved' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                                            t.status?.toLowerCase() === 'in progress' ? 'bg-blue-50 dark:bg-blue-500/10 text-[#1A7FD4]' :
                                                t.status?.toLowerCase() === 'closed' ? 'bg-slate-100 dark:bg-slate-800 text-slate-500' :
                                                    'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                            }`}>
                                            <div className={`w-2 h-2 rounded-full ${t.status?.toLowerCase() === 'resolved' ? 'bg-emerald-500' :
                                                t.status?.toLowerCase() === 'in progress' ? 'bg-blue-500 animate-pulse' :
                                                    t.status?.toLowerCase() === 'closed' ? 'bg-slate-500' :
                                                        'bg-amber-500 animate-bounce'
                                                }`}></div>
                                            {t.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-5 text-center">
                                        <div className="flex items-center justify-center gap-3">
                                            <button
                                                onClick={() => setSelectedTicket(t)}
                                                className="p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors"
                                                title="Intervene in Chat"
                                            >
                                                <MessageSquare size={16} />
                                            </button>
                                            <select
                                                value={t.status}
                                                onChange={(e) => updateStatus(t._id, e.target.value)}
                                                className="bg-[var(--bg-main)] dark:bg-white/5 border-none rounded-2xl px-5 py-3 text-[11px] font-black uppercase tracking-widest cursor-pointer shadow-sm hover:translate-y-[-2px] hover:shadow-lg transition-all outline-none text-[var(--text-muted)] dark:text-slate-200"
                                            >
                                                <option value="Pending">Queue</option>
                                                <option value="In Progress">Process</option>
                                                <option value="Resolved">Resolve</option>
                                                <option value="Closed">Archive</option>
                                            </select>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {tickets.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-16 text-center">
                                        <div className="flex flex-col items-center gap-4 opacity-40">
                                            <div className="w-20 h-20 rounded-full bg-[var(--bg-main)] dark:bg-white/5 flex items-center justify-center">
                                                <MessageSquare size={40} className="text-[var(--text-muted)]" />
                                            </div>
                                            <p className="text-[var(--text-muted)] font-black text-sm tracking-[0.2em] uppercase">Operational Silence. No Tickets Found.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex justify-between items-center bg-white p-8 rounded-[40px] border border-slate-100 shadow-xl shadow-slate-100/50">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Page {page} of {totalPages}</p>
                    <div className="flex gap-4">
                        <button 
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="px-6 py-3 rounded-2xl bg-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-500 disabled:opacity-30 hover:bg-slate-200 transition-colors"
                        >
                            Prev
                        </button>
                        <button 
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="px-6 py-3 rounded-2xl bg-slate-900 text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-30 hover:bg-black transition-colors"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}

            {/* Chat Intervention Modal */}
            {selectedTicket && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col h-[80vh]">
                        {/* Modal Header */}
                        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white/50 backdrop-blur-md">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                                    <MessageSquare size={24} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 line-clamp-1">{selectedTicket.subject}</h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Support Intervention • {selectedTicket.staffId?.name || selectedTicket.userId?.name || "Patient"}</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedTicket(null)} className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Chat Messages */}
                        <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-slate-50/30">
                            {fetchingMessages && messages.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full gap-4">
                                    <Loader2 className="animate-spin text-blue-500" />
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Syncing Thread...</p>
                                </div>
                            ) : (
                                <>
                                    <div className="bg-blue-500/5 border border-blue-500/10 rounded-3xl p-6 mb-8 text-center space-y-2">
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">Original Inquiry</p>
                                        <p className="text-sm font-medium text-slate-600 dark:text-slate-300 italic">" {selectedTicket?.description} "</p>
                                    </div>

                                    {Array.isArray(messages) && messages.map((m) => {
                                        const isMe = m.senderType === 'User';
                                        return (
                                            <div key={m._id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`max-w-[80%] p-5 rounded-3xl ${isMe ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white rounded-tl-none shadow-sm'}`}>
                                                    <p className="text-sm font-medium leading-relaxed">{m.message}</p>
                                                    <p className={`text-[8px] mt-2 font-bold uppercase tracking-widest ${isMe ? 'text-blue-100/60' : 'text-slate-400'}`}>
                                                        {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {messages.length === 0 && (
                                        <div className="flex flex-col items-center justify-center h-full opacity-30 py-20">
                                            <Info size={40} className="mb-4" />
                                            <p className="font-black uppercase tracking-widest text-xs">No active conversation yet</p>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Input Area */}
                        <div className="p-8 bg-white border-t border-slate-100">
                            <div className="relative">
                                <textarea
                                    className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-3xl p-6 pr-20 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all resize-none min-h-[80px]"
                                    placeholder="Type your intervention response..."
                                    value={replyMsg}
                                    onChange={(e) => setReplyMsg(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendMessage();
                                        }
                                    }}
                                />
                                <button
                                    disabled={sending || !replyMsg.trim()}
                                    onClick={handleSendMessage}
                                    className="absolute right-3 bottom-3 w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 hover:bg-blue-500 active:scale-95 transition-all disabled:opacity-50"
                                >
                                    {sending ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                                </button>
                            </div>
                            <p className="text-[9px] font-bold text-slate-400 mt-4 uppercase tracking-[0.1em] text-center">Press Enter to send response • Esc to close</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
