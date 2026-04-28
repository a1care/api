import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
    Plus,
    Trash2,
    ChevronRight,
    LayoutGrid,
    X,
    Settings2,
    Search,
    Image,
    UploadCloud,
    CheckCircle2,
    Edit2,
    Stethoscope,
    Syringe,
    FlaskConical,
    Ambulance
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate, useSearchParams } from "react-router-dom";

interface Category {
    _id: string;
    name: string;
    title: string;
    type?: string;
    imageUrl?: string;
}

export function ServiceCategoriesPage() {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const filterType = searchParams.get("type");
    const [searchTerm, setSearchTerm] = useState("");

    const [availableTypes, setAvailableTypes] = useState<{ id: string, title: string }[]>([
        { id: "doctor", title: "Doctor" },
        { id: "nurse", title: "Nurse" },
        { id: "lab", title: "Lab" },
        { id: "ambulance", title: "Ambulance" },
        { id: "rental", title: "Rental" },
        { id: "service", title: "Service" }
    ]);

    useEffect(() => {
        const saved = localStorage.getItem("a1care_custom_verticals");
        if (saved) {
            const parsed = JSON.parse(saved);
            const customMapped = parsed.map((p: any) => ({ id: p.id, title: p.title }));
            setAvailableTypes(prev => {
                const existingIds = prev.map(p => p.id);
                const filtered = customMapped.filter((m: any) => !existingIds.includes(m.id));
                return [...prev, ...filtered];
            });
        }
    }, []);

    // Modal States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [name, setName] = useState("");
    const [title, setTitle] = useState("");
    const [type, setType] = useState(filterType || "doctor");
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);

    useEffect(() => {
        if (!file) {
            setPreviewUrl(null);
            return;
        }
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [file]);

    const { data: categories, isLoading } = useQuery({
        queryKey: ["admin_categories"],
        queryFn: async () => {
            const res = await api.get("/services");
            return res.data.data as Category[];
        }
    });

    const createMutation = useMutation({
        mutationFn: async (formData: FormData) => {
            const res = await api.post("/services/create", formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin_categories"] });
            setIsModalOpen(false);
            resetForm();
            toast.success("Category published");
        },
        onError: (err: any) => {
            toast.error(err?.response?.data?.message || "Failed to publish category");
        }
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, formData }: { id: string, formData: FormData }) => {
            const res = await api.put(`/services/${id}`, formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin_categories"] });
            setIsModalOpen(false);
            resetForm();
            toast.success("Category updated");
        },
        onError: (err: any) => {
            toast.error(err?.response?.data?.message || "Failed to update category");
        }
    });

    const resetForm = () => {
        setName("");
        setTitle("");
        setType(filterType || "doctor");
        setFile(null);
        setEditingCategory(null);
    };

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`/services/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin_categories"] });
            setDeleteId(null);
            toast.success("Category archived");
        }
    });

    const filteredCategories = (categories || []).filter(c => {
        const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = !filterType || c.type === filterType;
        return matchesSearch && matchesType;
    });

    const cleanName = (name: string) => name.replace(/SELECT|ASSIGN/g, "").trim();

    const getCategoryIcon = (category: Category) => {
        const name = category.name.toLowerCase();
        const type = category.type?.toLowerCase() || "";

        if (name.includes('doctor') || type.includes('doctor')) return Stethoscope;
        if (name.includes('nurse') || name.includes('care') || type.includes('nurse')) return Syringe;
        if (name.includes('lab') || name.includes('diagnost') || type.includes('lab')) return FlaskConical;
        if (name.includes('ambul') || name.includes('emergen') || type.includes('ambulance')) return Ambulance;
        return LayoutGrid;
    };

    return (
        <div className="space-y-8 animate-in text-left items-start">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-[var(--card-bg)] p-8 rounded-3xl border border-[var(--border-color)] shadow-sm text-left items-start">
                <div className="space-y-2 text-left items-start">
                    <h1 className="text-3xl font-black tracking-tight text-[var(--text-main)]">
                        {filterType ? `${filterType.charAt(0).toUpperCase() + filterType.slice(1)} Portfolio` : "Master Service Categories"}
                    </h1>
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                        <p className="text-sm font-medium text-[var(--text-muted)] tracking-wide uppercase">Core Catalog Architecture</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    <div className="relative group min-w-[300px]">
                        {/* <Search size={18} className="absolute text-[var(--text-muted)] group-focus-within:text-blue-500 transition-colors" style={{ left: '20px', top: '50%', transform: 'translateY(-50%)' }} /> */}
                        <input
                            type="text"
                            placeholder="Search portfolios..."
                            className="w-full h-12 pl-12 pr-4 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 text-sm font-bold"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    {filterType && (
                        <button
                            onClick={() => setSearchParams({})}
                            className="h-12 px-6 rounded-xl bg-slate-100 dark:bg-slate-800 text-[var(--text-muted)] font-black text-[10px] uppercase hover:bg-slate-200"
                        >
                            Clear Filter
                        </button>
                    )}
                    <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="h-12 px-8 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all active:scale-95 font-black text-xs uppercase tracking-widest">
                        <Plus size={20} />
                        <span>Add Category</span>
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredCategories.map((c) => {
                    const CategoryIcon = getCategoryIcon(c);
                    return (
                        <article
                            key={c._id}
                            className="group bg-[var(--card-bg)] border border-[var(--border-color)] rounded-[32px] p-6 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-500 cursor-pointer overflow-hidden relative flex flex-col text-left items-start"
                            onClick={() => navigate(`/service-subcategories?category=${c.name}`)}
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingCategory(c);
                                        setName(c.name);
                                        setTitle(c.title);
                                        setType(c.type || "doctor");
                                        setIsModalOpen(true);
                                    }}
                                    className="w-10 h-10 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center hover:bg-blue-500 hover:text-white transition-all"
                                >
                                    <Edit2 size={18} />
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setDeleteId(c._id);
                                    }}
                                    className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>

                            <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 mb-6 group-hover:scale-110 transition-transform overflow-hidden">
                                {c.imageUrl ? (
                                    <img src={c.imageUrl} alt={c.title} className="w-full h-full object-cover" />
                                ) : (
                                    <CategoryIcon size={28} />
                                )}
                            </div>

                            <div className="space-y-1 mb-8 flex-1 text-left items-start">
                                <span className="text-[10px] font-black uppercase tracking-widest text-blue-600/60 mb-1 block">{c.type || "General Service"}</span>
                                <h3 className="text-lg font-black text-[var(--text-main)] group-hover:text-blue-600 transition-colors uppercase tracking-tight">{cleanName(c.name)}</h3>
                            </div>

                            <div className="pt-6 border-t border-[var(--border-color)] w-full flex items-center justify-between">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Manage Registry</span>
                                <ChevronRight size={18} className="text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                            </div>
                        </article>
                    )
                })}
            </div>

            {isLoading && <div className="p-20 text-center muted font-bold animate-pulse">Synchronizing sector data...</div>}

            {/* Create Modal */}
            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '500px' }}>
                        <div className="p-8 border-b flex justify-between items-center">
                            <div>
                                <h2 className="brand-name">{editingCategory ? "Edit Category" : "Create New Category"}</h2>
                                <p className="text-xs muted font-bold uppercase tracking-widest mt-1">{editingCategory ? "Update Service Classification" : "Define New Service Classification"}</p>
                            </div>
                            <button onClick={() => { setIsModalOpen(false); setEditingCategory(null); }} className="logout-btn"><X size={24} /></button>
                        </div>
                        <form className="p-8 flex-col gap-5" onSubmit={(e) => {
                            e.preventDefault();
                            const fd = new FormData();
                            fd.append("name", name);
                            fd.append("title", title);
                            fd.append("type", type);
                            if (file) fd.append("image", file);

                            if (editingCategory) {
                                updateMutation.mutate({ id: editingCategory._id, formData: fd });
                            } else {
                                createMutation.mutate(fd);
                            }
                        }}>
                            <div className="input-group">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block ml-1">System Reference (Database ID)</label>
                                <input className="w-full h-14 bg-slate-50 border-none px-5 rounded-2xl font-bold placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. medical_consult" required />
                            </div>
                            <div className="input-group">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block ml-1">Category Name (Public Display)</label>
                                <input className="w-full h-14 bg-slate-50 border-none px-5 rounded-2xl font-bold placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Consult a Doctor" required />
                            </div>
                            <div className="grid-2">
                                <div className="input-group">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block ml-1">Category Type</label>
                                    <select className="w-full h-14 bg-slate-50 border-none px-5 rounded-2xl font-bold" value={type} onChange={(e) => setType(e.target.value)}>
                                        {availableTypes.map(t => (
                                            <option key={t.id} value={t.id}>{t.title}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="input-group">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block ml-1">Visual Asset</label>
                                    <label className={`flex items-center gap-3 w-full h-14 px-5 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${file ? "bg-blue-50 border-blue-200" : "bg-slate-50 border-slate-100 hover:border-blue-200"}`}>
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden bg-slate-100 ${file || (editingCategory && editingCategory.imageUrl) ? "" : "text-slate-500"}`}>
                                            {previewUrl ? (
                                                <img src={previewUrl} className="w-full h-full object-cover" />
                                            ) : editingCategory?.imageUrl ? (
                                                <img src={editingCategory.imageUrl} className="w-full h-full object-cover" />
                                            ) : (
                                                <UploadCloud size={20} />
                                            )}
                                        </div>
                                        <div className="flex-1 overflow-hidden">
                                            <p className={`text-xs font-bold truncate ${file ? "text-blue-700" : "text-slate-400"}`}>
                                                {file ? file.name : "Select category icon..."}
                                            </p>
                                        </div>
                                        <input type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                                    </label>
                                </div>
                            </div>
                            <div className="pt-4 flex gap-4">
                                <button type="button" className="flex-1 h-14 rounded-2xl bg-white border border-slate-100 text-slate-400 font-black uppercase text-[10px]" onClick={() => setIsModalOpen(false)}>Abort</button>
                                <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="flex-1 h-14 rounded-2xl bg-blue-600 text-white font-black uppercase text-[10px] shadow-lg shadow-blue-100">
                                    {createMutation.isPending || updateMutation.isPending ? "Processing..." : (editingCategory ? "Update Category" : "Finalize Category")}
                                </button>
                            </div>
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
                        <h3 className="brand-name text-2xl">Archive Category?</h3>
                        <p className="muted font-medium mt-2">All sub-services and catalog items within this category will be inaccessible. This action is terminal.</p>
                        <div className="flex gap-4 mt-10">
                            <button className="button secondary flex-1 h-14 rounded-2xl font-black uppercase text-[10px]" onClick={() => setDeleteId(null)}>Cancel</button>
                            <button className="button primary flex-1 h-14 rounded-2xl font-black uppercase text-[10px] !bg-red-500" onClick={() => deleteMutation.mutate(deleteId)}>Archive Category</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
