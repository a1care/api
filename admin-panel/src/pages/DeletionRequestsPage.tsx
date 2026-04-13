import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { 
  UserX, 
  Search, 
  Clock, 
  Trash2, 
  User, 
  Briefcase,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Phone
} from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

interface DeletionRequest {
  id: string;
  type: 'patient' | 'staff';
  name: string;
  mobileNumber: string;
  requestedAt: string;
}

export default function DeletionRequestsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: requests, isLoading } = useQuery({
    queryKey: ["admin-deletion-requests"],
    queryFn: async () => {
      const res = await api.get("/admin/deletion-requests");
      return res.data.data as DeletionRequest[];
    }
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, type }: { id: string, type: 'patient' | 'staff' }) => {
      return api.post(`/admin/deletion-approve/${id}`, { type });
    },
    onSuccess: () => {
      toast.success("Account deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-deletion-requests"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to process request");
    }
  });

  const filtered = requests?.filter(r => 
    r.name?.toLowerCase().includes(search.toLowerCase()) || 
    r.mobileNumber?.includes(search)
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-20 text-slate-400">
        <Loader2 className="w-10 h-10 animate-spin mr-3" />
        <span className="font-bold uppercase tracking-widest text-xs">Loading requests...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Deletion Requests</h1>
          <p className="text-slate-500 font-medium mt-1">Super Admin approval queue for account terminations.</p>
        </div>

        <div className="flex items-center gap-2 bg-rose-50 border border-rose-100 px-6 py-4 rounded-[24px]">
          <div className="w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center text-rose-600 shadow-inner">
            <UserX size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black text-rose-800 uppercase tracking-widest">Pending Requests</p>
            <p className="text-2xl font-black text-rose-900 leading-none mt-1">{requests?.length || 0}</p>
          </div>
        </div>
      </header>

      <div className="relative group max-w-2xl">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
        <input 
          type="text"
          placeholder="Search by name or mobile..."
          className="w-full pl-16 pr-6 py-5 bg-white border-2 border-slate-100 rounded-[28px] text-slate-700 font-bold focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-50/50 transition-all shadow-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {filtered?.map((req) => (
          <div key={req.id} className="bg-white border border-slate-100 rounded-[32px] overflow-hidden hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500 group">
            <div className="p-8">
              <div className="flex items-start justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${
                    req.type === 'patient' ? "bg-blue-50 text-blue-600" : "bg-emerald-50 text-emerald-600"
                  }`}>
                    {req.type === 'patient' ? <User size={24} /> : <Briefcase size={24} />}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 leading-tight">{req.name || "Anonymous User"}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Phone size={12} className="text-slate-400" />
                      <p className="text-sm font-bold text-slate-500">{req.mobileNumber}</p>
                    </div>
                  </div>
                </div>
                <div className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase ${
                  req.type === 'patient' ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"
                }`}>
                  {req.type}
                </div>
              </div>

              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 space-y-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-black uppercase tracking-widest flex items-center gap-2">
                    <Clock size={14} /> Requested On
                  </span>
                  <span className="text-slate-700 font-bold">
                    {new Date(req.requestedAt).toLocaleDateString()} at {new Date(req.requestedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                
                <div className="flex items-start gap-4 p-4 bg-rose-50/50 border border-rose-100/50 rounded-xl">
                    <AlertTriangle className="text-rose-500 shrink-0 mt-0.5" size={16} />
                    <p className="text-[11px] font-bold text-rose-800 leading-relaxed uppercase tracking-wide">
                        Warning: This action is irreversible. All health records, appointments, and wallet data will be permanently wiped.
                    </p>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-50 flex gap-4">
                <button
                  onClick={() => approveMutation.mutate({ id: req.id, type: req.type })}
                  disabled={approveMutation.isPending}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-200 text-white font-black py-4 rounded-2xl text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-lg shadow-rose-200 hover:-translate-y-1 active:scale-95"
                >
                  {approveMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={18} />}
                  Confirm Permanent Deletion
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtered?.length === 0 && (
        <div className="py-32 bg-white border-2 border-dashed border-slate-100 rounded-[40px] text-center flex flex-col items-center justify-center space-y-4">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-200">
            <CheckCircle size={40} />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900">Queue is Clear</h3>
            <p className="text-slate-500 font-medium">No pending account deletion requests found.</p>
          </div>
        </div>
      )}
    </div>
  );
}
