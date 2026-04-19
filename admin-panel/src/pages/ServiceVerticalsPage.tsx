import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
    Stethoscope, 
    Syringe, 
    Ambulance, 
    Truck, 
    FlaskConical, 
    LayoutGrid, 
    ArrowRight,
    Settings2,
    ShieldCheck,
    Plus,
    X
} from "lucide-react";

import { toast } from "sonner";

const DEFAULT_VERTICALS = [
    { 
        id: "doctor", 
        title: "Medical Professionals", 
        description: "Specialized doctors, surgeons, and general practitioners.",
        icon: Stethoscope,
        color: "blue",
        count: "Active Portfolio"
    },
    { 
        id: "nurse", 
        title: "Nursing & Care", 
        description: "Assisted living, home nursing, and critical care staff.",
        icon: Syringe,
        color: "indigo",
        count: "Partner Network"
    },
    { 
        id: "lab", 
        title: "Diagnostic Labs", 
        description: "Sample collection, pathology, and radiology centers.",
        icon: FlaskConical,
        color: "emerald",
        count: "Registry Enabled"
    },
    { 
        id: "ambulance", 
        title: "Emergency Fleet", 
        description: "Ground ambulances, ICU transport, and rescue services.",
        icon: Ambulance,
        color: "rose",
        count: "Vehicle Logistics"
    },
    { 
        id: "rental", 
        title: "Medical Equipment", 
        description: "Wheelchairs, oxygen concentrators, and hospital beds.",
        icon: Truck,
        color: "amber",
        count: "Asset Inventory"
    },
    { 
        id: "service", 
        title: "Extra Services", 
        description: "Physiotherapy, Yoga, Home Care, and Wellness.",
        icon: LayoutGrid,
        color: "purple",
        count: "Specialized Core"
    }
];

export function ServiceVerticalsPage() {
    const navigate = useNavigate();
    const [verticals, setVerticals] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // New Vertical State
    const [title, setTitle] = useState("");
    const [desc, setDesc] = useState("");
    const [color, setColor] = useState("blue");

    useEffect(() => {
        const saved = localStorage.getItem("a1care_custom_verticals");
        if (saved) {
            const parsed = JSON.parse(saved);
            // Re-map icon components because they were lost during JSON serialization
            const customWithIcons = parsed.map((item: any) => ({
                ...item,
                icon: LayoutGrid // Using LayoutGrid as a safe default for custom verticals
            }));
            setVerticals([...DEFAULT_VERTICALS, ...customWithIcons]);
        } else {
            setVerticals(DEFAULT_VERTICALS);
        }
    }, []);

    const handleAddVertical = (e: React.FormEvent) => {
        e.preventDefault();
        const newV = {
            id: title.toLowerCase().replace(/\s+/g, "_"),
            title,
            description: desc,
            color,
            count: "Custom Domain"
            // icon: LayoutGrid is handled by the loading/mapping logic
        };
        
        const customOnly = verticals.filter(v => !DEFAULT_VERTICALS.find(d => d.id === v.id));
        const updatedCustom = [...customOnly, newV];
        localStorage.setItem("a1care_custom_verticals", JSON.stringify(updatedCustom));
        setVerticals([...DEFAULT_VERTICALS, ...updatedCustom]);
        
        setIsModalOpen(false);
        setTitle(""); setDesc("");
        toast.success(`Dynamic vertical "${title}" initialized.`);
    };

    return (
        <div className="space-y-8 animate-in text-left items-start relative">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-[var(--card-bg)] p-8 rounded-3xl border border-[var(--border-color)] shadow-sm text-left items-start">
                <div className="space-y-2 text-left items-start">
                    <h1 className="text-3xl font-black tracking-tight text-[var(--text-main)]">Operational Core Verticals</h1>
                    <p className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-[0.2em] opacity-60">Architectural Service Definitions</p>
                </div>
                <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-500/10 px-6 py-3 rounded-2xl border border-blue-100 dark:border-blue-500/20">
                    <ShieldCheck className="text-blue-600" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-700 dark:text-blue-400">System Verified Framework</span>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {verticals.map(vertical => {
                    const IconComponent = vertical.icon || LayoutGrid;
                    const colorClass = vertical.color;
                    
                    return (
                        <div 
                            key={vertical.id}
                            onClick={() => navigate(`/service-categories?type=${vertical.id}`)}
                            className="group relative bg-[var(--card-bg)] p-8 rounded-[32px] border border-[var(--border-color)] hover:border-blue-500/50 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-500 cursor-pointer overflow-hidden flex flex-col h-full text-left items-start"
                        >
                            <div className={`absolute top-0 right-0 w-32 h-32 bg-${colorClass}-500/5 dark:bg-${colorClass}-500/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700`} />
                            
                            <div className={`w-16 h-16 rounded-2xl bg-${colorClass}-50 dark:bg-${colorClass}-500/10 flex items-center justify-center text-${colorClass}-600 mb-6 group-hover:rotate-6 transition-transform`}>
                                <IconComponent size={32} />
                            </div>

                            <div className="space-y-3 flex-1 text-left items-start">
                                <span className={`text-[10px] font-black uppercase tracking-widest text-${colorClass}-600/80`}>{vertical.count}</span>
                                <h3 className="text-xl font-black text-[var(--text-main)]">{vertical.title}</h3>
                                <p className="text-xs font-bold leading-relaxed text-[var(--text-muted)] line-clamp-2">{vertical.description}</p>
                            </div>

                            <div className="mt-8 flex items-center justify-between w-full pt-6 border-t border-[var(--border-color)] group-hover:border-blue-500/20">
                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">Manage Portfolio</span>
                                <div className="w-10 h-10 rounded-xl bg-[var(--bg-main)] flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all">
                                    <ArrowRight size={18} />
                                </div>
                            </div>
                        </div>
                    );
                })}

                <div 
                    onClick={() => setIsModalOpen(true)}
                    className="bg-[var(--bg-main)]/50 border-2 border-dashed border-[var(--border-color)] p-8 rounded-[32px] flex flex-col items-center justify-center text-center gap-4 opacity-70 hover:opacity-100 transition-all cursor-pointer group"
                >
                    <div className="w-16 h-16 rounded-full bg-[var(--card-bg)] flex items-center justify-center text-[var(--text-muted)] shadow-inner">
                        <Plus size={32} className="group-hover:rotate-90 transition-transform" />
                    </div>
                    <div className="space-y-1">
                        <h4 className="text-xs font-black uppercase tracking-widest text-[var(--text-main)]">Add Custom Vertical</h4>
                        <p className="text-[10px] font-bold text-[var(--text-muted)] max-w-[180px]">Extend the architectural framework with new service tiers.</p>
                    </div>
                </div>
            </div>

            {/* Addition Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden border border-white/20">
                        <div className="p-10 space-y-8">
                            <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">New Service Pillar</h2>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">Definition Protocol 01-A</p>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:rotate-90 transition-all">
                                    <X size={20} />
                                </button>
                            </div>

                            <form className="space-y-6" onSubmit={handleAddVertical}>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Vertical Identity</label>
                                    <input 
                                        className="w-full h-14 bg-slate-50 dark:bg-slate-800/50 border-none rounded-2xl px-6 text-slate-900 dark:text-white font-bold placeholder:text-slate-400 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-inner" 
                                        placeholder="e.g. Wellness & Yoga"
                                        value={title}
                                        onChange={e => setTitle(e.target.value)}
                                        required 
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Pillar Mission Statment</label>
                                    <textarea 
                                        className="w-full h-24 bg-slate-50 dark:bg-slate-800/50 border-none rounded-2xl px-6 py-4 text-slate-900 dark:text-white font-bold placeholder:text-slate-400 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-inner resize-none" 
                                        placeholder="Briefly describe the operational scope of this new vertical..."
                                        value={desc}
                                        onChange={e => setDesc(e.target.value)}
                                        required 
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Branding Palette</label>
                                    <div className="flex gap-3 px-2">
                                        {['blue', 'indigo', 'emerald', 'rose', 'amber', 'purple'].map(c => (
                                            <button 
                                                key={c}
                                                type="button"
                                                onClick={() => setColor(c)}
                                                className={`w-8 h-8 rounded-full bg-${c}-500 shadow-lg transition-all ${color === c ? 'scale-125 ring-4 ring-white shadow-xl' : 'opacity-40 hover:opacity-100'}`}
                                            />
                                        ))}
                                    </div>
                                </div>

                                <div className="pt-4 flex gap-4">
                                    <button type="button" className="flex-1 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 font-black uppercase text-[11px] tracking-widest active:scale-95 transition-all" onClick={() => setIsModalOpen(false)}>Abort</button>
                                    <button type="submit" className="flex-1 h-14 rounded-2xl bg-blue-600 text-white font-black uppercase text-[11px] tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all">Initialize Pillar</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-amber-50 dark:bg-amber-500/5 p-8 rounded-[32px] border border-amber-100 dark:border-amber-500/10 flex items-center gap-6 text-left items-start">
                <div className="w-14 h-14 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/20">
                    <Settings2 size={28} />
                </div>
                <div>
                    <h3 className="text-sm font-black text-amber-900 dark:text-amber-400 uppercase tracking-widest">Architectural Guidance</h3>
                    <p className="text-xs font-bold text-amber-700/60 dark:text-amber-500/50 mt-1 leading-relaxed">Selecting a vertical will navigate to the category builder pre-filtered for that specific operational domain. All specialized services added within a vertical will inherit registry protocols for that type.</p>
                </div>
            </div>
        </div>
    );
}
