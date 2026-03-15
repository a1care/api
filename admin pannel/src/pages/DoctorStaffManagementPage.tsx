import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useState } from "react";
import {
    Users,
    Search,
    Filter,
    Plus,
    MoreVertical,
    ChevronLeft,
    ChevronRight,
    ShieldCheck,
    Phone,
    Clock,
    CheckCircle2,
    Eye,
    XCircle,
    CheckCircle,
    FileText,
    ExternalLink,
    X,
    Loader2
} from "lucide-react";

function InfoCard({ icon, label, value, color }: { icon: any, label: string, value: string, color?: string }) {
    return (
        <div className="bg-[var(--card-bg)] p-5 rounded-[24px] border border-[var(--border-color)] shadow-sm flex-col gap-2">
            <div className="flex items-center gap-2 mb-1">
                <div style={{ color: color || '#1A7FD4' }}>{icon}</div>
                <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">{label}</p>
            </div>
            <p className="text-sm font-black text-[var(--text-main)] leading-tight">{value}</p>
        </div>
    );
}

interface Doctor {
    _id: string;
    name: string;
    mobileNumber: string;
    gender: string;
    startExperience: string;
    specialization: string[];
    status: "Pending" | "Active" | "Inactive";
    consultationFee: number;
    documents?: { type: string; url: string }[];
}

export function DoctorStaffManagementPage() {
    const queryClient = useQueryClient();
    const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);

    const { data: staff, isLoading } = useQuery({
        queryKey: ["admin_staff"],
        queryFn: async () => {
            const res = await api.get("/admin/doctors");
            return res.data.data as Doctor[];
        }
    });

    const updateStatusMutation = useMutation({
        mutationFn: async ({ id, status }: { id: string, status: string }) => {
            return api.put(`/admin/users/doctor/${id}/status`, { status, isRegistered: status === 'Active' });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin_staff"] });
            setSelectedDoctor(null);
        }
    });

    if (isLoading) return <div className="p-4 py-20 text-center text-[var(--text-muted)] font-bold">Accessing Provider Network...</div>;

    const VerificationModal = ({ doctor }: { doctor: Doctor }) => (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="bg-[var(--card-bg)] rounded-[32px] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh] border border-white/20">
                <div className="relative p-8 pb-12 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#1A7FD4] to-[#0d4a7d] opacity-[0.03]"></div>
                    <div className="absolute top-[-100px] right-[-100px] w-64 h-64 bg-blue-50 dark:bg-blue-500/10 rounded-full blur-3xl"></div>

                    <div className="relative flex justify-between items-start">
                        <div className="flex gap-6 items-center">
                            <div className="w-20 h-20 rounded-[24px] bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-2xl font-black text-white shadow-xl shadow-blue-200">
                                {(doctor.name || 'U').charAt(0)}
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-[var(--text-main)] tracking-tight">{doctor.name || "Provider"}</h2>
                                <div className="flex gap-3 mt-2 items-center">
                                    <span className="badge warning px-3 py-1 text-[10px] font-black uppercase tracking-widest border border-amber-100">
                                        Pending Verification
                                    </span>
                                    <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
                                    <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest">Partner ID: {doctor._id.slice(-6)}</p>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => setSelectedDoctor(null)}
                            className="w-10 h-10 flex items-center justify-center bg-[var(--bg-main)] hover:bg-slate-200 rounded-full transition-all hover:rotate-90"
                        >
                            <X size={20} className="text-[var(--text-muted)]" />
                        </button>
                    </div>
                </div>

                <div className="px-8 flex-1 overflow-y-auto mt-neg-24">
                    <div className="grid grid-cols-2 gap-4 mb-8">
                        <InfoCard icon={<Users size={16} />} label="GENDER PROFILE" value={doctor.gender || "Not Specified"} />
                        <InfoCard icon={<Clock size={16} />} label="PROFESSIONAL TENURE" value={doctor.startExperience ? `${new Date().getFullYear() - new Date(doctor.startExperience).getFullYear()} Years Experience` : "Experience Not Set"} />
                        <InfoCard icon={<Phone size={16} />} label="CONTACT CHANNEL" value={doctor.mobileNumber || "N/A"} />
                        <InfoCard icon={<ShieldCheck size={16} />} label="CONSULTATION VALUE" value={`₹${doctor.consultationFee}`} color="#10b981" />
                    </div>

                    <div className="flex items-center gap-3 mb-4 px-1">
                        <div className="h-px flex-1 bg-[var(--bg-main)]"></div>
                        <h3 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] flex items-center gap-2">
                            <FileText size={14} className="text-blue-500 dark:text-blue-400" /> Verification Credentials
                        </h3>
                        <div className="h-px flex-1 bg-[var(--bg-main)]"></div>
                    </div>

                    <div className="grid gap-3 mb-8">
                        {doctor.documents?.map((doc, idx) => (
                            <div key={idx} className="bg-[var(--bg-main)]-50 p-4 rounded-2xl border border-[var(--border-color)] flex items-center justify-between hover:bg-[var(--card-bg)] hover:border-blue-200 transition-all group shadow-sm hover:shadow-md">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-[var(--card-bg)] rounded-xl flex items-center justify-center text-blue-500 dark:text-blue-400 shadow-sm group-hover-bg-blue-50 dark:bg-blue-500/10 group-hover-scale-110 transition-all">
                                        <FileText size={22} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-[var(--text-main)]">{doc.type}</p>
                                        <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase mt-0.5">Asset Ref: DOC772{idx}</p>
                                    </div>
                                </div>
                                <a href={doc.url} target="_blank" className="button primary h-10 px-5 gap-2 text-xs rounded-xl shadow-lg shadow-blue-100">
                                    <Eye size={16} /> INSPECT
                                </a>
                            </div>
                        ))}
                        {(!doctor.documents || doctor.documents.length === 0) && (
                            <div className="text-center py-12 bg-[var(--bg-main)] rounded-[24px] border-2 border-dashed border-[var(--border-color)]">
                                <FileText size={40} className="mx-auto text-slate-200 mb-3" />
                                <p className="text-[var(--text-muted)] font-black text-xs uppercase tracking-widest">No matching credentials found</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-8 border-t bg-[var(--bg-main)]-30 flex gap-4">
                    <button
                        onClick={() => updateStatusMutation.mutate({ id: doctor._id, status: 'Active' })}
                        disabled={updateStatusMutation.isPending}
                        className="button primary h-14 flex-1 shadow-2xl shadow-blue-200 gap-3 text-sm font-black uppercase tracking-widest rounded-2xl"
                    >
                        {updateStatusMutation.isPending ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle size={20} />}
                        <span>Approve Provider</span>
                    </button>
                    <button
                        onClick={() => updateStatusMutation.mutate({ id: doctor._id, status: 'Inactive' })}
                        disabled={updateStatusMutation.isPending}
                        className="button secondary h-14 flex-1 border-none bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400 hover:bg-red-100 gap-3 text-sm font-black uppercase tracking-widest rounded-2xl transition-all"
                    >
                        <XCircle size={20} />
                        <span>Reject</span>
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="flex-col gap-4">
            {selectedDoctor && <VerificationModal doctor={selectedDoctor} />}

            <header className="flex justify-between items-center" style={{ marginBottom: '24px' }}>
                <div>
                    <h1 className="brand-name" style={{ fontSize: '1.75rem' }}>Service Providers</h1>
                    <p className="text-xs muted font-bold uppercase tracking-wider mt-1">Review credentials and verify partner network</p>
                </div>
                <div className="flex gap-2">
                    <button className="button secondary shadow-sm px-4">
                        <Clock size={18} />
                        <span>Pending ({staff?.filter(s => s.status === 'Pending').length || 0})</span>
                    </button>
                    <button className="button primary shadow-lg">
                        <Plus size={18} />
                        <span>Add New</span>
                    </button>
                </div>
            </header>

            <div className="card p-0 overflow-hidden shadow-xl shadow-slate-200/50" style={{ border: 'none' }}>
                <div className="p-4 border-b flex justify-between items-center bg-[var(--card-bg)]">
                    <div className="relative" style={{ width: '320px' }}>
                        <Search className="absolute text-[var(--text-muted)]" size={16} style={{ left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                        <input
                            placeholder="Search providers..."
                            className="w-full bg-[var(--bg-main)] border-none px-4 text-sm"
                            style={{ paddingLeft: '40px', height: '44px', borderRadius: '12px' }}
                        />
                    </div>
                    <button className="button secondary h-10 px-4 text-xs font-bold gap-2 hover:bg-[var(--bg-main)]">
                        <Filter size={16} />
                        <span>Advanced Filters</span>
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="management-table">
                        <thead>
                            <tr>
                                <th style={{ paddingLeft: '24px' }}>PROVIDER</th>
                                <th>SPECIALIZATION</th>
                                <th>EXP</th>
                                <th>FEE</th>
                                <th>STATUS</th>
                                <th className="text-center">CREDENTIALS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {staff?.map((doc) => (
                                <tr key={doc._id} className="hover:bg-[var(--bg-main)] transition-colors">
                                    <td style={{ paddingLeft: '24px' }}>
                                        <div className="font-bold text-[var(--text-main)]" style={{ fontSize: '0.9rem' }}>{doc.name || "Unnamed Partner"}</div>
                                        <div className="text-xs muted flex items-center gap-1 mt-1 font-semibold underline decoration-blue-200"><Phone size={10} /> {doc.mobileNumber}</div>
                                    </td>
                                    <td>
                                        <div className="flex flex-wrap gap-1">
                                            {doc.specialization?.slice(0, 2).map(s => <span key={s} className="badge secondary text-[10px] font-black uppercase tracking-tighter">{s}</span>)}
                                            {doc.specialization?.length > 2 && <span className="badge secondary text-[10px] font-bold">+{doc.specialization.length - 2}</span>}
                                        </div>
                                    </td>
                                    <td className="font-bold text-[var(--text-muted)] text-xs">
                                        {doc.startExperience
                                            ? `${new Date().getFullYear() - new Date(doc.startExperience).getFullYear()}Y`
                                            : "5Y+"}
                                    </td>
                                    <td className="font-black text-[var(--text-main)] text-sm">₹{doc.consultationFee}</td>
                                    <td>
                                        <span className={`badge ${doc.status === 'Active' ? 'success' : doc.status === 'Pending' ? 'warning' : 'danger'} text-[10px] font-black uppercase tracking-widest`}>
                                            {doc.status}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="justify-center flex">
                                            <button
                                                onClick={() => setSelectedDoctor(doc)}
                                                className={`button ${doc.status === 'Pending' ? 'primary' : 'secondary'} h-9 px-4 text-[10px] font-black uppercase tracking-wider`}
                                            >
                                                {doc.status === 'Pending' ? 'Review Docs' : 'View Profile'}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function TextLabel({ label, value }: { label: string, value: string }) {
    return (
        <div className="mb-2 last:mb-0">
            <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-0.5">{label}</p>
            <p className="text-sm font-bold text-[var(--text-main)]">{value}</p>
        </div>
    );
}

function ChevronDownIcon(props: any) {
    return (
        <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
    )
}
