

import { useState, useEffect } from "react";
import { Search, Info, MessageSquare, AlertCircle, CheckCircle2, Ticket, ChevronRight } from "lucide-react";
import { api } from "../lib/api";


interface Ticket {
    _id: string;
    staffId: {
        _id: string;
        name: string;
        mobileNumber: string;
        roleId: string;
        status: string;
    };
    subject: string;
    description: string;
    status: "Pending" | "In Progress" | "Resolved" | "Closed";
    priority: "Low" | "Medium" | "High";
    createdAt: string;
}

export function TicketsPage() {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshQueue, setRefreshQueue] = useState(0);

    useEffect(() => {
        api.get("/tickets/all")
            .then(res => {
                setTickets(res.data.data || []);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to load tickets", err);
                setLoading(false);
            });
    }, [refreshQueue]);


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

    if (loading) {
        return <div className="page-container p-6">Loading tickets...</div>;
    }

    const stats = {
        total: tickets.length,
        active: tickets.filter(t => t.status !== 'Resolved' && t.status !== 'Closed').length,
        resolved: tickets.filter(t => t.status === 'Resolved').length
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

            {/* Operational Intelligence Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { label: 'TOTAL TRAFFIC', val: stats.total, icon: <Ticket size={24} />, color: '#3b82f6', bg: 'bg-blue-50 dark:bg-blue-500/10' },
                    { label: 'ACTIVE QUEUE', val: stats.active, icon: <AlertCircle size={24} />, color: '#f59e0b', bg: 'bg-amber-50 dark:bg-amber-500/10' },
                    { label: 'SUCCESS RESOLVED', val: stats.resolved, icon: <CheckCircle2 size={24} />, color: '#10b981', bg: 'bg-emerald-50 dark:bg-emerald-500/10' }
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
                <table className="w-full text-left">
                    <thead>
                        <tr className="table-header-custom border-b border-[var(--border-color)] dark:border-slate-800">
                            <th className="p-7">PARTNER NODE</th>
                            <th className="p-7">CONTEXT & SUBJECT</th>
                            <th className="p-7">TIER / TIMELINE</th>
                            <th className="p-7">OPERATIONAL STATE</th>
                            <th className="p-7 text-right">ACTION CHANNEL</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                        {tickets.map(t => (
                            <tr key={t._id} className="hover:bg-[var(--bg-main)] dark:hover:bg-slate-900/40 transition-all duration-300">
                                <td className="p-7">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-[var(--bg-main)] dark:bg-white/5 flex items-center justify-center font-black text-[#1A7FD4] shadow-sm transform group-hover:scale-110 transition-transform">
                                            {t.staffId?.name?.charAt(0) || "U"}
                                        </div>
                                        <div>
                                            <p className="font-black text-[var(--text-main)] dark:text-white text-sm">{t.staffId?.name || "Unknown Partner"}</p>
                                            <p className="text-[10px] font-bold text-[var(--text-muted)] dark:text-[var(--text-muted)] uppercase tracking-widest mt-0.5">{t.staffId?.mobileNumber || "REF: INTERNAL"}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-7">
                                    <h4 className="font-black text-[var(--text-main)] dark:text-slate-200 text-sm">{t.subject}</h4>
                                    <p className="text-xs text-[var(--text-muted)] mt-1 max-w-xs truncate font-medium tracking-tight opacity-80" title={t.description}>
                                        {t.description}
                                    </p>
                                </td>
                                <td className="p-7">
                                    <div className={`text-[9px] inline-flex items-center gap-2 px-3 py-1.5 rounded-full font-black uppercase tracking-[0.15em] mb-2 ${t.priority === 'High' ? 'bg-rose-50 text-rose-500 dark:bg-rose-500/10' :
                                        t.priority === 'Medium' ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-500 dark:text-amber-400 dark:bg--500/10' :
                                            'bg-[var(--bg-main)] text-[var(--text-muted)] dark:bg-slate-500/10'}`}>
                                        <div className={`w-1 h-1 rounded-full animate-pulse ${t.priority === 'High' ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]' : t.priority === 'Medium' ? 'bg-amber-50 dark:bg-amber-500/100' : 'bg-slate-500'}`}></div>
                                        {t.priority}
                                    </div>
                                    <p className="text-[10px] text-[var(--text-muted)] font-bold block pl-1 lowercase tracking-widest opacity-60">
                                        {new Date(t.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </td>
                                <td className="p-7">
                                    <span className={`inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest ${t.status === 'Resolved' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 dark:bg--500/10' :
                                        t.status === 'In Progress' ? 'bg-blue-50 dark:bg-blue-500/10 text-[#1A7FD4] dark:bg--500/10' :
                                            'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 dark:bg--500/10'
                                        }`}>
                                        <div className={`w-2 h-2 rounded-full ${t.status === 'Resolved' ? 'bg-emerald-50 dark:bg-emerald-500/100 shadow-[0_0_8px_rgba(16,185,129,0.5)]' :
                                            t.status === 'In Progress' ? 'bg-blue-50 dark:bg-blue-500/100 animate-pulse' :
                                                'bg-amber-50 dark:bg-amber-500/100 animate-bounce'
                                            }`}></div>
                                        {t.status}
                                    </span>
                                </td>
                                <td className="p-7 text-right">
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
    );
}
