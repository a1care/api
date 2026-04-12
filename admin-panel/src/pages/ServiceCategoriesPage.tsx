import { useState } from "react";
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
    CheckCircle2
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface Category {
    _id: string;
    name: string;
    type?: string;
}

export function ServiceCategoriesPage() {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState("");

    // Modal States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [name, setName] = useState("");
    const [title, setTitle] = useState("");
    const [type, setType] = useState("doctor");
    const [file, setFile] = useState<File | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);

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
            setName(""); setTitle(""); setFile(null);
            toast.success("Category published");
        },
        onError: (err: any) => {
            toast.error(err?.response?.data?.message || "Failed to publish category");
        }
    });

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

    const filtered = categories?.filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        c.type?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const cleanName = (name: string) => name.replace(/SELECT|ASSIGN/g, "").trim();

    return (
        <div className="flex-col gap-6">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="brand-name" style={{ fontSize: '2rem' }}>Root Categories</h1>
                    <p className="muted font-bold tracking-wider uppercase text-[10px] mt-1">Primary specialized medical sectors</p>
                </div>
                <button onClick={() => setIsModalOpen(true)} className="button primary h-12 px-6 rounded-2xl gap-2 shadow-lg shadow-blue-100">
                    <Plus size={18} /> New Category
                </button>
            </header>

            <div className="card p-4 flex items-center gap-4 bg-white/50 backdrop-blur-md shadow-sm" style={{ borderRadius: '24px' }}>
                <div className="relative flex-1 group">
                    <Search className="absolute text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} style={{ left: '20px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input 
                        placeholder="Search categories..."
                        className="w-full bg-[var(--bg-main)] border-none font-semibold text-slate-700"
                        style={{ paddingLeft: '60px', height: '56px', borderRadius: '16px' }}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="px-4 py-2 bg-blue-50 rounded-xl text-blue-600 text-xs font-black uppercase tracking-widest">
                    {filtered?.length} Sectors
                </div>
            </div>

            <div className="grid-4">
                {filtered?.map((cat) => (
                    <article
                        key={cat._id}
                        className="card flex-col gap-4 group cursor-pointer hover:scale-[1.02] transition-all border-none shadow-sm hover:shadow-xl"
                        onClick={() => navigate(`/service-subcategories?categoryId=${cat._id}`)}
                        style={{ borderRadius: '28px', padding: '24px' }}
                    >
                        <div className="flex justify-between items-start">
                            <div className="icon-box" style={{ width: '52px', height: '52px', borderRadius: '18px', background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', color: '#1d4ed8' }}>
                                <LayoutGrid size={24} />
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); setDeleteId(cat._id); }}
                                className="logout-btn opacity-0 group-hover:opacity-100 transition-opacity"
                                style={{ padding: '8px' }}
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                        <div>
                            <h3 className="font-black text-slate-800 text-lg">{cleanName(cat.name)}</h3>
                            <p className="text-[10px] text-blue-600 font-black uppercase tracking-[0.2em] mt-1">{cat.type || "Service"}</p>
                        </div>
                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-dashed border-slate-100">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Manage Registry</span>
                            <ChevronRight size={18} className="text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                        </div>
                    </article>
                ))}
            </div>

            {isLoading && <div className="p-20 text-center muted font-bold animate-pulse">Synchronizing sector data...</div>}

            {/* Create Modal */}
            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '500px' }}>
                        <div className="p-8 border-b flex justify-between items-center">
                            <div>
                                <h2 className="brand-name">New Sector</h2>
                                <p className="text-xs muted font-bold uppercase tracking-widest mt-1">Category Initialization</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="logout-btn"><X size={24} /></button>
                        </div>
                        <form className="p-8 flex-col gap-5" onSubmit={(e) => {
                            e.preventDefault();
                            const fd = new FormData();
                            fd.append("name", name);
                            fd.append("title", title);
                            fd.append("type", type);
                            if (file) fd.append("image", file);
                            createMutation.mutate(fd);
                        }}>
                            <div className="input-group">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block ml-1">Internal Unique Identifier</label>
                                <input className="w-full h-14 bg-slate-50 border-none px-5 rounded-2xl font-bold placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Doctor_Consultation" required />
                            </div>
                            <div className="input-group">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block ml-1">Public Display Label</label>
                                <input className="w-full h-14 bg-slate-50 border-none px-5 rounded-2xl font-bold placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Consult a Doctor" required />
                            </div>
                            <div className="grid-2">
                                <div className="input-group">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block ml-1">Sector Type</label>
                                    <select className="w-full h-14 bg-slate-50 border-none px-5 rounded-2xl font-bold" value={type} onChange={(e) => setType(e.target.value)}>
                                        <option value="doctor">Doctor</option>
                                        <option value="nurse">Nurse</option>
                                        <option value="lab">Lab</option>
                                        <option value="ambulance">Ambulance</option>
                                        <option value="rental">Rental</option>
                                    </select>
                                </div>
                                <div className="input-group">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block ml-1">Visual Asset</label>
                                    <label className={`flex items-center gap-3 w-full h-14 px-5 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${file ? "bg-blue-50 border-blue-200" : "bg-slate-50 border-slate-100 hover:border-blue-200"}`}>
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${file ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-500"}`}>
                                            {file ? <CheckCircle2 size={16} /> : <UploadCloud size={16} />}
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
                            <button disabled={createMutation.isPending} className="button primary h-14 w-full rounded-2xl mt-4 font-black uppercase tracking-widest text-xs">
                                {createMutation.isPending ? "Publishing..." : "Initialize Sector"}
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
                        <h3 className="brand-name text-2xl">Archive Sector?</h3>
                        <p className="muted font-medium mt-2">All sub-services and catalog items within this category will be inaccessible. This action is terminal.</p>
                        <div className="flex gap-4 mt-10">
                            <button className="button secondary flex-1 h-14 rounded-2xl font-black uppercase text-[10px]" onClick={() => setDeleteId(null)}>Cancel</button>
                            <button className="button primary flex-1 h-14 rounded-2xl font-black uppercase text-[10px] !bg-red-500" onClick={() => deleteMutation.mutate(deleteId)}>Archive Node</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
