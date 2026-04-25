import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useState } from "react";
import { 
    Banknote, 
    Clock, 
    CheckCircle2, 
    XCircle, 
    Search, 
    Filter, 
    ChevronRight,
    Loader2,
    ArrowUpRight,
    Building2,
    User,
    CreditCard
} from "lucide-react";
import { toast } from "sonner";

interface Payout {
    _id: string;
    staffId: {
        _id: string;
        name: string;
        mobileNumber: string;
    };
    amount: number;
    status: "PENDING" | "APPROVED" | "REJECTED" | "COMPLETED";
    bankDetails: {
        accountHolderName: string;
        accountNumber: string;
        ifscCode: string;
        bankName: string;
        upiId?: string;
    };
    createdAt: string;
    adminNote?: string;
}

export function PayoutsPage() {
    const queryClient = useQueryClient();
    const [filter, setFilter] = useState("All"); 
    const [page, setPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null);
    const [adminNote, setAdminNote] = useState("");
    const [isReconciling, setIsReconciling] = useState(false);

    const { data: payoutData, isLoading, isFetching } = useQuery({
        queryKey: ["admin_payouts", filter, page, searchQuery],
        queryFn: async () => {
            const res = await api.get(`/admin/payouts?status=${filter}&page=${page}&limit=60&search=${searchQuery}`);
            return res.data.data;
        },
        staleTime: 30000,
        refetchOnWindowFocus: false
    });

    const payouts: Payout[] = payoutData?.items || [];
    const totalPages: number = payoutData?.totalPages || 1;

    const updateStatusMutation = useMutation({
        mutationFn: async ({ id, status, note }: { id: string, status: string, note?: string }) => {
            return api.put(`/admin/payouts/${id}`, { status, adminNote: note });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin_payouts"] });
            toast.success("Settlement record finalized");
            setSelectedPayout(null);
            setAdminNote("");
        },
        onMutate: () => setIsReconciling(true),
        onSettled: () => setIsReconciling(false)
    });

    if (isLoading && !payouts) return (
        <div className="flex flex-col items-center justify-center p-20 gap-4">
            <Loader2 className="animate-spin text-blue-500" size={48} />
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Reconciling Ledger...</p>
        </div>
    );

    const pendingTotal = payouts?.filter(p => p.status === "PENDING").reduce((acc, p) => acc + p.amount, 0) || 0;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-4">
                        Financial Settlements
                        {isFetching && <Loader2 size={24} className="text-blue-500 animate-spin" />}
                    </h1>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-2 flex items-center gap-2">
                        <Banknote size={16} className="text-blue-500" /> Authorized payouts for service expertise
                    </p>
                </div>
                
                <div className="flex gap-2 bg-slate-100/50 p-1.5 rounded-3xl backdrop-blur-md border border-white/50 shadow-inner">
                    {["All", "PENDING", "COMPLETED", "REJECTED"].map(f => (
                        <button 
                            key={f}
                            onClick={() => { setFilter(f); setPage(1); }}
                            className={`px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${filter === f ? 'bg-white text-blue-600 shadow-md scale-105' : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'}`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </header>

            {/* Search Row */}
            <div className="relative group max-w-md">
                <Search size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                <input
                    type="text"
                    placeholder="Search by Partner, Mobile, Bank or ID..."
                    className="w-full h-14 pl-16 pr-6 bg-white border border-slate-100 rounded-[28px] text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-50 transition-all shadow-sm"
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                />
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-8 rounded-[40px] shadow-2xl shadow-blue-200 text-white relative overflow-hidden group">
                    <div className="relative z-10">
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">Awaiting Settlement</p>
                        <h2 className="text-4xl font-black">₹{pendingTotal.toLocaleString()}</h2>
                        <div className="mt-6 flex items-center gap-2 text-xs font-bold bg-white/10 w-fit px-3 py-1 rounded-full backdrop-blur-sm">
                            <Clock size={14} /> Total {payouts?.filter(p => p.status === "PENDING").length} Requests
                        </div>
                    </div>
                    <Banknote className="absolute -right-8 -bottom-8 opacity-10 group-hover:scale-110 transition-transform duration-500" size={180} />
                </div>

                <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-xl shadow-slate-100/50 flex flex-col justify-between">
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Average Payout</p>
                        <h2 className="text-4xl font-black text-slate-900">₹{(payouts && payouts.length > 0 ? (payouts.reduce((acc, p) => acc + p.amount, 0) / payouts.length) : 0).toLocaleString()}</h2>
                    </div>
                    <div className="mt-4 text-xs font-bold text-emerald-500 flex items-center gap-1">
                        <ArrowUpRight size={14} /> System Stability Index Optimized
                    </div>
                </div>

                <div className="bg-slate-900 p-8 rounded-[40px] text-white flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Settlement Speed</p>
                            <h2 className="text-4xl font-black">~4h</h2>
                        </div>
                        <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                            <Clock className="text-blue-400" />
                        </div>
                    </div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Same-Day Processing Enabled</div>
                </div>
            </div>

            <div className="grid gap-6 mt-12">
                {payouts.map((payout) => (
                    <div key={payout._id} className="bg-white rounded-[32px] border border-slate-50 shadow-lg hover:shadow-2xl hover:scale-[1.01] transition-all duration-500 overflow-hidden group">
                        <div className="flex flex-col xl:flex-row">
                            <div className="p-8 xl:w-1/3 bg-slate-50/30 border-r border-slate-50 relative">
                                <div className="absolute top-0 right-0 p-4">
                                     <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                         payout.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600' : 
                                         payout.status === 'REJECTED' ? 'bg-rose-50 text-rose-600' :
                                         'bg-amber-50 text-amber-600'
                                     }`}>
                                         {payout.status}
                                     </span>
                                </div>
                                
                                <div className="flex items-center gap-6 mb-8">
                                    <div className="w-20 h-20 rounded-[28px] bg-gradient-to-tr from-slate-100 to-white flex items-center justify-center text-slate-400 border border-white shadow-xl group-hover:rotate-3 transition-transform duration-500">
                                        <User size={40} className="group-hover:text-blue-500 transition-colors" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-slate-900 leading-tight">{payout.staffId?.name}</h3>
                                        <p className="text-xs font-black text-blue-500 uppercase tracking-widest mt-1 opacity-70">Healthcare Partner</p>
                                        <div className="flex items-center gap-1.5 mt-2 text-xs font-bold text-slate-400">
                                            <CreditCard size={14} /> {payout.staffId?.mobileNumber}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Request Date</p>
                                        <p className="text-xs font-black text-slate-700">{new Date(payout.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                                    </div>
                                    <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Ref ID</p>
                                        <p className="text-xs font-black text-slate-700">#{payout._id.slice(-6).toUpperCase()}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 xl:w-1/3 flex flex-col justify-center gap-6">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Building2 size={16} className="text-blue-500" /> Banking Destination Verified
                                </h4>
                                <div className="bg-slate-50/50 p-6 rounded-[32px] border border-slate-100 border-dashed space-y-4">
                                    <div className="flex items-start gap-4">
                                        <div className="p-3 bg-white rounded-2xl text-blue-600 shadow-sm">
                                            <Building2 size={20} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Institution</p>
                                            <p className="text-sm font-black text-slate-900">{payout.bankDetails?.bankName}</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-6 pt-2">
                                        <div>
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Account Number</p>
                                            <p className="text-xs font-black text-slate-800 tracking-wider">•••• {payout.bankDetails?.accountNumber?.slice(-4)}</p>
                                        </div>
                                        <div>
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">IFSC Token</p>
                                            <p className="text-xs font-black text-slate-800 tracking-wider uppercase">{payout.bankDetails?.ifscCode}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 xl:w-1/3 flex flex-col justify-between bg-slate-50/20 border-l border-slate-50">
                                <div className="flex justify-between items-start">
                                    <div className="p-4 bg-emerald-50 rounded-2xl text-emerald-600 shadow-inner">
                                        <ArrowUpRight size={24} />
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Funds Disbursement</p>
                                        <h2 className="text-4xl font-black text-slate-900 tracking-tight">₹{payout.amount.toLocaleString()}</h2>
                                    </div>
                                </div>
                                
                                {payout.status === 'PENDING' ? (
                                    <div className="flex gap-4 mt-12">
                                        <button 
                                            onClick={() => {
                                                toast.info("Confirm Settlement?", {
                                                    description: "Authorize full disbursement of ₹" + payout.amount + "?",
                                                    action: {
                                                        label: "Authorize",
                                                        onClick: () => updateStatusMutation.mutate({ id: payout._id, status: 'COMPLETED' })
                                                    }
                                                });
                                            }}
                                            className="flex-1 bg-slate-900 hover:bg-black text-white h-16 rounded-[24px] font-black text-[12px] uppercase tracking-widest shadow-2xl transition-all duration-300 flex items-center justify-center gap-3 active:scale-95"
                                        >
                                            <CheckCircle2 size={20} /> Authorize Now
                                        </button>
                                        <button 
                                            onClick={() => setSelectedPayout(payout)}
                                            className="w-16 h-16 bg-white border border-slate-100 rounded-[24px] flex items-center justify-center text-slate-400 hover:text-rose-500 hover:border-rose-100 transition-all duration-300 shadow-sm"
                                        >
                                            <XCircle size={28} />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="mt-8 flex flex-col gap-2">
                                        <div className="p-4 bg-white/50 backdrop-blur-md rounded-2xl border border-slate-100 border-dashed text-center">
                                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                                                Finalized on {new Date(payout.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                        {payout.adminNote && (
                                            <div className="p-3 bg-rose-50/50 rounded-xl text-[10px] font-bold text-rose-500 italic">
                                                Note: {payout.adminNote}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}

                {payouts.length === 0 && (
                    <div className="py-32 text-center bg-slate-50/50 border-4 border-dashed border-white rounded-[60px] shadow-inner">
                        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
                            <Banknote size={48} className="text-slate-200" />
                        </div>
                        <h3 className="text-2xl font-black text-slate-300 uppercase tracking-[0.2em]">Queue Clean</h3>
                        <p className="text-xs font-bold text-slate-400 uppercase mt-2 tracking-widest">Waiting for next partner withdrawal request</p>
                    </div>
                )}

                {/* Pagination */}
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
            </div>

            {/* Rejection Modal */}
            {selectedPayout && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl flex items-center justify-center z-[100] p-6 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-lg rounded-[48px] p-10 shadow-3xl animate-in zoom-in-95 duration-300">
                        <div className="flex justify-between items-start mb-8">
                            <div>
                                <h3 className="text-3xl font-black text-slate-900">Decline Settlement</h3>
                                <p className="text-sm font-bold text-slate-400 mt-2 uppercase tracking-widest">Amount: ₹{selectedPayout.amount}</p>
                            </div>
                            <button onClick={() => setSelectedPayout(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                                <XCircle size={32} className="text-slate-200" />
                            </button>
                        </div>
                        
                        <div className="space-y-6">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block">Internal Feedback / Reason</label>
                                <textarea 
                                    className="w-full h-40 bg-slate-50 border-none rounded-[32px] p-6 text-sm font-bold text-slate-700 focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                                    placeholder="Explain why this payout was rejected (e.g. Invalid bank details, Fraud check needed)..."
                                    value={adminNote}
                                    onChange={(e) => setAdminNote(e.target.value)}
                                />
                            </div>
                            
                            <button 
                                onClick={() => updateStatusMutation.mutate({ id: selectedPayout._id, status: 'REJECTED', note: adminNote })}
                                disabled={updateStatusMutation.isPending}
                                className="w-full bg-rose-600 hover:bg-rose-700 text-white h-16 rounded-[24px] font-black text-sm uppercase tracking-widest shadow-xl shadow-rose-100 transition-all active:scale-95 disabled:opacity-50"
                            >
                                {updateStatusMutation.isPending ? "Finalizing..." : "Confirm Rejection"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
