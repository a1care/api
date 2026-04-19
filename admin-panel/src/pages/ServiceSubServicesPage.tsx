import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
    Plus,
    Trash2,
    ChevronRight,
    Layers,
    X,
    Search,
    ChevronLeft,
    Filter,
    Image,
    UploadCloud,
    CheckCircle2
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate, useSearchParams } from "react-router-dom";

interface SubService {
    _id: string;
    name: string;
    serviceId: string;
    description?: string;
    imageUrl?: string;
}

interface Category {
    _id: string;
    name: string;
}

export function ServiceSubServicesPage() {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const initialCatId = searchParams.get("categoryId") || "";

    const [selectedCatId, setSelectedCatId] = useState(initialCatId);
    const [searchTerm, setSearchTerm] = useState("");

    // Modal States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [name, setName] = useState("");
    const [desc, setDesc] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const { data: categories } = useQuery({
        queryKey: ["admin_categories"],
        queryFn: async () => {
            const res = await api.get("/services");
            return res.data.data as Category[];
        }
    });

    const { data: subServices, isLoading } = useQuery({
        queryKey: ["admin_subservices", selectedCatId],
        queryFn: async () => {
            if (!selectedCatId) return [];
            const res = await api.get(`/subservice/${selectedCatId}`);
            return res.data.data as SubService[];
        },
        enabled: !!selectedCatId
    });

    const createMutation = useMutation({
        mutationFn: async (formData: FormData) => {
            if (!selectedCatId) throw new Error("Category Required");
            const res = await api.post(`/subservice/create/${selectedCatId}`, formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin_subservices", selectedCatId] });
            setIsModalOpen(false);
            setName(""); setDesc(""); setFile(null);
            toast.success("Sub-service integrated");
        },
        onError: (err: any) => {
            toast.error(err?.response?.data?.message || "Integration failed");
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`/subservice/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin_subservices", selectedCatId] });
            setDeleteId(null);
            toast.success("Node archived");
        }
    });

    const filtered = subServices?.filter(s => 
        s.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const cleanName = (name: string) => name.replace(/SELECT|ASSIGN/g, "").trim();
    const currentCategory = categories?.find(c => c._id === selectedCatId);

    return (
        <div className="flex-col gap-6">
            <header className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-all">
                        <ChevronLeft size={20} />
                    </button>
                    <div>
                        <h1 className="brand-name" style={{ fontSize: '2rem' }}>Sub-Categories</h1>
                        <p className="muted font-bold tracking-wider uppercase text-[10px] mt-1">Tier 2 specialized medical units</p>
                    </div>
                </div>
                <button 
                    disabled={!selectedCatId}
                    onClick={() => setIsModalOpen(true)} 
                    className="button primary h-12 px-6 rounded-2xl gap-2 shadow-lg shadow-indigo-100 disabled:opacity-50"
                >
                    <Plus size={18} /> New Sub-Category
                </button>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <aside className="lg:col-span-1 flex-col gap-4">
                    <div className="card p-6 border-none shadow-sm" style={{ borderRadius: '24px' }}>
                        <div className="flex items-center gap-2 mb-6">
                            <Filter size={14} className="text-blue-600" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Category Selection</span>
                        </div>
                        <div className="flex-col gap-2">
                            {categories?.map(cat => (
                                <button
                                    key={cat._id}
                                    onClick={() => setSelectedCatId(cat._id)}
                                    className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all ${selectedCatId === cat._id ? "bg-blue-600 text-white shadow-lg" : "hover:bg-slate-50 text-slate-600"}`}
                                >
                                    {cleanName(cat.name)}
                                </button>
                            ))}
                        </div>
                    </div>
                </aside>

                <main className="lg:col-span-3 flex-col gap-6">
                    <div className="card p-4 flex items-center gap-4 bg-white/50 backdrop-blur-md shadow-sm" style={{ borderRadius: '24px' }}>
                        <div className="relative flex-1 group">
                            <Search className="absolute text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} style={{ left: '20px', top: '50%', transform: 'translateY(-50%)' }} />
                            <input 
                                placeholder="Search sub-categories..."
                                className="w-full bg-[var(--bg-main)] border-none font-semibold text-slate-700"
                                style={{ paddingLeft: '60px', height: '56px', borderRadius: '16px' }}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    {!selectedCatId ? (
                        <div className="p-20 text-center card-ghost">
                            <Layers size={48} className="mx-auto mb-4 opacity-20" />
                            <p className="font-bold text-slate-400">Select a primary category to view its organizational units</p>
                        </div>
                    ) : (
                        <div className="grid-2">
                            {filtered?.map((sub) => (
                                <article
                                    key={sub._id}
                                    className="card flex-col gap-4 group cursor-pointer hover:scale-[1.01] transition-all border-none shadow-sm"
                                    onClick={() => navigate(`/service-child-services?subServiceId=${sub._id}&categoryId=${selectedCatId}`)}
                                    style={{ borderRadius: '28px', padding: '24px' }}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="icon-box overflow-hidden" style={{ width: '52px', height: '52px', borderRadius: '18px', background: '#f5f3ff', color: '#7c3aed' }}>
                                            {sub.imageUrl ? (
                                                <img src={sub.imageUrl} alt={sub.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <Layers size={22} />
                                            )}
                                        </div>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setDeleteId(sub._id); }}
                                            className="logout-btn opacity-0 group-hover:opacity-100 transition-opacity"
                                            style={{ padding: '8px' }}
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                    <div className="flex-col gap-2">
                                        <h3 className="font-black text-slate-800 text-lg">{cleanName(sub.name)}</h3>
                                        {sub.description && (
                                            <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                                                {sub.description}
                                            </p>
                                        )}
                                        <p className="text-[9px] text-blue-600 font-black uppercase tracking-[0.2em] mt-1">Tier 2 Specialization</p>
                                    </div>
                                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-50">
                                        <span className="text-xs font-bold text-blue-600">Explore Catalog</span>
                                        <ChevronRight size={18} className="text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1" />
                                    </div>
                                </article>
                            ))}
                            {filtered?.length === 0 && !isLoading && (
                                <div className="col-span-2 text-center py-20 opacity-50 font-bold">No units found in this category.</div>
                            )}
                        </div>
                    )}
                </main>
            </div>

            {isLoading && <div className="p-20 text-center font-bold animate-pulse">Accessing unit registry...</div>}

            {/* Create Modal */}
            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '500px' }}>
                        <div className="p-8 border-b flex justify-between items-center">
                            <div>
                                <h2 className="brand-name">New Unit</h2>
                                <p className="text-xs muted font-bold uppercase tracking-widest mt-1">Expanding {cleanName(currentCategory?.name || "")}</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="logout-btn"><X size={24} /></button>
                        </div>
                        <form className="p-8 flex-col gap-5" onSubmit={(e) => {
                            e.preventDefault();
                            const fd = new FormData();
                            fd.append("name", name);
                            fd.append("description", desc || "Unit description");
                            if (file) fd.append("image", file);
                            createMutation.mutate(fd);
                        }}>
                            <div className="input-group">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block ml-1">Specialization Name</label>
                                <input className="w-full h-14 bg-slate-50 border-none px-5 rounded-2xl font-bold placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., General Medicine" required />
                            </div>
                            <div className="input-group">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block ml-1">Detailed Brief</label>
                                <textarea 
                                    className="w-full bg-slate-50 border-none px-5 py-4 rounded-2xl font-bold min-h-[100px] placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all" 
                                    value={desc} 
                                    onChange={(e) => setDesc(e.target.value)} 
                                    placeholder="Describe the clinical focus..." 
                                />
                            </div>
                            <div className="input-group">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block ml-1">Identity Visual (Icon)</label>
                                <label className={`flex items-center gap-3 w-full h-14 px-5 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${file ? "bg-indigo-50 border-indigo-200" : "bg-slate-50 border-slate-100 hover:border-indigo-200"}`}>
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${file ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-500"}`}>
                                        {file ? <CheckCircle2 size={16} /> : <UploadCloud size={16} />}
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                        <p className={`text-xs font-bold truncate ${file ? "text-indigo-700" : "text-slate-400"}`}>
                                            {file ? file.name : "Select unit icon..."}
                                        </p>
                                    </div>
                                    <input type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} required />
                                </label>
                            </div>
                            <button disabled={createMutation.isPending} className="button primary h-14 w-full rounded-2xl mt-4 font-black uppercase tracking-widest text-xs">
                                {createMutation.isPending ? "Integrating..." : "Finalize Unit Integration"}
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
                        <h3 className="brand-name text-2xl">Remove Node?</h3>
                        <p className="muted font-medium mt-2">All children items under this node will be disconnected from the active catalog. This action is final.</p>
                        <div className="flex gap-4 mt-10">
                            <button className="button secondary flex-1 h-14 rounded-2xl font-black uppercase text-[10px]" onClick={() => setDeleteId(null)}>Abort</button>
                            <button className="button primary flex-1 h-14 rounded-2xl font-black uppercase text-[10px] !bg-red-500" onClick={() => deleteMutation.mutate(deleteId)}>Final Archive</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
