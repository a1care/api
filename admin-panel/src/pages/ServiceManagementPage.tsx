import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
    Plus,
    Trash2,
    ChevronRight,
    LayoutGrid,
    Layers,
    Tag,
    X,
    Image as ImageIcon,
    Loader2,
    MoreVertical,
    Filter,
    Search,
    Globe,
    Settings2,
    Star
} from "lucide-react";
import { toast } from "sonner";

interface Category {
    _id: string;
    name: string;
    type?: string;
}

interface SubService {
    _id: string;
    name: string;
    serviceId: string;
}

interface ChildService {
    _id: string;
    name: string;
    serviceId: string;
    subServiceId: string;
    price: number;
    isFeatured: boolean;
    isActive: boolean;
    rating: number;
    completed: number;
}

export function ServiceManagementPage() {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<"categories" | "sub-services" | "child-services">("categories");
    const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
    const [selectedSubId, setSelectedSubId] = useState<string | null>(null);

    // Modal States
    const [isCatModalOpen, setIsCatModalOpen] = useState(false);
    const [isSubModalOpen, setIsSubModalOpen] = useState(false);
    const [isChildModalOpen, setIsChildModalOpen] = useState(false);

    // Form States
    const [catName, setCatName] = useState("");
    const [catTitle, setCatTitle] = useState("");
    const [catType, setCatType] = useState("doctor");
    const [catFile, setCatFile] = useState<File | null>(null);

    // ── Data Cleaning Helper ──
    const cleanName = (name: string) => {
        return name.replace(/SELECT|ASSIGN/g, "").trim();
    };

    const cleanType = (type?: string) => {
        if (!type || type === "SELECT" || type === "ASSIGN") return "Service Node";
        return type;
    };

    // ── Mutations ──
    const createCatMutation = useMutation({
        mutationFn: async (formData: FormData) => {
            if (!formData.get("name") || !formData.get("title")) throw new Error("Missing required fields: Internal Name and Display Title are mandatory.");
            const res = await api.post("/services/create", formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin_categories"] });
            setIsCatModalOpen(false);
            setCatName(""); setCatTitle(""); setCatFile(null);
            toast.success("Category published — Root node established");
        },
        onError: (err: any) => {
            toast.error(err?.response?.data?.message || err.message || "Failed to publish category");
        }
    });

    const deleteCatMutation = useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`/services/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin_categories"] });
            toast.success("Category archived");
        }
    });

    // Sub-Service Form States
    const [subName, setSubName] = useState("");
    const [subDesc, setSubDesc] = useState("");
    const [subFile, setSubFile] = useState<File | null>(null);

    const createSubMutation = useMutation({
        mutationFn: async (formData: FormData) => {
            if (!selectedCatId) throw new Error("Category not selected");
            const res = await api.post(`/subservice/create/${selectedCatId}`, formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin_subservices", selectedCatId] });
            setIsSubModalOpen(false);
            setSubName(""); setSubDesc(""); setSubFile(null);
            toast.success("Sub-service added");
        },
        onError: (err: any) => {
            toast.error(err?.response?.data?.message || "Failed to add sub-service. Check all fields.");
        }
    });

    const deleteSubMutation = useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`/subservice/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin_subservices", selectedCatId] });
            toast.success("Sub-service archived");
        },
        onError: () => toast.error("Failed to delete sub-service.")
    });

    // Child-Service Form States
    const [childName, setChildName] = useState("");
    const [childDesc, setChildDesc] = useState("");
    const [childPrice, setChildPrice] = useState("");
    const [fulfillmentMode, setFulfillmentMode] = useState("HOME_VISIT");
    const [childFile, setChildFile] = useState<File | null>(null);

    const createChildMutation = useMutation({
        mutationFn: async (formData: FormData) => {
            if (!selectedCatId || !selectedSubId) throw new Error("Hierarchy missing");
            const res = await api.post(`/childService/create/${selectedCatId}/${selectedSubId}`, formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin_childservices", selectedSubId] });
            setIsChildModalOpen(false);
            setChildName(""); setChildDesc(""); setChildPrice(""); setChildFile(null);
            toast.success("Service item finalized");
        },
        onError: (err: any) => {
            toast.error(err?.response?.data?.message || "Failed to create service item. Check all fields.");
        }
    });

    const deleteChildMutation = useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`/childService/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin_childservices", selectedSubId] });
            toast.success("Item removed");
        },
        onError: () => toast.error("Failed to remove item.")
    });

    const toggleFeaturedMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await api.patch(`/childService/featured/toggle/${id}`);
            return res.data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["admin_childservices", selectedSubId] });
            const isFeatured = data?.data?.isFeatured;
            toast.success(isFeatured ? "⭐ Marked as Popular — will appear in user app!" : "Removed from Popular section");
        },
        onError: () => toast.error("Failed to update popular status.")
    });

    // ── Fetching Data ──
    const { data: categories, isLoading: loadingCats } = useQuery({
        queryKey: ["admin_categories"],
        queryFn: async () => {
            const res = await api.get("/services");
            return res.data.data as Category[];
        }
    });

    const { data: subServices, isLoading: loadingSubs } = useQuery({
        queryKey: ["admin_subservices", selectedCatId],
        queryFn: async () => {
            if (!selectedCatId) return [];
            const res = await api.get(`/subservice/${selectedCatId}`);
            return res.data.data as SubService[];
        },
        enabled: !!selectedCatId
    });

    const { data: childServices, isLoading: loadingChildren } = useQuery({
        queryKey: ["admin_childservices", selectedSubId],
        queryFn: async () => {
            if (!selectedSubId) return [];
            const res = await api.get(`/childService/${selectedSubId}`);
            return res.data.data as ChildService[];
        },
        enabled: !!selectedSubId
    });

    const currentCat = categories?.find(c => c._id === selectedCatId);
    const currentSub = subServices?.find(s => s._id === selectedSubId);

    // ── Render Helpers ──
    const renderCategories = () => (
        <div className="flex-col gap-4">
            <div className="section-header">
                <div className="flex items-center gap-3">
                    <div className="icon-box"><LayoutGrid size={20} /></div>
                    <div>
                        <h3 className="brand-name">Root Categories</h3>
                        <p className="text-xs muted">1. Select a primary service category</p>
                    </div>
                </div>
                <button onClick={() => setIsCatModalOpen(true)} className="button primary">
                    <Plus size={18} /> New Category
                </button>
            </div>

            <div className="grid-4">
                {categories?.map((cat) => (
                    <article
                        key={cat._id}
                        className={`card flex-col gap-3 group cursor-pointer ${selectedCatId === cat._id ? "card-primary" : ""}`}
                        onClick={() => { setSelectedCatId(cat._id); setSelectedSubId(null); setActiveTab("sub-services"); }}
                    >
                        <div className="flex justify-between items-start">
                            <div className="icon-box">
                                <LayoutGrid size={22} />
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); if (confirm('Archive category?')) deleteCatMutation.mutate(cat._id); }}
                                className="logout-btn"
                                style={{ padding: '6px' }}
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                        <div>
                            <h3 className="font-bold" style={{ fontSize: '1rem', marginBottom: '4px' }}>
                                {cleanName(cat.name)}
                            </h3>
                            <p className="text-xs muted uppercase tracking-wider font-bold" style={{ opacity: 0.7 }}>
                                {cleanType(cat.type)}
                            </p>
                        </div>
                        <div className="flex items-center justify-between" style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed rgba(0,0,0,0.05)' }}>
                            <span className="text-xs font-bold items-center gap-1" style={{ display: 'flex' }}>
                                <Settings2 size={12} /> Configured
                            </span>
                            <ChevronRight size={16} className="muted" />
                        </div>
                    </article>
                ))}
            </div>

            {loadingCats && <div className="card-ghost">Syncing catalog infrastructure...</div>}
        </div>
    );

    const renderSubServices = () => (
        <div className="flex-col gap-4">
            <div className="section-header">
                <div className="flex items-center gap-3">
                    <div className="icon-box"><Layers size={20} /></div>
                    <div>
                        <h3 className="brand-name">Sub-Services: {cleanName(currentCat?.name || "Tier 2")}</h3>
                        <p className="text-xs muted">2. Specialization layer for customers</p>
                    </div>
                </div>
                <button
                    onClick={() => setIsSubModalOpen(true)}
                    className="button primary"
                    disabled={!selectedCatId}
                >
                    <Plus size={18} /> Add Sub-Service
                </button>
            </div>

            {!selectedCatId ? (
                <div className="card-ghost">
                    <LayoutGrid size={32} style={{ marginBottom: '12px' }} />
                    <p>Select a primary category to view sub-services</p>
                </div>
            ) : (
                <div className="grid-3">
                    {subServices?.map((sub) => (
                        <article
                            key={sub._id}
                            className={`card flex-col gap-3 group cursor-pointer ${selectedSubId === sub._id ? "card-primary" : ""}`}
                            onClick={() => { setSelectedSubId(sub._id); setActiveTab("child-services"); }}
                        >
                            <div className="flex justify-between items-start">
                                <div className="icon-box">
                                    <Layers size={22} />
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); if (confirm('Archive sub-service?')) deleteSubMutation.mutate(sub._id); }}
                                    className="logout-btn"
                                    style={{ padding: '6px' }}
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                            <div>
                                <h3 className="font-bold" style={{ fontSize: '1rem' }}>{cleanName(sub.name)}</h3>
                                <p className="text-xs muted uppercase font-bold tracking-wider" style={{ opacity: 0.7 }}>Specialized Tier</p>
                            </div>
                            <div className="flex items-center justify-between" style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed rgba(0,0,0,0.05)' }}>
                                <span className="text-xs font-bold">Drill Down</span>
                                <ChevronRight size={16} />
                            </div>
                        </article>
                    ))}
                    {subServices?.length === 0 && !loadingSubs && (
                        <div className="card-ghost">No sub-services found for this node.</div>
                    )}
                </div>
            )}
        </div>
    );

    const renderChildServices = () => (
        <div className="flex-col gap-4">
            <div className="section-header">
                <div className="flex items-center gap-3">
                    <div className="icon-box"><Tag size={20} /></div>
                    <div>
                        <h2 className="brand-name">Bookable Items: {cleanName(currentSub?.name || "Final Tier")}</h2>
                        <p className="text-xs muted">3. End-user bookable services and pricing</p>
                    </div>
                </div>
                <button
                    onClick={() => setIsChildModalOpen(true)}
                    className="button primary"
                    disabled={!selectedSubId}
                >
                    <Plus size={18} /> New Service Item
                </button>
            </div>

            {!selectedSubId ? (
                <div className="card-ghost">
                    <Layers size={32} style={{ marginBottom: '12px' }} />
                    <p>Select a sub-specialization to manage items</p>
                </div>
            ) : (
                <div className="flex-col gap-2">
                    {childServices?.map((child) => (
                        <article key={child._id} className="card flex justify-between items-center group" style={{ padding: '16px 24px' }}>
                            <div className="flex items-center gap-4">
                                <div className="icon-box" style={{ width: '40px', height: '40px' }}>
                                    <Tag size={18} />
                                </div>
                                <div className="flex-col">
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-bold" style={{ margin: 0 }}>{cleanName(child.name)}</h4>
                                        {child.isFeatured && (
                                            <span style={{ fontSize: '0.65rem', background: '#fef9c3', color: '#854d0e', padding: '2px 8px', borderRadius: '999px', fontWeight: 700, letterSpacing: '0.05em' }}>POPULAR</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2" style={{ marginTop: '4px' }}>
                                        <span className="badge-price">₹{child.price}</span>
                                        <span className="text-xs muted font-bold">UNIT PRICE</span>
                                        {child.completed > 0 && <span className="text-xs muted">{child.completed} bookings</span>}
                                        {child.rating > 0 && <span className="text-xs" style={{ color: '#f59e0b' }}>★ {child.rating.toFixed(1)}</span>}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    title={child.isFeatured ? "Remove from Popular" : "Mark as Popular in App"}
                                    onClick={() => toggleFeaturedMutation.mutate(child._id)}
                                    disabled={toggleFeaturedMutation.isPending}
                                    style={{
                                        padding: '8px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        cursor: 'pointer',
                                        background: child.isFeatured ? '#fef9c3' : 'transparent',
                                        color: child.isFeatured ? '#f59e0b' : '#94a3b8',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <Star size={18} fill={child.isFeatured ? '#f59e0b' : 'none'} />
                                </button>
                                <button
                                    onClick={() => { if (confirm('Remove item permanently?')) deleteChildMutation.mutate(child._id); }}
                                    className="logout-btn"
                                    style={{ padding: '8px', color: '#ef4444' }}
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </article>
                    ))}
                    {childServices?.length === 0 && !loadingChildren && (
                        <div className="card-ghost">No bookable items configured.</div>
                    )}
                </div>
            )}
        </div>
    );

    return (
        <div className="flex-col gap-4">
            <header className="flex justify-between items-center" style={{ marginBottom: '24px' }}>
                <div>
                    <h1 className="brand-name" style={{ fontSize: '1.75rem' }}>Service Hierarchy</h1>
                    <p className="muted font-bold tracking-wider" style={{ fontSize: '0.75rem', textTransform: 'uppercase', marginTop: '4px' }}>
                        Global platform service catalog and pricing
                    </p>
                </div>
                <div className="card flex" style={{ padding: '4px', borderRadius: '14px', gap: '4px', background: '#f1f5f9', border: 'none' }}>
                    <button
                        onClick={() => setActiveTab("categories")}
                        className={`button ${activeTab === "categories" ? "primary" : "secondary"}`}
                        style={{ height: '36px', fontSize: '0.75rem', padding: '0 16px', borderRadius: '10px' }}
                    >
                        <LayoutGrid size={14} /> Categories
                    </button>
                    <button
                        onClick={() => setActiveTab("sub-services")}
                        className={`button ${activeTab === "sub-services" ? "primary" : "secondary"}`}
                        style={{ height: '36px', fontSize: '0.75rem', padding: '0 16px', borderRadius: '10px' }}
                    >
                        <Layers size={14} /> Sub-Services
                    </button>
                    <button
                        onClick={() => setActiveTab("child-services")}
                        className={`button ${activeTab === "child-services" ? "primary" : "secondary"}`}
                        style={{ height: '36px', fontSize: '0.75rem', padding: '0 16px', borderRadius: '10px' }}
                    >
                        <Tag size={14} /> Child Services
                    </button>
                </div>
            </header>

            <main style={{ minHeight: '500px' }}>
                {activeTab === "categories" && renderCategories()}
                {activeTab === "sub-services" && renderSubServices()}
                {activeTab === "child-services" && renderChildServices()}
            </main>

            {/* Modals with custom CSS */}
            {isCatModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div style={{ padding: '24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3 className="brand-name">Add New Category</h3>
                                <p className="text-xs muted">Define a root service node</p>
                            </div>
                            <button onClick={() => setIsCatModalOpen(false)} className="logout-btn"><X size={24} /></button>
                        </div>
                        <form style={{ padding: '24px' }} className="flex-col gap-4" onSubmit={(e) => {
                            e.preventDefault();
                            const fd = new FormData();
                            fd.append("name", catName);
                            fd.append("title", catTitle);
                            fd.append("type", catType);
                            if (catFile) fd.append("image", catFile);
                            createCatMutation.mutate(fd);
                        }}>
                            <div className="input-group">
                                <label>Internal Name</label>
                                <input value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="e.g., Doctor Consultation" required />
                            </div>
                            <div className="input-group">
                                <label>Display Title</label>
                                <input value={catTitle} onChange={(e) => setCatTitle(e.target.value)} placeholder="User facing label" required />
                            </div>
                            <div className="flex gap-4">
                                <div className="input-group" style={{ flex: 1 }}>
                                    <label>Type</label>
                                    <select value={catType} onChange={(e) => setCatType(e.target.value)}>
                                        <option value="doctor">Doctor</option>
                                        <option value="nurse">Nurse</option>
                                        <option value="lab">Lab</option>
                                        <option value="ambulance">Ambulance</option>
                                        <option value="rental">Medical Rental</option>
                                    </select>
                                </div>
                                <div className="input-group" style={{ flex: 1 }}>
                                    <label>Icon/Banner</label>
                                    <input type="file" onChange={(e) => setCatFile(e.target.files?.[0] || null)} />
                                </div>
                            </div>
                            <button disabled={createCatMutation.isPending} className="button primary full-width">
                                {createCatMutation.isPending ? "Publishing..." : "Finalize Category"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
            {/* Sub-Service Modal */}
            {isSubModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div style={{ padding: '24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3 className="brand-name">Add Sub-Service</h3>
                                <p className="text-xs muted">Tier 2 specialization for {cleanName(currentCat?.name || "Category")}</p>
                            </div>
                            <button onClick={() => setIsSubModalOpen(false)} className="logout-btn"><X size={24} /></button>
                        </div>
                        <form style={{ padding: '24px' }} className="flex-col gap-4" onSubmit={(e) => {
                            e.preventDefault();
                            const fd = new FormData();
                            fd.append("name", subName);
                            fd.append("description", subDesc || "No description provided");
                            if (subFile) fd.append("image", subFile);
                            createSubMutation.mutate(fd);
                        }}>
                            <div className="input-group">
                                <label>Specialization Name</label>
                                <input value={subName} onChange={(e) => setSubName(e.target.value)} placeholder="e.g., General Physician" required />
                            </div>
                            <div className="input-group">
                                <label>Description</label>
                                <textarea
                                    value={subDesc}
                                    onChange={(e) => setSubDesc(e.target.value)}
                                    placeholder="Brief details about this tier..."
                                    style={{ width: '100%', padding: '12px', borderRadius: '12px', background: '#f8fafc', border: 'none', minHeight: '100px' }}
                                />
                            </div>
                            <div className="input-group">
                                <label>Icon/Banner</label>
                                <input type="file" onChange={(e) => setSubFile(e.target.files?.[0] || null)} />
                            </div>
                            <button disabled={createSubMutation.isPending} className="button primary full-width">
                                {createSubMutation.isPending ? "Adding..." : "Finalize Sub-Service"}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Child-Service Modal */}
            {isChildModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '600px' }}>
                        <div style={{ padding: '24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3 className="brand-name">New Bookable Item</h3>
                                <p className="text-xs muted">Final tier pricing for {cleanName(currentSub?.name || "Sub-service")}</p>
                            </div>
                            <button onClick={() => setIsChildModalOpen(false)} className="logout-btn"><X size={24} /></button>
                        </div>
                        <form style={{ padding: '24px' }} className="flex-col gap-4" onSubmit={(e) => {
                            e.preventDefault();
                            const fd = new FormData();
                            fd.append("name", childName);
                            fd.append("description", childDesc || "Service Item");
                            fd.append("price", childPrice);
                            fd.append("bookingType", "SELECT");
                            fd.append("fulfillmentMode", fulfillmentMode);
                            if (childFile) fd.append("image", childFile);
                            createChildMutation.mutate(fd);
                        }}>
                            <div className="grid-2">
                                <div className="input-group">
                                    <label>Service Item Name</label>
                                    <input value={childName} onChange={(e) => setChildName(e.target.value)} placeholder="e.g., Home Consultation" required />
                                </div>
                                <div className="input-group">
                                    <label>Base Price (INR)</label>
                                    <input type="number" value={childPrice} onChange={(e) => setChildPrice(e.target.value)} placeholder="500" required />
                                </div>
                            </div>

                            <div className="input-group">
                                <label>Fulfillment Mode</label>
                                <select value={fulfillmentMode} onChange={(e) => setFulfillmentMode(e.target.value)}>
                                    <option value="HOME_VISIT">Home Visit</option>
                                    <option value="HOSPITAL_VISIT">Hospital Visit</option>
                                    <option value="VIRTUAL">Virtual Consultation</option>
                                </select>
                            </div>

                            <div className="input-group">
                                <label>Description</label>
                                <textarea
                                    value={childDesc}
                                    onChange={(e) => setChildDesc(e.target.value)}
                                    placeholder="Service details..."
                                    style={{ width: '100%', padding: '12px', borderRadius: '12px', background: '#f8fafc', border: 'none', minHeight: '80px' }}
                                />
                            </div>

                            <div className="input-group">
                                <label>Preview Image</label>
                                <input type="file" onChange={(e) => setChildFile(e.target.files?.[0] || null)} />
                            </div>

                            <button disabled={createChildMutation.isPending} className="button primary full-width" style={{ marginTop: '12px' }}>
                                {createChildMutation.isPending ? "Integrating Item..." : "Publish Bookable Service"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

// Add state for childDesc and fulfillmentMode in the main component
