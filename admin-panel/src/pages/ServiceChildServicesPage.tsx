import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
    Plus,
    Trash2,
    Tag,
    X,
    Search,
    ChevronLeft,
    Star,
    LayoutGrid,
    CheckCircle2,
    Image,
    UploadCloud
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate, useSearchParams } from "react-router-dom";

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
    description?: string;
    imageUrl?: string;
}

interface SubService {
    _id: string;
    name: string;
    serviceId: string;
}

export function ServiceChildServicesPage() {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const initialSubId = searchParams.get("subServiceId") || "";
    const categoryId = searchParams.get("categoryId") || "";

    const [selectedSubId, setSelectedSubId] = useState(initialSubId);
    const [searchTerm, setSearchTerm] = useState("");

    // Modal States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [name, setName] = useState("");
    const [price, setPrice] = useState("");
    const [desc, setDesc] = useState("");
    const [fulfillment, setFulfillment] = useState("HOME_VISIT");
    const [file, setFile] = useState<File | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const { data: categories } = useQuery({
        queryKey: ["admin_categories"],
        queryFn: async () => {
            const res = await api.get("/services");
            return res.data.data as any[];
        }
    });

    const [activeCatId, setActiveCatId] = useState(categoryId || "");

    const { data: subServices } = useQuery({
        queryKey: ["admin_subservices", activeCatId],
        queryFn: async () => {
            if (!activeCatId) return [];
            const res = await api.get(`/subservice/${activeCatId}`);
            return res.data.data as SubService[];
        },
        enabled: !!activeCatId
    });

    const { data: childServices, isLoading } = useQuery({
        queryKey: ["admin_childservices", selectedSubId],
        queryFn: async () => {
            if (!selectedSubId) return [];
            const res = await api.get(`/childService/${selectedSubId}`);
            return res.data.data as ChildService[];
        },
        enabled: !!selectedSubId
    });

    const createMutation = useMutation({
        mutationFn: async (formData: FormData) => {
            if (!selectedSubId || !activeCatId) throw new Error("Hierarchy context missing");
            const res = await api.post(`/childService/create/${activeCatId}/${selectedSubId}`, formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin_childservices", selectedSubId] });
            setIsModalOpen(false);
            setName(""); setPrice(""); setDesc(""); setFile(null);
            toast.success("Catalog item live");
        },
        onError: (err: any) => {
            toast.error(err?.response?.data?.message || "Creation failed");
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`/childService/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin_childservices", selectedSubId] });
            setDeleteId(null);
            toast.success("Item removed from catalog");
        }
    });

    const toggleFeaturedMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await api.patch(`/childService/featured/toggle/${id}`);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin_childservices", selectedSubId] });
            toast.success("Recognition status updated");
        }
    });

    const filtered = childServices?.filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const cleanName = (name: string) => name.replace(/SELECT|ASSIGN/g, "").trim();

    return (
        <div className="flex-col gap-6">
            <header className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-all">
                        <ChevronLeft size={20} />
                    </button>
                    <div>
                        <h1 className="brand-name" style={{ fontSize: '2rem' }}>Catalog Items</h1>
                        <p className="muted font-bold tracking-wider uppercase text-[10px] mt-1">Bookable medical services & pricing</p>
                    </div>
                </div>
                <button 
                    disabled={!selectedSubId}
                    onClick={() => setIsModalOpen(true)} 
                    className="button primary h-12 px-6 rounded-2xl gap-2 shadow-lg shadow-emerald-100"
                >
                    <Plus size={18} /> New Catalog Item
                </button>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <aside className="lg:col-span-1 flex-col gap-4">
                    <div className="card p-6 border-none shadow-sm" style={{ borderRadius: '24px' }}>
                        <div className="flex items-center gap-2 mb-4">
                            <LayoutGrid size={14} className="text-blue-600" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sector</span>
                        </div>
                        <select 
                            className="w-full bg-slate-50 border-none rounded-xl px-3 py-2 text-xs font-bold mb-6 outline-none"
                            value={activeCatId}
                            onChange={(e) => setActiveCatId(e.target.value)}
                        >
                            <option value="">Select Sector...</option>
                            {categories?.map(cat => (
                                <option key={cat._id} value={cat._id}>{cat.name.replace(/SELECT|ASSIGN/g, "")}</option>
                            ))}
                        </select>

                        <div className="flex items-center gap-2 mb-4">
                            <Tag size={14} className="text-emerald-600" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sub-Category</span>
                        </div>
                        <div className="flex-col gap-1 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            {!activeCatId && <p className="text-[10px] text-slate-400 italic">Select a sector first</p>}
                            {subServices?.map(sub => (
                                <button
                                    key={sub._id}
                                    onClick={() => setSelectedSubId(sub._id)}
                                    className={`w-full text-left px-4 py-3 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all ${selectedSubId === sub._id ? "bg-emerald-600 text-white shadow-lg" : "hover:bg-slate-50 text-slate-600"}`}
                                >
                                    {sub.name.replace(/SELECT|ASSIGN/g, "")}
                                </button>
                            ))}
                            {activeCatId && subServices?.length === 0 && <p className="text-[10px] text-slate-400 italic">No sub-categories found</p>}
                        </div>
                    </div>
                </aside>

                <main className="lg:col-span-3 flex-col gap-6">
                    {!selectedSubId ? (
                        <div className="p-20 text-center card bg-white/50 backdrop-blur-md" style={{ borderRadius: '32px' }}>
                            <Tag size={48} className="mx-auto mb-4 opacity-10" />
                            <p className="font-bold text-slate-400">Select a sub-category from the registry to manage its bookable items</p>
                        </div>
                    ) : (
                        <div className="flex-col gap-6">
                            <div className="card p-4 flex items-center gap-4 bg-white/50 backdrop-blur-md shadow-sm" style={{ borderRadius: '24px' }}>
                                <div className="relative flex-1 group">
                                    <Search className="absolute text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} style={{ left: '20px', top: '50%', transform: 'translateY(-50%)' }} />
                                    <input 
                                        placeholder="Search catalog items..."
                                        className="w-full bg-[var(--bg-main)] border-none font-semibold text-slate-700"
                                        style={{ paddingLeft: '60px', height: '56px', borderRadius: '16px' }}
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="flex-col gap-3">
                                {filtered?.map((child) => (
                                    <article key={child._id} className="card flex justify-between items-center group hover:border-blue-200 transition-all" style={{ padding: '20px 32px', borderRadius: '24px' }}>
                                        <div className="flex items-center gap-6">
                                            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shadow-sm overflow-hidden">
                                                {child.imageUrl ? (
                                                    <img src={child.imageUrl} alt={child.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <Tag size={24} />
                                                )}
                                            </div>
                                            <div className="flex-col gap-1">
                                                <div className="flex items-center gap-3">
                                                    <h4 className="font-black text-slate-800 text-lg m-0">{cleanName(child.name)}</h4>
                                                    {child.isFeatured && (
                                                        <span className="px-3 py-1 rounded-lg bg-amber-50 text-amber-600 text-[9px] font-black uppercase tracking-widest border border-amber-100 flex items-center gap-1">
                                                            <Star size={10} fill="currentColor" /> Popular Choice
                                                        </span>
                                                    )}
                                                </div>
                                                {child.description && (
                                                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-1 max-w-sm">
                                                        {child.description}
                                                    </p>
                                                )}
                                                <div className="flex items-center gap-4 mt-2">
                                                    <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 rounded-lg text-slate-600 font-black text-xs">
                                                        ₹{child.price}
                                                    </div>
                                                    <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                        <CheckCircle2 size={12} className="text-emerald-500" /> {child.completed || 0} Successful Cycles
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-3">
                                            <button
                                                title={child.isFeatured ? "Remove from Popular" : "Promote to Popular"}
                                                onClick={() => toggleFeaturedMutation.mutate(child._id)}
                                                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${child.isFeatured ? "bg-amber-100 text-amber-600" : "bg-slate-50 text-slate-400 hover:bg-amber-50"}`}
                                            >
                                                <Star size={18} fill={child.isFeatured ? "currentColor" : "none"} />
                                            </button>
                                            <button
                                                onClick={() => setDeleteId(child._id)}
                                                className="w-10 h-10 rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </article>
                                ))}
                                {filtered?.length === 0 && !isLoading && (
                                    <div className="p-20 text-center opacity-30 font-bold">No catalog items defined for this unit.</div>
                                )}
                            </div>
                        </div>
                    )}
                </main>
            </div>

            {isLoading && <div className="p-20 text-center font-bold animate-pulse">Syncing catalog registry...</div>}

            {/* Create Modal */}
            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '600px' }}>
                        <div className="p-8 border-b flex justify-between items-center">
                            <div>
                                <h2 className="brand-name">Publish Item</h2>
                                <p className="text-xs muted font-bold uppercase tracking-widest mt-1">Final Tier Catalog Entry</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="logout-btn"><X size={24} /></button>
                        </div>
                        <form className="p-8 flex-col gap-5" onSubmit={(e) => {
                            e.preventDefault();
                            const fd = new FormData();
                            fd.append("name", name);
                            fd.append("price", price);
                            fd.append("description", desc || "Item details");
                            fd.append("fulfillmentMode", fulfillment);
                            fd.append("selectionType", "SELECT");
                            if (file) fd.append("image", file);
                            createMutation.mutate(fd);
                        }}>
                            <div className="grid-2">
                                <div className="input-group">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block ml-1">Service Label</label>
                                    <input className="w-full h-14 bg-slate-50 border-none px-5 rounded-2xl font-bold placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Blood Sample Collection" required />
                                </div>
                                <div className="input-group">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block ml-1">Base Cost (INR)</label>
                                    <input type="number" className="w-full h-14 bg-slate-50 border-none px-5 rounded-2xl font-bold placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" required />
                                </div>
                            </div>
                            <div className="input-group">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block ml-1">Fulfillment Vector</label>
                                <select className="w-full h-14 bg-slate-50 border-none px-5 rounded-2xl font-bold" value={fulfillment} onChange={(e) => setFulfillment(e.target.value)}>
                                    <option value="HOME_VISIT">Home Visit</option>
                                    <option value="HOSPITAL_VISIT">Medical Center Visit</option>
                                    <option value="VIRTUAL">Virtual Consultation</option>
                                </select>
                            </div>
                            <div className="input-group">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block ml-1">Protocol Description</label>
                                <textarea 
                                    className="w-full bg-slate-50 border-none px-5 py-4 rounded-2xl font-bold min-h-[80px] placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all" 
                                    value={desc} 
                                    onChange={(e) => setDesc(e.target.value)} 
                                    placeholder="Outline the service scope..." 
                                />
                            </div>
                            <div className="input-group">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block ml-1">Catalog Image</label>
                                <label className={`flex items-center gap-3 w-full h-14 px-5 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${file ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-100 hover:border-emerald-200"}`}>
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${file ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-500"}`}>
                                        {file ? <CheckCircle2 size={16} /> : <UploadCloud size={16} />}
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                        <p className={`text-xs font-bold truncate ${file ? "text-emerald-700" : "text-slate-400"}`}>
                                            {file ? file.name : "Select catalog image..."}
                                        </p>
                                    </div>
                                    <input type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                                </label>
                            </div>
                            <button disabled={createMutation.isPending} className="button primary h-14 w-full rounded-2xl mt-4 font-black uppercase tracking-widest text-xs shadow-lg shadow-emerald-100">
                                {createMutation.isPending ? "Integrating..." : "Publish Bookable Service"}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {deleteId && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '420px', textAlign: 'center', padding: '40px' }}>
                        <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Trash2 size={32} />
                        </div>
                        <h3 className="brand-name text-2xl">Wipe Catalog Item?</h3>
                        <p className="muted font-medium mt-2">This bookable entity will be permanently removed from all user application interfaces.</p>
                        <div className="flex gap-4 mt-10">
                            <button className="button secondary flex-1 h-14 rounded-2xl font-black uppercase text-[10px]" onClick={() => setDeleteId(null)}>Cancel</button>
                            <button className="button primary flex-1 h-14 rounded-2xl font-black uppercase text-[10px] !bg-red-500" onClick={() => deleteMutation.mutate(deleteId)}>Purge Item</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
