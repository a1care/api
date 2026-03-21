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

    const { data: payouts, isLoading } = useQuery({
        queryKey: ["admin_payouts"],
        queryFn: async () => {
            const res = await api.get("/admin/payouts");
            return res.data.data as Payout[];
        }
    });

    const updateStatusMutation = useMutation({
        mutationFn: async ({ id, status, note }: { id: string, status: string, note?: string }) => {
            return api.put(`/admin/payouts/${id}`, { status, adminNote: note });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin_payouts"] });
            toast.success("Payout status updated");
        }
    });

    if (isLoading) return <div className="p-8 text-center font-bold text-slate-400">Loading Payout Requests...</div>;

    const filteredPayouts = payouts?.filter(p => filter === "All" || p.status === filter);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <header className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Earnings & Settlements</h1>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">Manage partner withdrawals and financial payouts</p>
                </div>
                <div className="flex gap-2 bg-slate-100 p-1 rounded-2xl">
                    {["All", "PENDING", "COMPLETED"].map(f => (
                        <button 
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === f ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </header>

            <div className="grid gap-4">
                {filteredPayouts?.map((payout) => (
                    <div key={payout._id} className="bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all overflow-hidden group">
                        <div className="flex flex-col md:flex-row">
                            {/* Staff Info */}
                            <div className="p-6 md:w-1/3 bg-slate-50/50 border-r border-slate-100">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600">
                                        <User size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-slate-900">{payout.staffId?.name}</h3>
                                        <p className="text-xs font-bold text-slate-400">{payout.staffId?.mobileNumber}</p>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center text-[10px] font-bold uppercase text-slate-400">
                                        <span>Requested On</span>
                                        <span className="text-slate-600">{new Date(payout.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-[10px] font-bold uppercase text-slate-400">
                                        <span>Status</span>
                                        <span className={`px-2 py-0.5 rounded-lg ${payout.status === 'COMPLETED' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                                            {payout.status}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Bank Details */}
                            <div className="p-6 md:w-1/3 space-y-3">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Building2 size={14} /> Settlement Destination
                                </h4>
                                <div className="bg-slate-50 p-4 rounded-2xl space-y-1">
                                    <p className="text-xs font-black text-slate-900">{payout.bankDetails?.bankName}</p>
                                    <p className="text-xs font-bold text-slate-600">A/C: {payout.bankDetails?.accountNumber}</p>
                                    <p className="text-[10px] font-bold text-slate-400">IFSC: {payout.bankDetails?.ifscCode}</p>
                                </div>
                            </div>

                            {/* Actions & Amount */}
                            <div className="p-6 md:w-1/3 flex flex-col justify-between border-l border-slate-100">
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Payout Amount</p>
                                    <h2 className="text-3xl font-black text-slate-900">₹{payout.amount}</h2>
                                </div>
                                
                                {payout.status === 'PENDING' ? (
                                    <div className="flex gap-2 mt-4">
                                        <button 
                                            onClick={() => updateStatusMutation.mutate({ id: payout._id, status: 'COMPLETED' })}
                                            className="flex-1 bg-green-600 hover:bg-green-700 text-white h-12 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-green-100 transition-all flex items-center justify-center gap-2"
                                        >
                                            <CheckCircle2 size={16} /> Mark Settled
                                        </button>
                                        <button 
                                            onClick={() => updateStatusMutation.mutate({ id: payout._id, status: 'REJECTED' })}
                                            className="w-12 h-12 border border-slate-200 rounded-2xl flex items-center justify-center text-slate-400 hover:text-red-500 hover:border-red-100 transition-all"
                                        >
                                            <XCircle size={20} />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="mt-4 p-3 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">
                                            Handled on {new Date(payout.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}

                {filteredPayouts?.length === 0 && (
                    <div className="py-20 text-center bg-slate-50 rounded-[40px] border-2 border-dashed border-slate-100">
                        <Banknote size={48} className="mx-auto text-slate-200 mb-4" />
                        <h3 className="text-lg font-black text-slate-400 uppercase tracking-widest">All caught up!</h3>
                        <p className="text-xs font-bold text-slate-300 uppercase mt-2">There are no pending withdrawal requests.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
