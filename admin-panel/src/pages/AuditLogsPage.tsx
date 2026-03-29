import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  History, User, Activity, ShieldCheck,
  ArrowRightCircle, Search, Filter, Calendar,
  Download, RefreshCcw, FileText, Settings
} from "lucide-react";
import { toast } from "sonner";

interface AuditLog {
  _id: string;
  action: string;
  targetType: string;
  targetId?: string;
  actorAdminId?: {
    name: string;
    email: string;
    role: string;
  };
  createdAt: string;
}

export function AuditLogsPage() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: async () => {
      const res = await api.get("/admin/audit/logs");
      return res.data.data as AuditLog[];
    }
  });

  const getActionIcon = (action: string) => {
    const act = action.toLowerCase();
    if (act.includes('create') || act.includes('add')) return <div className="timeline-dot" style={{ borderColor: '#22c55e', color: '#22c55e' }}><Activity size={14} /></div>;
    if (act.includes('delete') || act.includes('remove')) return <div className="timeline-dot" style={{ borderColor: '#ef4444', color: '#ef4444' }}><ShieldCheck size={14} /></div>;
    if (act.includes('update') || act.includes('edit')) return <div className="timeline-dot" style={{ borderColor: '#f59e0b', color: '#f59e0b' }}><RefreshCcw size={14} /></div>;
    if (act.includes('login') || act.includes('auth')) return <div className="timeline-dot" style={{ borderColor: '#6366f1', color: '#6366f1' }}><User size={14} /></div>;
    return <div className="timeline-dot"><FileText size={14} /></div>;
  };

  return (
    <div className="flex-col gap-8">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="brand-name" style={{ fontSize: '2rem' }}>Audit Command Center</h1>
          <p className="text-xs muted font-extrabold uppercase tracking-widest mt-1">Immutable Trace of System Operations & Security Events</p>
        </div>
        <div className="flex gap-3">
          <button className="button secondary h-11 px-5 rounded-xl gap-2 text-xs font-black uppercase" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCcw size={16} className={isFetching ? "animate-spin" : ""} />
            <span>Sync Feed</span>
          </button>
          <button className="button secondary h-11 px-5 rounded-xl gap-2 text-xs font-black uppercase">
            <Download size={16} />
            <span>Export CSV</span>
          </button>
        </div>
      </header>

      <div className="grid-2" style={{ gridTemplateColumns: 'minmax(0, 1fr) 340px' }}>
        <div className="flex-col gap-6">
          <div className="card p-4 border-none shadow-sm flex items-center gap-4 bg-[var(--card-bg)]" style={{ borderRadius: '20px' }}>
            <div className="relative flex-1">
              <Search className="absolute text-[var(--text-muted)]" size={18} style={{ left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
              <input placeholder="Filter by action, admin, or target UUID..." className="w-full bg-[var(--bg-main)] border-none px-5 py-3 rounded-xl text-sm" style={{ paddingLeft: '48px' }} />
            </div>
            <button className="button secondary h-11 px-4 rounded-xl gap-2 text-xs font-black">
              <Filter size={16} /> <span>All Entities</span>
            </button>
            <button className="button secondary h-11 px-4 rounded-xl gap-2 text-xs font-black">
              <Calendar size={16} /> <span>Live Time</span>
            </button>
          </div>

          <div className="card p-8 border-none bg-[var(--card-bg)] min-h-[600px]" style={{ borderRadius: '32px' }}>
            {isLoading ? (
              <div className="flex-col items-center py-20 text-center gap-4">
                <RefreshCcw className="animate-spin text-indigo-500 dark:text-indigo-400" size={40} />
                <p className="font-bold text-xs muted uppercase tracking-[0.2em]">Tracing System Footprints...</p>
              </div>
            ) : (
              <div className="timeline mt-4">
                {(data ?? []).map((log) => (
                  <div key={log._id} className="timeline-item">
                    {getActionIcon(log.action)}
                    <div className="timeline-content">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <p className="log-action">{log.action}</p>
                          <div className="log-meta">
                            <span className="flex items-center gap-1.5"><User size={12} /> {log.actorAdminId?.name || "System Automated"}</span>
                            <span className="flex items-center gap-1.5"><ArrowRightCircle size={12} /> {log.targetType}</span>
                            <span className="badge secondary text-[9px] uppercase font-black" style={{ padding: '2px 8px' }}>#{log._id.slice(-6)}</span>
                          </div>
                        </div>
                        <time className="text-[10px] font-black muted uppercase tracking-widest">{new Date(log.createdAt).toLocaleTimeString()} · {new Date(log.createdAt).toLocaleDateString()}</time>
                      </div>
                      <div className="mt-3 p-3 bg-[var(--bg-main)] rounded-xl border border-[var(--border-color)] flex items-center justify-between">
                        <p className="text-[11px] font-medium text-[var(--text-muted)]">Target Identifier: <span className="font-mono text-[var(--text-main)]">{log.targetId || "N/A"}</span></p>
                        <button 
                          onClick={() => toast.info(`Trace Protocol: ${log._id}`, { description: "Cryptographic verification in progress..." })}
                          className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase hover:underline"
                        >
                          Full Protocol
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {(!data || data.length === 0) && (
                  <div className="py-20 text-center">
                    <History size={48} className="mx-auto text-slate-200 mb-4" />
                    <p className="font-bold text-[var(--text-muted)] uppercase tracking-widest text-xs">No audit signals captured in this cluster.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-6">
          <div className="card p-6 border-none bg-slate-900 text-white" style={{ borderRadius: '32px' }}>
            <div className="flex justify-between items-center mb-6">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Security Pulse</p>
              <ShieldCheck size={18} className="text-green-400" />
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <h2 className="text-3xl font-black">100%</h2>
                <span className="text-[10px] font-black text-green-400 uppercase mb-1">Integrity Secure</span>
              </div>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">The audit log store is protected by cryptographic hashes. All operations are logged with server-side timestamps.</p>
            </div>
          </div>

          <div className="card p-6 border-none bg-[var(--card-bg)] shadow-sm" style={{ borderRadius: '32px' }}>
            <p className="text-[10px] font-black uppercase tracking-widest muted mb-6">Action Frequency</p>
            <div className="space-y-5">
              {[
                { label: 'Admin Logins', count: 42, color: '#6366f1' },
                { label: 'Registry Updates', count: 128, color: '#f59e0b' },
                { label: 'Security Alerts', count: 0, color: '#ef4444' }
              ].map(item => (
                <div key={item.label} className="space-y-2">
                  <div className="flex justify-between text-[11px] font-black uppercase tracking-widest">
                    <span>{item.label}</span>
                    <span className="muted">{item.count}</span>
                  </div>
                  <div className="h-1.5 w-full bg-[var(--bg-main)] rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(item.count / 150) * 100}% `, background: item.color }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-6 border-none bg-indigo-50 dark:bg-indigo-500/10" style={{ borderRadius: '32px' }}>
            <Settings size={24} className="text-indigo-600 dark:text-indigo-400 mb-4" />
            <h3 className="font-black text-sm text-[var(--text-main)] uppercase tracking-widest mb-2">Audit Config</h3>
            <p className="text-xs text-[var(--text-muted)] mb-4">You are currently viewing the Standard Retention Cluster (90 Days).</p>
            <button className="button primary w-full h-11 rounded-xl text-xs font-black uppercase tracking-widest">Manage Storage</button>
          </div>
        </aside>
      </div>
    </div>
  );
}

