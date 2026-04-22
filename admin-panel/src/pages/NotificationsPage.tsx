import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  Send, Users, User, Bell,
  CheckCircle2, AlertCircle, Search,
  X, Info, History, Calendar,
  ArrowRight, Filter, UserSearch as UserSearchIcon,
  ShieldCheck, Trash2
} from "lucide-react";
import { toast } from "sonner";

type Audience = "all" | "patients" | "partners" | "individual";

interface NotificationHistoryItem {
  _id: string;
  title: string;
  body: string;
  recipientType: string;
  refType?: string;
  fcmStatus: string;
  createdAt: string;
}

interface UserSummary {
  _id: string;
  name: string;
  mobileNumber: string;
  email?: string;
  category?: string;
}

export function NotificationsPage() {
  const [audience, setAudience] = useState<Audience>("all");
  const [recipientId, setRecipientId] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientType, setRecipientType] = useState<"patient" | "partner">("patient");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [dataPayload, setDataPayload] = useState("");
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const [activeTab, setActiveTab] = useState<"broadcast" | "intelligence">("broadcast");

  // 1. History Query
  const { data: history, refetch: refetchHistory } = useQuery({
    queryKey: ["notifications-history"],
    queryFn: async () => {
      const res = await api.get("/admin/notifications");
      return res.data.data.notifications as NotificationHistoryItem[];
    }
  });

  // 2. User Search Query
  const { data: searchResults, isLoading: searching } = useQuery({
    queryKey: ["user-search", userSearchTerm, recipientType],
    queryFn: async () => {
      if (userSearchTerm.length < 3) return [];
      const res = await api.get(`/admin/user-list/${recipientType === 'patient' ? 'patient' : 'doctor'}`, {
        params: { search: userSearchTerm }
      });
      return res.data.data.users as UserSummary[];
    },
    enabled: isSearchOpen && userSearchTerm.length >= 3
  });

  // 3. Send Mutation
  const sendMutation = useMutation({
    mutationFn: async () => {
      let data = {};
      try {
        if (dataPayload.trim()) {
          data = JSON.parse(dataPayload);
        }
      } catch (e) {
        throw new Error("Payload configuration error: Invalid JSON structure.");
      }

      const res = await api.post("/admin/notifications/broadcast", {
        title,
        body,
        audience,
        recipientId: audience === "individual" ? recipientId : undefined,
        recipientType: audience === "individual" ? recipientType : undefined,
        data
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || "Broadcast packet deployed to network units!");
      setTitle("");
      setBody("");
      setDataPayload("");
      setRecipientId("");
      setRecipientName("");
      refetchHistory();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err.message || "Broadcast sync failure";
      toast.error(msg);
    }
  });

  // 4. Intelligence Query
  const { data: alerts = [], refetch: refetchAlerts } = useQuery({
    queryKey: ["admin-system-intelligence"],
    queryFn: async () => {
      const res = await api.get("/admin/notifications?recipientType=admin&limit=50");
      return res.data.data.notifications as NotificationHistoryItem[];
    }
  });

  const clearAlertsMutation = useMutation({
    mutationFn: async () => api.delete("/admin/notifications/clear"),
    onSuccess: () => {
      toast.success("Intelligence hub cleared.");
      refetchAlerts();
    }
  });

  const selectUser = (u: UserSummary) => {
    setRecipientId(u._id);
    setRecipientName(u.name);
    setIsSearchOpen(false);
    setUserSearchTerm("");
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col gap-4 bg-[var(--card-bg)] p-6 md:p-8 rounded-2xl shadow-sm border border-[var(--border-color)] relative overflow-hidden text-left items-start">
        <div className="relative z-10 text-left items-start">
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-[var(--text-main)] mb-1">Push Notifications</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            <p className="text-xs md:text-sm font-medium text-[var(--text-muted)] tracking-wide">Home • Communication • Push Notifications</p>
          </div>
        </div>

        <div className="relative z-10 flex bg-slate-100 dark:bg-white/5 p-1.5 rounded-2xl border border-slate-200 dark:border-white/10 w-fit">
          <button
            onClick={() => setActiveTab('broadcast')}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'broadcast' ? 'bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Outbound Broadcast
          </button>
          <button
            onClick={() => setActiveTab('intelligence')}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'intelligence' ? 'bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            System Intelligence
          </button>
        </div>
        <div className="absolute -bottom-24 -right-12 w-64 h-64 bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -top-12 right-32 w-48 h-48 bg-purple-500/5 dark:bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />
      </header>

      {isSearchOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-10">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsSearchOpen(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-[40px] shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-8 border-b space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black text-slate-900">Target Discovery</h3>
                <button onClick={() => setIsSearchOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors">
                  <X />
                </button>
              </div>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  autoFocus
                  className="w-full h-14 bg-slate-50 dark:bg-white/5 border-none pl-12 pr-5 rounded-2xl font-bold placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                  placeholder="Search by name or number..."
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              {searching ? (
                <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                  <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Scanning Network...</p>
                </div>
              ) : searchResults && searchResults.length > 0 ? (
                <div className="grid gap-2">
                  {searchResults.map((user) => (
                    <button
                      key={user._id}
                      onClick={() => selectUser(user)}
                      className="flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-white/5 group transition-all text-left"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white dark:bg-white/10 rounded-xl flex items-center justify-center text-xl font-black text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                          {user.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-black text-slate-900 dark:text-white">{user.name}</p>
                          <p className="text-xs font-bold text-slate-500">{user.mobileNumber}</p>
                        </div>
                      </div>
                      <CheckCircle2 size={18} className="text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              ) : userSearchTerm.length >= 3 ? (
                <div className="text-center py-10 text-slate-400 opacity-60">
                  <UserSearchIcon size={32} className="mx-auto mb-2" />
                  <p className="text-[10px] font-black uppercase tracking-widest">No matching units found</p>
                </div>
              ) : (
                <div className="text-center py-10 text-slate-400 opacity-60">
                  <Search size={32} className="mx-auto mb-2" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Enter at least 3 characters</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'broadcast' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 space-y-6">
            <section className="bg-white rounded-[40px] p-10 border border-slate-100 shadow-sm space-y-10">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                  <Send size={20} />
                </div>
                <h3 className="text-xl font-black text-slate-900">Compose Announcement</h3>
              </div>

              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Target Audience</label>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {[
                      { id: "all", label: "Broadcasting All", icon: Users },
                      { id: "patients", label: "Patients Only", icon: User },
                      { id: "partners", label: "Partners Only", icon: User },
                      { id: "individual", label: "Direct Recipient", icon: Search },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setAudience(item.id as Audience)}
                        className={`flex flex-col items-center justify-center p-5 rounded-3xl border-2 transition-all gap-2 cursor-pointer ${audience === item.id ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-100" : "bg-slate-50 dark:bg-white/5 border-transparent text-slate-500 hover:border-blue-200"}`}
                      >
                        <item.icon size={20} />
                        <span className="text-[10px] font-black uppercase tracking-tighter">{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {audience === "individual" && (
                  <div className="grid lg:grid-cols-2 gap-6 animate-in slide-in-from-top-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Recipient Type</label>
                      <div className="flex bg-slate-50 dark:bg-white/5 p-1 rounded-2xl">
                        {["patient", "partner"].map((t) => (
                          <button
                            key={t}
                            onClick={() => { setRecipientType(t as any); setRecipientId(""); setRecipientName(""); }}
                            className={`flex-1 py-3 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${recipientType === t ? "bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-sm" : "text-slate-400 font-bold"}`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Target Selection</label>
                      <button
                        type="button"
                        onClick={() => setIsSearchOpen(true)}
                        className={`w-full h-12 bg-slate-50 dark:bg-white/5 rounded-2xl px-5 flex items-center justify-between border-2 transition-all cursor-pointer ${recipientId ? "border-emerald-500/20" : "border-transparent hover:border-blue-100"}`}
                      >
                        <div className="flex items-center gap-3">
                          <Search size={14} className={recipientId ? "text-emerald-500" : "text-slate-400"} />
                          <span className={`text-[11px] font-black uppercase tracking-wider ${recipientId ? "text-emerald-600" : "text-slate-400"}`}>
                            {recipientName || `Discover ${recipientType}`}
                          </span>
                        </div>
                        {recipientId && <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Notification Title</label>
                    <input
                      className="w-full h-14 bg-slate-50 dark:bg-white/5 border-none rounded-2xl px-6 text-slate-900 dark:text-white font-bold text-lg focus:ring-2 focus:ring-blue-100 outline-none"
                      placeholder="Brief attention-grabbing title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Message Body</label>
                    <textarea
                      className="w-full h-32 bg-slate-50 dark:bg-white/5 border-none rounded-3xl p-6 text-slate-900 dark:text-white font-bold leading-relaxed focus:ring-2 focus:ring-blue-100 outline-none"
                      placeholder="Enter the full announcement text here..."
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Deep-Link Data (JSON)</label>
                    <input
                      className="w-full h-12 bg-slate-50 dark:bg-white/5 border-none rounded-2xl px-5 text-slate-900 dark:text-white font-mono text-xs font-bold focus:ring-2 focus:ring-blue-100 outline-none"
                      placeholder='{"screen": "offer", "id": "123"}'
                      value={dataPayload}
                      onChange={(e) => setDataPayload(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t dark:border-white/5">
                <button
                  disabled={sendMutation.isPending || !title || !body || (audience === 'individual' && !recipientId)}
                  onClick={() => sendMutation.mutate()}
                  className="w-full h-16 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-3xl flex items-center justify-center gap-3 shadow-xl shadow-blue-100 active:scale-95 transition-all disabled:opacity-50 group"
                >
                  {sendMutation.isPending ? (
                    <div className="w-6 h-6 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send size={24} />
                      <span className="text-lg uppercase tracking-tight">Deploy Network Broadcast</span>
                    </>
                  )}
                </button>
              </div>
            </section>
          </div>

          <div className="lg:col-span-4 space-y-6">
            <section className="bg-slate-900 rounded-[40px] p-8 text-white space-y-8 relative overflow-hidden shadow-2xl">
              <div className="flex items-center gap-3">
                <History size={18} className="text-blue-400" />
                <h4 className="font-black uppercase tracking-widest text-[10px] opacity-60">Transmission Log</h4>
              </div>

              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {history?.slice(0, 10).map((item) => (
                  <div key={item._id} className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2 hover:bg-white/10 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-400 text-[8px] font-black uppercase tracking-widest">{item.recipientType}</span>
                      <span className="text-[8px] opacity-40 font-bold">{new Date(item.createdAt).toLocaleDateString()}</span>
                    </div>
                    <h5 className="font-black text-sm line-clamp-1">{item.title}</h5>
                    <p className="text-[10px] opacity-60 line-clamp-2">{item.body}</p>
                  </div>
                ))}
              </div>

              <button onClick={() => refetchHistory()} className="w-full h-12 bg-white/10 hover:bg-white/20 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest">Refresh History</button>
            </section>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-600/10 p-6 rounded-[32px] border border-blue-100 dark:border-blue-500/20">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white dark:bg-blue-600 rounded-2xl flex items-center justify-center text-blue-600 dark:text-white shadow-sm">
                <Info size={24} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">Admin Activity Log</h3>
                <p className="text-xs font-bold text-slate-500">Real-time alerts for bookings, KYC, and system events.</p>
              </div>
            </div>
            <button
              onClick={() => clearAlertsMutation.mutate()}
              className="px-6 py-3 bg-white dark:bg-white/5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-red-500 border border-slate-100 dark:border-white/10 rounded-2xl shadow-sm transition-all"
            >
              Clear All Alerts
            </button>
          </div>

          <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-10">
              {alerts.length > 0 ? (
                <div className="space-y-4">
                  {alerts.map((alert) => (
                    <div key={alert._id} className="p-6 rounded-[24px] border border-slate-50 dark:border-white/5 hover:border-blue-200 dark:hover:border-blue-500/30 hover:bg-slate-50 dark:hover:bg-blue-500/5 transition-all group">
                      <div className="flex items-start justify-between">
                        <div className="flex gap-6">
                          <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-blue-600 group-hover:bg-white transition-all shadow-sm">
                            {alert.refType === 'ServiceRequest' ? <Calendar size={24} /> :
                              alert.refType === 'Partner' ? <ShieldCheck size={24} /> :
                                <Bell size={24} />}
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">{alert.refType || 'System'}</span>
                              <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                              <span className="text-[10px] font-bold text-slate-400">{new Date(alert.createdAt).toLocaleString()}</span>
                            </div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white">{alert.title}</h3>
                            <p className="text-sm font-bold text-slate-500 max-w-2xl">{alert.body}</p>
                          </div>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="p-3 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-100 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all">
                            Take Action <ArrowRight size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-20 text-center space-y-4">
                  <div className="w-20 h-20 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto text-slate-200">
                    <CheckCircle2 size={40} />
                  </div>
                  <h4 className="text-xl font-black text-slate-900 dark:text-white">All Caught Up!</h4>
                  <p className="text-slate-500 font-medium font-bold opacity-60">There are no pending system intelligence alerts.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
