import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
    BarChart3,
    Settings2,
    ShieldCheck,
    Crown,
    Trash2,
    PlusCircle,
    RefreshCw,
    Percent,
    CheckCircle2,
    ChevronRight
} from "lucide-react";
import { toast } from "sonner";

type SubscriptionTier = "Basic" | "Standard" | "Premium";

interface Plan {
    _id?: string;
    name: string;
    category: string;
    price: number;
    validityDays: number;
    commissionPercentage: number;
    tier: SubscriptionTier;
    features: string[];
    isActive: boolean;
}

const CATEGORIES = ["doctor", "nurse", "lab", "ambulance", "rental"];

export function SubscriptionManagementPage() {
    const qc = useQueryClient();
    const [selectedCategory, setSelectedCategory] = useState("doctor");
    const [editingPlan, setEditingPlan] = useState<Partial<Plan> | null>(null);

    const { data: plans = [], isLoading } = useQuery({
        queryKey: ["all-subscription-plans", selectedCategory],
        queryFn: async () => {
            const res = await api.get(`/subscription/plans?category=${selectedCategory}`);
            return res.data.data as Plan[];
        }
    });

    const saveMutation = useMutation({
        mutationFn: async (plan: Partial<Plan>) => {
            if (plan._id) {
                await api.put(`/subscription/plans/${plan._id}`, plan);
            } else {
                await api.post("/subscription/plans", plan);
            }
        },
        onSuccess: () => {
            setEditingPlan(null);
            qc.invalidateQueries({ queryKey: ["all-subscription-plans"] });
            toast.success("Service model updated successfully.");
        },
        onError: (err: any) => {
            toast.error(err?.response?.data?.message || "Failed to update service model.");
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`/subscription/plans/${id}`);
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["all-subscription-plans"] });
            toast.success("Plan tier deleted.");
        }
    });

    const handleCreateTier = (tier: SubscriptionTier) => {
        setEditingPlan({
            name: `${tier} Plan`,
            category: selectedCategory,
            price: 0,
            validityDays: 30,
            commissionPercentage: 15,
            tier: tier,
            features: [],
            isActive: true
        });
    };

    return (
        <section className="space-y-6">
            {/* Premium Header like D-Hub but A1Care themed */}
            <div className="card p-0 overflow-hidden" style={{ border: 'none', background: 'linear-gradient(135deg, #1A7FD4 0%, #2f80ed 100%)' }}>
                <div className="relative p-10 flex justify-between items-center text-white overflow-hidden">
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 text-blue-100 text-xs font-bold uppercase tracking-widest mb-3">
                            <span>Home</span>
                            <ChevronRight size={12} />
                            <span>Subscriptions</span>
                        </div>
                        <h1 className="text-4xl font-black mb-2">Partner Plans</h1>
                        <p className="text-blue-100 font-medium max-w-md">Manage commission rates and subscription tiers for the A1Care provider network.</p>
                    </div>
                    <div className="absolute right-[-40px] top-[-40px] w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                    <Crown size={120} className="text-white/10 relative z-0 rotate-12" />
                </div>
                <div className="bg-white/10 backdrop-blur-md p-4 flex gap-4 px-10">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-blue-50 uppercase tracking-widest">Category:</span>
                        <div className="flex gap-2 bg-black/10 p-1 rounded-xl">
                            {CATEGORIES.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setSelectedCategory(cat)}
                                    className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${selectedCategory === cat ? "bg-[var(--card-bg)] text-[#1A7FD4] shadow-lg" : "text-white/60 hover:text-white"
                                        }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8" style={{ marginTop: '24px' }}>
                {(["Basic", "Standard", "Premium"] as SubscriptionTier[]).map(tier => {
                    const plan = plans.find(p => p.tier === tier);
                    const themeColor = tier === "Premium" ? "#F59E0B" : tier === "Standard" ? "#1A7FD4" : "#64748B";
                    const themeBg = tier === "Premium" ? "#FEF3C7" : tier === "Standard" ? "#EBF3FD" : "#F1f5f9";

                    return (
                        <div key={tier} className="card p-0 overflow-hidden group hover:scale-[1.02] transition-all duration-300" style={{ border: 'none', borderRadius: '32px' }}>
                            <div className="p-8 pb-10">
                                <div className="flex justify-between items-start mb-8">
                                    <div className="icon-box" style={{ background: themeBg, color: themeColor, width: '56px', height: '56px', borderRadius: '16px' }}>
                                        {tier === "Premium" ? <Crown size={28} /> :
                                            tier === "Standard" ? <ShieldCheck size={28} /> :
                                                <BarChart3 size={28} />}
                                    </div>
                                    {plan ? (
                                        <button onClick={() => setEditingPlan(plan)} className="w-10 h-10 flex items-center justify-center bg-[var(--bg-main)] text-[var(--text-muted)] rounded-full hover:bg-[var(--bg-main)] transition-colors">
                                            <Settings2 size={18} />
                                        </button>
                                    ) : (
                                        <button onClick={() => handleCreateTier(tier)} className="w-12 h-12 flex items-center justify-center bg-blue-50 dark:bg-blue-500/10 text-[#1A7FD4] rounded-full hover:scale-110 transition-all shadow-lg shadow-blue-100">
                                            <PlusCircle size={24} />
                                        </button>
                                    )}
                                </div>

                                <div className="mb-6">
                                    <h3 className="text-3xl font-black text-[var(--text-main)] tracking-tight">{tier} Tier</h3>
                                    <p className="text-xs font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mt-2">Service Model</p>
                                </div>

                                {plan ? (
                                    <div className="space-y-6">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-5xl font-black text-[var(--text-main)] leading-none">₹{plan.price}</span>
                                                <span className="text-[var(--text-muted)] font-bold text-sm tracking-widest uppercase">/ Plan</span>
                                            </div>
                                            <div className="flex items-center gap-2 mt-2">
                                                <div className="badge primary px-3 py-1 text-[10px] font-black uppercase tracking-widest">
                                                    {plan.validityDays} Day Period
                                                </div>
                                                <div className="w-1 h-1 bg-slate-200 rounded-full"></div>
                                                <div className="text-[10px] font-black text-[#10b981] uppercase tracking-widest flex items-center gap-1">
                                                    <Percent size={12} /> {plan.commissionPercentage}% Commission
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-6 border-t border-slate-50">
                                            <div className="flex items-center gap-3 mb-5">
                                                <div className="h-px flex-1 bg-[var(--bg-main)]"></div>
                                                <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-[0.3em]">Value Props</p>
                                                <div className="h-px flex-1 bg-[var(--bg-main)]"></div>
                                            </div>
                                            <ul className="space-y-4">
                                                {(plan.features || []).slice(0, 4).map((f, i) => (
                                                    <li key={i} className="flex items-center gap-3 text-sm font-bold text-[var(--text-muted)]">
                                                        <div className="w-5 h-5 bg-blue-50 dark:bg-blue-500/10 rounded-full flex items-center justify-center text-[#1A7FD4]">
                                                            <CheckCircle2 size={12} />
                                                        </div>
                                                        {f}
                                                    </li>
                                                ))}
                                                {(plan.features || []).length > 4 && <li className="text-[10px] font-black text-[var(--text-muted)] pl-8 uppercase tracking-widest">+{(plan.features || []).length - 4} Higher Tier Benefits</li>}
                                            </ul>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="py-12 flex flex-col items-center justify-center border-2 border-dashed border-[var(--border-color)] rounded-[32px] bg-slate-50/30">
                                        <PlusCircle size={32} className="text-slate-200 mb-3" />
                                        <p className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest">Initialize Tier</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Subscription Approval Queue */}
            <div className="card mt-12 overflow-hidden" style={{ borderRadius: '32px' }}>
                <div className="p-8 border-b border-slate-50 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-black text-[var(--text-main)]">Activation Requests</h2>
                        <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mt-1">Pending Partner Subscriptions</p>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">Partner</th>
                                <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">Plan</th>
                                <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">Price</th>
                                <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">Request Date</th>
                                <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <PendingSubscriptionList qc={qc} />
                        </tbody>
                    </table>
                </div>
            </div>

            {editingPlan && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-[var(--card-bg)] w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="bg-slate-900 p-6 flex justify-between items-center">
                            <h2 className="text-white font-black text-xl">Configure {editingPlan.tier} Tier - {editingPlan.category}</h2>
                            <button onClick={() => setEditingPlan(null)} className="text-[var(--text-muted)] hover:text-white">✕</button>
                        </div>

                        <form className="p-8 space-y-6" onSubmit={(e) => {
                            e.preventDefault();
                            saveMutation.mutate(editingPlan);
                        }}>
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-black text-[var(--text-muted)] uppercase mb-2">Display Name</label>
                                    <input
                                        className="w-full bg-[var(--bg-main)] border-none rounded-xl p-3 font-bold"
                                        value={editingPlan.name}
                                        onChange={e => setEditingPlan({ ...editingPlan, name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-[var(--text-muted)] uppercase mb-2">Price (₹)</label>
                                    <input
                                        type="number"
                                        className="w-full bg-[var(--bg-main)] border-none rounded-xl p-3 font-bold"
                                        value={editingPlan.price}
                                        onChange={e => setEditingPlan({ ...editingPlan, price: Number(e.target.value) })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-[var(--text-muted)] uppercase mb-2">Validity (Days)</label>
                                    <input
                                        type="number"
                                        className="w-full bg-[var(--bg-main)] border-none rounded-xl p-3 font-bold"
                                        value={editingPlan.validityDays}
                                        onChange={e => setEditingPlan({ ...editingPlan, validityDays: Number(e.target.value) })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-[var(--text-muted)] uppercase mb-2">Commission Rate (%)</label>
                                    <input
                                        type="number"
                                        className="w-full bg-blue-50 dark:bg-blue-500/10 text-[#1A7FD4] border-none rounded-xl p-3 font-black"
                                        value={editingPlan.commissionPercentage}
                                        onChange={e => setEditingPlan({ ...editingPlan, commissionPercentage: Number(e.target.value) })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-black text-[var(--text-muted)] uppercase mb-2">Included Features (CSV)</label>
                                <textarea
                                    className="w-full bg-[var(--bg-main)] border-none rounded-xl p-3 font-bold h-24"
                                    placeholder="e.g. Higher visibility, Priority listings, Faster payouts"
                                    value={editingPlan.features?.join(", ")}
                                    onChange={e => setEditingPlan({ ...editingPlan, features: e.target.value.split(",").map(f => f.trim()).filter(Boolean) })}
                                />
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    type="submit"
                                    disabled={saveMutation.isPending}
                                    className="flex-1 bg-[#1A7FD4] text-white py-4 rounded-xl font-black text-lg shadow-lg shadow-blue-200 hover:bg-[#1565c0] transition-colors"
                                >
                                    {saveMutation.isPending ? "Integrating Node..." : "Save Configuration"}
                                </button>
                                {editingPlan._id && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            toast.error("Confirm deletion?", {
                                                description: "This will permanently remove this tier.",
                                                action: {
                                                    label: "Delete",
                                                    onClick: () => deleteMutation.mutate(editingPlan._id!)
                                                }
                                            });
                                        }}
                                        className="w-16 flex items-center justify-center bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-100 transition-colors"
                                    >
                                        <Trash2 size={24} />
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </section>
    );
}

function PendingSubscriptionList({ qc }: { qc: any }) {
    const { data: requests = [], isLoading } = useQuery({
        queryKey: ["pending-subscriptions"],
        queryFn: async () => {
            const res = await api.get("/subscription/admin/list?status=Pending");
            return res.data.data;
        }
    });

    const approve = useMutation({
        mutationFn: async (id: string) => {
            await api.put(`/subscription/admin/approve/${id}`);
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["pending-subscriptions"] });
            toast.success("Subscription approved successfully!");
        },
        onError: () => {
            toast.error("Failed to approve subscription.");
        }
    });

    if (isLoading) return <tr><td colSpan={5} className="p-8 text-center text-xs font-black text-[var(--text-muted)] uppercase tracking-widest">Scanning Network...</td></tr>;
    if (requests.length === 0) return <tr><td colSpan={5} className="p-12 text-center text-xs font-black text-[var(--text-muted)] uppercase tracking-widest bg-slate-50/20">All subscriptions reconciled.</td></tr>;

    return (
        <>
            {requests.map((req: any) => (
                <tr key={req._id} className="border-b border-slate-50 group hover:bg-slate-50/50 transition-colors">
                    <td className="p-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center font-black">
                                {req.partnerId?.name?.charAt(0) || "P"}
                            </div>
                            <div>
                                <p className="text-sm font-black text-[var(--text-main)]">{req.partnerId?.name || "Unknown Partner"}</p>
                                <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{req.partnerId?.mobileNumber}</p>
                            </div>
                        </div>
                    </td>
                    <td className="p-6">
                        <div className="badge primary px-2 py-1 text-[9px] font-black uppercase tracking-widest">
                            {req.planId?.name}
                        </div>
                    </td>
                    <td className="p-6 font-black text-sm text-[var(--text-main)]">₹{req.planId?.price}</td>
                    <td className="p-6 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                        {new Date(req.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-6">
                        <button
                            onClick={() => approve.mutate(req._id)}
                            disabled={approve.isPending}
                            className="h-10 px-6 bg-[#1A7FD4] text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-blue-100 hover:scale-105 transition-all flex items-center gap-2"
                        >
                            <CheckCircle2 size={14} />
                            {approve.isPending ? "Approving..." : "Approve Now"}
                        </button>
                    </td>
                </tr>
            ))}
        </>
    );
}

