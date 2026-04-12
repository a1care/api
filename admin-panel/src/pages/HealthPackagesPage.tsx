import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
    Plus, Trash2, Star, X, Package, ToggleLeft, ToggleRight,
    Loader2, Pencil, Sparkles, CheckCircle2, CircleDashed
} from "lucide-react";
import { toast } from "sonner";

interface HealthPackage {
    _id: string;
    name: string;
    description: string;
    price: number;
    originalPrice: number;
    imageUrl?: string;
    badge?: string;
    color: string;
    testsIncluded: string[];
    validityDays: number;
    isActive: boolean;
    isFeatured: boolean;
    order: number;
    createdAt: string;
}

const PRESET_COLORS = [
    { label: "Blue", value: "#2F80ED" },
    { label: "Purple", value: "#9B51E0" },
    { label: "Pink", value: "#D63384" },
    { label: "Red", value: "#EB5757" },
    { label: "Orange", value: "#F2994A" },
    { label: "Green", value: "#27AE60" },
    { label: "Teal", value: "#11998E" },
];

const emptyForm = {
    name: "", description: "", price: "", originalPrice: "",
    badge: "", color: "#2F80ED", testsIncluded: "", validityDays: "30", order: "0",
};

export function HealthPackagesPage() {
    const queryClient = useQueryClient();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<HealthPackage | null>(null);
    const [form, setForm] = useState({ ...emptyForm });

    const field = (key: keyof typeof emptyForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
        setForm(f => ({ ...f, [key]: e.target.value }));

    const openCreate = () => { setEditTarget(null); setForm({ ...emptyForm }); setIsModalOpen(true); };
    const openEdit = (pkg: HealthPackage) => {
        setEditTarget(pkg);
        setForm({
            name: pkg.name, description: pkg.description,
            price: String(pkg.price), originalPrice: String(pkg.originalPrice),
            badge: pkg.badge || "", color: pkg.color,
            testsIncluded: pkg.testsIncluded.join(", "),
            validityDays: String(pkg.validityDays), order: String(pkg.order),
        });
        setIsModalOpen(true);
    };

    // ── Fetch ──
    const { data: packages, isLoading } = useQuery({
        queryKey: ["admin_health_packages"],
        queryFn: async () => {
            const res = await api.get("/health-packages/admin/all");
            return res.data.data as HealthPackage[];
        },
    });

    // ── Mutations ──
    const saveMutation = useMutation({
        mutationFn: async (data: any) => {
            if (editTarget) {
                return api.put(`/health-packages/admin/update/${editTarget._id}`, data);
            } else {
                return api.post("/health-packages/admin/create", data);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin_health_packages"] });
            setIsModalOpen(false);
            toast.success(editTarget ? "Package updated!" : "Package created!");
        },
        onError: (e: any) => toast.error(e?.response?.data?.message || "Failed to save package"),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/health-packages/admin/delete/${id}`),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin_health_packages"] }); toast.success("Package deleted"); },
        onError: () => toast.error("Failed to delete"),
    });

    const toggleActiveMutation = useMutation({
        mutationFn: (id: string) => api.patch(`/health-packages/admin/toggle-active/${id}`),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin_health_packages"] }); },
        onError: () => toast.error("Failed to toggle"),
    });

    const toggleFeaturedMutation = useMutation({
        mutationFn: (id: string) => api.patch(`/health-packages/admin/toggle-featured/${id}`),
        onSuccess: (_, id) => {
            queryClient.invalidateQueries({ queryKey: ["admin_health_packages"] });
            const pkg = packages?.find(p => p._id === id);
            toast.success(pkg?.isFeatured ? "Removed from featured" : "⭐ Now featured in user app!");
        },
        onError: () => toast.error("Failed to toggle featured"),
    });

    const seedMutation = useMutation({
        mutationFn: () => api.post("/health-packages/admin/seed"),
        onSuccess: (res) => {
            queryClient.invalidateQueries({ queryKey: ["admin_health_packages"] });
            toast.success(res.data.message);
        },
        onError: () => toast.error("Seed failed"),
    });

    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        saveMutation.mutate({
            ...form,
            price: Number(form.price),
            originalPrice: Number(form.originalPrice),
            validityDays: Number(form.validityDays),
            order: Number(form.order),
            testsIncluded: form.testsIncluded.split(",").map(t => t.trim()).filter(Boolean),
        });
    };

    const confirmDelete = () => {
        if (deleteTargetId) {
            deleteMutation.mutate(deleteTargetId);
            setDeleteTargetId(null);
        }
    };

    const discount = (orig: number, price: number) => orig > price ? Math.round(((orig - price) / orig) * 100) : 0;

    return (
        <div className="flex-col gap-4">
            {/* Header */}
            <header className="flex justify-between items-center" style={{ marginBottom: "24px" }}>
                <div>
                    <h1 className="brand-name" style={{ fontSize: "1.75rem" }}>Health Packages</h1>
                    <p className="muted font-bold tracking-wider" style={{ fontSize: "0.75rem", textTransform: "uppercase", marginTop: "4px" }}>
                        Manage bundled health checkup packages shown in the user app
                    </p>
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                    {(!packages || packages.length === 0) && (
                        <button
                            className="button secondary"
                            onClick={() => seedMutation.mutate()}
                            disabled={seedMutation.isPending}
                        >
                            {seedMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                            Seed Default Packages
                        </button>
                    )}
                    <button className="button primary" onClick={openCreate}>
                        <Plus size={18} /> New Package
                    </button>
                </div>
            </header>

            {/* Stats Bar */}
            {packages && packages.length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "24px" }}>
                    {[
                        { label: "Total Packages", value: packages.length, icon: Package },
                        { label: "Active", value: packages.filter(p => p.isActive).length, icon: CheckCircle2 },
                        { label: "Featured", value: packages.filter(p => p.isFeatured).length, icon: Star },
                    ].map(({ label, value, icon: Icon }) => (
                        <div key={label} className="card flex items-center gap-4" style={{ padding: "20px 24px" }}>
                            <div className="icon-box"><Icon size={20} /></div>
                            <div>
                                <p className="text-xs muted font-bold uppercase tracking-wider">{label}</p>
                                <p className="brand-name" style={{ fontSize: "1.5rem", margin: 0 }}>{value}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Package Grid */}
            {isLoading ? (
                <div className="card-ghost">Loading packages...</div>
            ) : packages && packages.length > 0 ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "16px" }}>
                    {packages.map((pkg) => (
                        <article key={pkg._id} className="card flex-col gap-0" style={{ padding: 0, overflow: "hidden", opacity: pkg.isActive ? 1 : 0.6 }}>
                            {/* Color Header */}
                            <div style={{
                                background: `linear-gradient(135deg, ${pkg.color}, ${pkg.color}cc)`,
                                padding: "20px 20px 16px",
                                position: "relative",
                            }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                    <div>
                                        {pkg.badge && (
                                            <span style={{ fontSize: "0.65rem", background: "rgba(255,255,255,0.25)", color: "#fff", padding: "3px 10px", borderRadius: "999px", fontWeight: 700, letterSpacing: "0.08em", display: "inline-block", marginBottom: "8px" }}>
                                                {pkg.badge}
                                            </span>
                                        )}
                                        <h3 style={{ color: "#fff", fontWeight: 800, fontSize: "1.1rem", margin: 0 }}>{pkg.name}</h3>
                                        <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.78rem", marginTop: "4px" }}>{pkg.validityDays} days validity</p>
                                    </div>
                                    <div style={{ textAlign: "right" }}>
                                        <p style={{ color: "#fff", fontWeight: 900, fontSize: "1.4rem", margin: 0 }}>₹{pkg.price}</p>
                                        {discount(pkg.originalPrice, pkg.price) > 0 && (
                                            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.75rem", textDecoration: "line-through" }}>₹{pkg.originalPrice}</p>
                                        )}
                                        {discount(pkg.originalPrice, pkg.price) > 0 && (
                                            <span style={{ background: "#22c55e", color: "#fff", fontSize: "0.65rem", padding: "2px 8px", borderRadius: "999px", fontWeight: 700 }}>
                                                {discount(pkg.originalPrice, pkg.price)}% OFF
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Tests List */}
                            <div style={{ padding: "16px 20px", flex: 1 }}>
                                <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>
                                    {pkg.testsIncluded.length} Tests Included
                                </p>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                                    {pkg.testsIncluded.slice(0, 4).map((test) => (
                                        <span key={test} style={{ fontSize: "0.72rem", background: "#f1f5f9", color: "#475569", padding: "4px 10px", borderRadius: "999px" }}>
                                            {test}
                                        </span>
                                    ))}
                                    {pkg.testsIncluded.length > 4 && (
                                        <span style={{ fontSize: "0.72rem", background: "#e2e8f0", color: "#64748b", padding: "4px 10px", borderRadius: "999px" }}>
                                            +{pkg.testsIncluded.length - 4} more
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Actions */}
                            <div style={{ padding: "12px 16px", borderTop: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: "8px" }}>
                                {/* Featured toggle */}
                                <button
                                    title={pkg.isFeatured ? "Remove from featured" : "Mark as featured"}
                                    onClick={() => toggleFeaturedMutation.mutate(pkg._id)}
                                    style={{ padding: "8px", borderRadius: "8px", border: "none", cursor: "pointer", background: pkg.isFeatured ? "#fef9c3" : "transparent", color: pkg.isFeatured ? "#f59e0b" : "#94a3b8" }}
                                >
                                    <Star size={18} fill={pkg.isFeatured ? "#f59e0b" : "none"} />
                                </button>

                                {/* Active toggle */}
                                <button
                                    title={pkg.isActive ? "Deactivate" : "Activate"}
                                    onClick={() => toggleActiveMutation.mutate(pkg._id)}
                                    style={{ padding: "8px", borderRadius: "8px", border: "none", cursor: "pointer", background: "transparent", color: pkg.isActive ? "#22c55e" : "#94a3b8" }}
                                >
                                    {pkg.isActive ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                                </button>

                                <div style={{ flex: 1 }} />

                                {/* Edit */}
                                <button
                                    onClick={() => openEdit(pkg)}
                                    className="button secondary"
                                    style={{ height: "36px", padding: "0 12px", fontSize: "0.8rem" }}
                                >
                                    <Pencil size={14} /> Edit
                                </button>

                                {/* Delete */}
                                <button
                                    onClick={() => setDeleteTargetId(pkg._id)}
                                    className="logout-btn"
                                    style={{ padding: "8px", color: "#ef4444" }}
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </article>
                    ))}
                </div>
            ) : (
                <div className="card-ghost" style={{ flexDirection: "column", gap: "16px" }}>
                    <Package size={40} style={{ opacity: 0.4 }} />
                    <p>No health packages yet.</p>
                    <button className="button primary" onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending}>
                        <Sparkles size={16} /> Seed 6 Default Packages
                    </button>
                </div>
            )}

            {/* Create / Edit Modal */}
            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: "580px" }}>
                        <div style={{ padding: "24px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                                <h3 className="brand-name">{editTarget ? "Edit Package" : "New Health Package"}</h3>
                                <p className="text-xs muted">Fill in the details for this bundled service</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="logout-btn"><X size={24} /></button>
                        </div>

                        <form onSubmit={handleSubmit} style={{ padding: "24px" }} className="flex-col gap-4">
                            <div className="input-group">
                                <label>Package Name *</label>
                                <input value={form.name} onChange={field("name")} placeholder="e.g., Basic Health Checkup" required />
                            </div>

                            <div className="input-group">
                                <label>Description *</label>
                                <textarea
                                    value={form.description} onChange={field("description") as any}
                                    placeholder="Brief description shown in the app..."
                                    style={{ width: "100%", padding: "12px", borderRadius: "12px", background: "#f8fafc", border: "none", minHeight: "80px", fontFamily: "inherit" }}
                                    required
                                />
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                                <div className="input-group">
                                    <label>Sale Price (₹) *</label>
                                    <input type="number" value={form.price} onChange={field("price")} placeholder="999" required />
                                </div>
                                <div className="input-group">
                                    <label>Original Price (₹) *</label>
                                    <input type="number" value={form.originalPrice} onChange={field("originalPrice")} placeholder="1499" required />
                                </div>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                                <div className="input-group">
                                    <label>Badge Label</label>
                                    <input value={form.badge} onChange={field("badge")} placeholder="e.g., BEST VALUE" />
                                </div>
                                <div className="input-group">
                                    <label>Validity (Days)</label>
                                    <input type="number" value={form.validityDays} onChange={field("validityDays")} placeholder="30" />
                                </div>
                            </div>

                            <div className="input-group">
                                <label>Tests Included (comma-separated)</label>
                                <textarea
                                    value={form.testsIncluded} onChange={field("testsIncluded") as any}
                                    placeholder="CBC, Blood Sugar, ECG, Urine Routine..."
                                    style={{ width: "100%", padding: "12px", borderRadius: "12px", background: "#f8fafc", border: "none", minHeight: "70px", fontFamily: "inherit" }}
                                />
                            </div>

                            <div className="input-group">
                                <label>Card Color</label>
                                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "8px" }}>
                                    {PRESET_COLORS.map(c => (
                                        <button
                                            key={c.value} type="button"
                                            onClick={() => setForm(f => ({ ...f, color: c.value }))}
                                            style={{
                                                width: "36px", height: "36px", borderRadius: "50%", background: c.value,
                                                border: form.color === c.value ? "3px solid #0f172a" : "3px solid transparent",
                                                cursor: "pointer",
                                            }}
                                            title={c.label}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className="input-group">
                                <label>Display Order</label>
                                <input type="number" value={form.order} onChange={field("order")} placeholder="0" />
                            </div>

                            <button className="button primary full-width" disabled={saveMutation.isPending} style={{ marginTop: "8px" }}>
                                {saveMutation.isPending ? "Saving..." : editTarget ? "Update Package" : "Create Package"}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteTargetId && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: "420px", textAlign: "center", padding: "32px 24px" }}>
                        <div style={{
                            width: "64px", height: "64px", background: "#fee2e2", color: "#ef4444",
                            borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                            margin: "0 auto 20px"
                        }}>
                            <Trash2 size={32} />
                        </div>
                        <h3 className="brand-name" style={{ marginBottom: "8px" }}>Delete Health Package?</h3>
                        <p className="muted" style={{ fontSize: "0.9rem", marginBottom: "32px" }}>
                            This action cannot be undone. This package will be permanently removed from the catalog.
                        </p>
                        <div style={{ display: "flex", gap: "12px" }}>
                            <button
                                className="button secondary full-width"
                                onClick={() => setDeleteTargetId(null)}
                                style={{ height: "48px" }}
                            >
                                Cancel
                            </button>
                            <button
                                className="button primary full-width"
                                onClick={confirmDelete}
                                style={{ background: "#ef4444", color: "white", height: "48px" }}
                            >
                                Delete Permanently
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
