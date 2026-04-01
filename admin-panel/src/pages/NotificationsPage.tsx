import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { 
  Send, Users, User, Bell, 
  CheckCircle2, AlertCircle, Search, 
  X, Info, History, Calendar,
  ArrowRight
} from "lucide-react";
import { toast } from "sonner";

type Audience = "all" | "patients" | "partners" | "individual";

interface NotificationHistoryItem {
  _id: string;
  title: string;
  body: string;
  recipientType: string;
  fcmStatus: string;
  createdAt: string;
}

export function NotificationsPage() {
  const [audience, setAudience] = useState<Audience>("all");
  const [recipientId, setRecipientId] = useState("");
  const [recipientType, setRecipientType] = useState<"patient" | "partner">("patient");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [dataPayload, setDataPayload] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: history, refetch: refetchHistory } = useQuery({
    queryKey: ["notifications-history"],
    queryFn: async () => {
      const res = await api.get("/admin/notifications");
      return res.data.data.notifications as NotificationHistoryItem[];
    }
  });

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
    onSuccess: () => {
       toast.success("Broadcast packet deployed to network units!");
       setTitle("");
       setBody("");
       setDataPayload("");
       refetchHistory();
    },
    onError: (err: any) => {
       const msg = err?.response?.data?.message || err.message || "Broadcast sync failure";
       toast.error(msg);
    }
  });

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-[var(--card-bg)] p-10 rounded-[40px] border border-[var(--border-color)] shadow-sm">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 rounded-2xl flex items-center justify-center">
              <Bell size={24} />
            </div>
            <h1 className="text-3xl font-black text-[var(--text-main)] tracking-tight">Broadcast <span className="text-indigo-600">Notifications</span></h1>
          </div>
          <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-13">Deploy operational alerts to the entire network</p>
        </div>
      </header>

      <div className="grid lg:grid-cols-3 gap-10">
        {/* Left: Compose Form */}
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-[var(--card-bg)] rounded-[40px] p-10 border border-[var(--border-color)] shadow-sm space-y-10">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 rounded-xl flex items-center justify-center">
                <Send size={20} />
              </div>
              <h3 className="text-xl font-black text-[var(--text-main)]">Compose Announcement</h3>
            </div>

            <div className="space-y-8">
              {/* Audience Selector */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">Target Audience</label>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    { id: "all", label: "Broadcasting All", icon: Users },
                    { id: "patients", label: "Patients Only", icon: User },
                    { id: "partners", label: "Partners Only", icon: User },
                    { id: "individual", label: "Direct Recipient", icon: Search },
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setAudience(item.id as Audience)}
                      className={`flex flex-col items-center justify-center p-5 rounded-3xl border-2 transition-all gap-2 ${audience === item.id ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-100" : "bg-[var(--bg-main)] border-transparent text-[var(--text-muted)] hover:border-indigo-200"}`}
                    >
                      <item.icon size={20} />
                      <span className="text-[10px] font-black uppercase tracking-tighter">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Individual Recipient details if applicable */}
              {audience === "individual" && (
                <div className="grid lg:grid-cols-2 gap-6 animate-in slide-in-from-top-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Recipient Type</label>
                    <div className="flex bg-[var(--bg-main)] p-1 rounded-2xl">
                      {["patient", "partner"].map((t) => (
                        <button
                          key={t}
                          onClick={() => setRecipientType(t as any)}
                          className={`flex-1 py-3 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${recipientType === t ? "bg-[var(--card-bg)] text-indigo-600 shadow-sm" : "text-[var(--text-muted)]"}`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Recipient ID (MongoDB ID)</label>
                    <input 
                      className="w-full h-12 bg-[var(--bg-main)] border-none rounded-2xl px-5 text-[var(--text-main)] font-mono text-xs font-bold focus:ring-2 focus:ring-indigo-100"
                      placeholder="e.g. 64de1..."
                      value={recipientId}
                      onChange={(e) => setRecipientId(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Content */}
              <div className="grid gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Notification Title</label>
                  <input 
                    className="w-full h-14 bg-[var(--bg-main)] border-none rounded-2xl px-6 text-[var(--text-main)] font-bold text-lg focus:ring-2 focus:ring-indigo-100"
                    placeholder="Brief attention-grabbing title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Message Body</label>
                  <textarea 
                    className="w-full h-32 bg-[var(--bg-main)] border-none rounded-3xl p-6 text-[var(--text-main)] font-bold leading-relaxed focus:ring-2 focus:ring-indigo-100"
                    placeholder="Enter the full announcement text here..."
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                  />
                  <p className="text-[10px] text-[var(--text-muted)] ml-2">Keep it concise for optimal mobile delivery.</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Metadata / Deep-Link Data (JSON)</label>
                    <Info size={14} className="text-gray-300" />
                  </div>
                  <input 
                    className="w-full h-12 bg-[var(--bg-main)] border-none rounded-2xl px-5 text-[var(--text-main)] font-mono text-xs font-bold focus:ring-2 focus:ring-indigo-100"
                    placeholder='{"screen": "offer", "id": "123"}'
                    value={dataPayload}
                    onChange={(e) => setDataPayload(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-[var(--border-color)]">
              <button
                disabled={sendMutation.isPending || !title || !body}
                onClick={() => sendMutation.mutate()}
                className="w-full h-16 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-3xl flex items-center justify-center gap-3 shadow-xl shadow-indigo-100 active:scale-95 transition-all disabled:opacity-50 group"
              >
                {sendMutation.isPending ? (
                  <div className="w-6 h-6 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Send size={24} />
                    <span className="text-lg uppercase tracking-tight">Blast Notification Now</span>
                    <ArrowRight size={20} className="group-hover:translate-x-1 transition-all" />
                  </>
                )}
              </button>
            </div>
          </section>
        </div>

        {/* Right: Preview & Stats */}
        <div className="space-y-6">
          <section className="bg-slate-950 rounded-[40px] p-8 text-white space-y-8 relative overflow-hidden shadow-2xl shadow-indigo-200">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 blur-[60px]" />
            <div className="flex items-center gap-3">
              <History size={18} className="text-indigo-400" />
              <h4 className="font-black uppercase tracking-widest text-[10px] opacity-60">Transmission Log</h4>
            </div>

            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {history?.slice(0, 10).map((item) => (
                <div key={item._id} className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2 hover:bg-white/10 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-400 text-[8px] font-black uppercase tracking-widest">{item.recipientType}</span>
                    <span className="text-[8px] opacity-40 font-bold">{new Date(item.createdAt).toLocaleDateString()}</span>
                  </div>
                  <h5 className="font-black text-sm line-clamp-1">{item.title}</h5>
                  <p className="text-[10px] opacity-60 line-clamp-2">{item.body}</p>
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${item.fcmStatus === 'sent' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                      <span className="text-[8px] font-black uppercase tracking-widest opacity-60">{item.fcmStatus}</span>
                    </div>
                  </div>
                </div>
              ))}

              {(!history || history.length === 0) && (
                <div className="py-20 text-center opacity-40">
                  <Bell size={24} className="mx-auto mb-2" />
                  <p className="text-[10px] font-black uppercase tracking-widest">No history found</p>
                </div>
              )}
            </div>

            <button onClick={() => refetchHistory()} className="w-full h-12 bg-white/10 hover:bg-white/20 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">Refresh Manifest</button>
          </section>

          <section className="bg-emerald-500/5 border border-emerald-500/20 rounded-[40px] p-8 space-y-4">
             <div className="flex items-center gap-3 text-emerald-600">
                <CheckCircle2 size={18} />
                <h4 className="font-black uppercase tracking-widest text-[10px]">Infrastructure Ready</h4>
             </div>
             <p className="text-[10px] font-bold text-emerald-700/60 leading-relaxed uppercase tracking-tighter">
               Messaging cluster is synchronized with Firebase Cloud Messaging. Notifications use BullMQ asynchronous deployment for heavy broadcasts.
             </p>
          </section>
        </div>
      </div>
    </div>
  );
}
