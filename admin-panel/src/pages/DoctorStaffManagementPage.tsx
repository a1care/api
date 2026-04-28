import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
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
    CheckCircle,
    FileText,
    ExternalLink,
    X,
    Loader2,
    UserPlus,
    Eye,
    XCircle,
    CreditCard as WalletIcon,
    ArrowUpCircle,
    ArrowDownCircle, CalendarClock
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
    const [searchParams] = useSearchParams();
    const initialSearch = searchParams.get("search") || "";
    
    const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
    const [searchQuery, setSearchQuery] = useState(initialSearch);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [slotDoctor, setSlotDoctor] = useState<Doctor | null>(null);
    const [weekDays, setWeekDays] = useState<number[]>([1,2,3,4,5,6]);
    const [startingTime, setStartingTime] = useState("09:00");
    const [endingTime, setEndingTime] = useState("18:00");
    const [slotDuration, setSlotDuration] = useState("30");

    // Add Provider Form
    const [newName, setNewName] = useState("");
    const [newMobile, setNewMobile] = useState("");
    const [newEmail, setNewEmail] = useState("");

    useEffect(() => {
        if (initialSearch) {
            setSearchQuery(initialSearch);
        }
    }, [initialSearch]);

    const normalizeDoctorsPayload = (payload: any) => {
        if (Array.isArray(payload)) {
            return {
                items: payload,
                total: payload.length,
                totalPages: 1,
                page: 1,
            };
        }
        return payload || { items: [], total: 0, totalPages: 1, page: 1 };
    };

    const { data: staffData, isLoading } = useQuery({
        queryKey: ["admin_staff", page, searchQuery],
        queryFn: async () => {
            const res = await api.get(`/admin/doctors?page=${page}&limit=50&search=${searchQuery}`);
            return normalizeDoctorsPayload(res.data.data);
        }
    });

    const staff = staffData?.items || [];
    useEffect(() => {
        if (staffData?.totalPages) setTotalPages(staffData.totalPages);
    }, [staffData]);

    // Backend-driven search now
    const filteredStaff = staff;

    useEffect(() => {
        setPage(1);
    }, [searchQuery]);

    const updateStatusMutation = useMutation({
        mutationFn: async ({ id, status }: { id: string, status: string }) => {
            return api.put(`/admin/users/doctor/${id}/status`, { status, isRegistered: status === 'Active' });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin_staff"] });
            setSelectedDoctor(null);
            toast.success("Provider status synchronized.");
        }
    });

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await api.post(`/admin/users/doctor/create`, data);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin_staff"] });
            setIsAddModalOpen(false);
            setNewName("");
            setNewMobile("");
            setNewEmail("");
            toast.success("New provider signature created.");
        },
        onError: (err: any) => {
            toast.error(err?.response?.data?.message || "Failed to create provider.");
        }
    });

    const handleAddProvider = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName || !newMobile) return toast.error("Required fields missing.");
        createMutation.mutate({ name: newName, mobileNumber: newMobile, email: newEmail });
    };
    const availabilityMutation = useMutation({
        mutationFn: async () => {
            if (!slotDoctor?._id) throw new Error("Doctor is required");
            const res = await api.post(`/admin/doctors/${slotDoctor._id}/availability`, {
                weekDays,
                startingTime,
                endingTime,
                slotDuration,
            });
            return res.data?.data;
        },
        onSuccess: () => {
            toast.success("Doctor slots saved successfully.");
            setSlotDoctor(null);
        },
        onError: (err: any) => {
            toast.error(err?.response?.data?.message || "Failed to save slots.");
        }
    });

    const openSlotModal = async (doctor: Doctor) => {
        setSlotDoctor(doctor);
        setWeekDays([1, 2, 3, 4, 5, 6]);
        setStartingTime("09:00");
        setEndingTime("18:00");
        setSlotDuration("30");
        try {
            const res = await api.get(`/admin/doctors/${doctor._id}/availability`);
            const existing = res?.data?.data;
            if (existing) {
                if (Array.isArray(existing.weekDays)) setWeekDays(existing.weekDays);
                if (existing.startingTime) setStartingTime(existing.startingTime);
                if (existing.endingTime) setEndingTime(existing.endingTime);
                if (existing.slotDuration) setSlotDuration(String(existing.slotDuration));
            }
        } catch {
            // keep defaults
        }
    };

    const toggleWeekDay = (day: number) => {
        setWeekDays((prev) => prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b));
    };

    // Removed early return to prevent blinking
    // if (isLoading) return (
    //     <div className="p-4 py-20 text-center flex-col items-center gap-4">
    //         <Loader2 className="animate-spin mx-auto text-blue-600 mb-4" size={48} />
    //         <p className="text-[var(--text-muted)] font-black uppercase tracking-[0.2em] text-sm">Accessing Provider Network...</p>
    //     </div>
    // );

    const VerificationModal = ({ doctor }: { doctor: Doctor }) => (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="bg-[var(--card-bg)] rounded-[32px] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh] border border-white/20">
                <div className="relative p-8 pb-12 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#1A7FD4] to-[#0d4a7d] opacity-[0.03]"></div>
                    <div className="absolute top-[-100px] right-[-100px] w-64 h-64 bg-blue-50 dark:bg-blue-500/10 rounded-full blur-3xl"></div>

                    <div className="relative flex justify-between items-start">
                        <div className="flex gap-6 items-center">
                            <div className="w-20 h-20 rounded-[28px] bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-3xl font-black text-white shadow-xl shadow-blue-200">
                                {(doctor.name || 'U').charAt(0)}
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-[var(--text-main)] tracking-tight">{doctor.name || "Provider"}</h2>
                                <div className="flex gap-3 mt-2 items-center">
                                    <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg border ${
                                        doctor.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                                        doctor.status === 'Pending' ? 'bg-amber-50 text-amber-600 border-amber-100' : 
                                        'bg-rose-50 text-rose-600 border-rose-100'
                                    }`}>
                                        {doctor.status === 'Active' ? 'Verified Member' : 
                                         doctor.status === 'Pending' ? 'Pending Verification' : 
                                         'Inactive / Restricted'}
                                    </span>
                                    <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
                                    <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest">Partner ID: {doctor._id.slice(-6).toUpperCase()}</p>
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
                        <InfoCard icon={<ShieldCheck size={16} />} label="CONSULTATION VALUE" value={`₹${doctor.consultationFee || 0}`} color="#10b981" />
                    </div>

                    <div className="mb-10">
                        <DoctorWalletSection doctor={doctor} />
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
                    {doctor.status !== 'Active' ? (
                        <button
                            onClick={() => updateStatusMutation.mutate({ id: doctor._id, status: 'Active' })}
                            disabled={updateStatusMutation.isPending}
                            className="button primary h-14 flex-1 shadow-2xl shadow-blue-200 gap-3 text-sm font-black uppercase tracking-widest rounded-2xl"
                        >
                            {updateStatusMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                            <span>Approve Provider</span>
                        </button>
                    ) : (
                        <button
                            onClick={() => updateStatusMutation.mutate({ id: doctor._id, status: 'Inactive' })}
                            disabled={updateStatusMutation.isPending}
                            className="button secondary h-14 flex-1 border-none bg-rose-50 text-rose-600 hover:bg-rose-100 gap-3 text-sm font-black uppercase tracking-widest rounded-2xl transition-all"
                        >
                            <XCircle size={18} />
                            <span>Restrict Access</span>
                        </button>
                    )}
                    
                    {doctor.status === 'Pending' && (
                        <button
                            onClick={() => updateStatusMutation.mutate({ id: doctor._id, status: 'Inactive' })}
                            disabled={updateStatusMutation.isPending}
                            className="button secondary h-14 flex-1 border-none bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400 hover:bg-red-100 gap-3 text-sm font-black uppercase tracking-widest rounded-2xl transition-all"
                        >
                            <XCircle size={18} />
                            <span>Reject</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <div className="flex-col gap-4">
            {selectedDoctor && <VerificationModal doctor={selectedDoctor} />}

            <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-[var(--card-bg)] p-6 md:p-8 rounded-2xl shadow-sm border border-[var(--border-color)] relative overflow-hidden text-left" style={{ marginBottom: '24px' }}>
                <div className="relative z-10 text-left items-start">
                    <h1 className="text-2xl md:text-3xl font-black tracking-tight text-[var(--text-main)] mb-1">Doctor Registry</h1>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        <p className="text-xs md:text-sm font-medium text-[var(--text-muted)] tracking-wide">Home • User Directory • Doctors</p>
                    </div>
                </div>
                <div className="relative z-10 flex gap-2">
                    <button className="button secondary shadow-sm px-4 h-11 rounded-xl text-[10px] font-black uppercase tracking-widest gap-2" onClick={() => toast.info("Displaying recent provider audit telemetry.")}>
                        <Clock size={16} />
                        <span>Recent Logs</span>
                    </button>
                    <button className="button primary shadow-lg h-11 rounded-xl px-6 text-[10px] font-black uppercase tracking-widest gap-2" onClick={() => setIsAddModalOpen(true)}>
                        <Plus size={16} />
                        <span>Add Doctor</span>
                    </button>
                </div>
                <div className="absolute -bottom-24 -right-12 w-64 h-64 bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -top-12 right-32 w-48 h-48 bg-purple-500/5 dark:bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />
            </header>

            <div className="card p-0 overflow-hidden shadow-xl shadow-slate-200/50" style={{ border: 'none', borderRadius: '24px' }}>
                <div className="p-6 border-b flex flex-col md:flex-row justify-between items-center bg-[var(--card-bg)] gap-4">
                    <div className="relative flex-1 group">
                        <Search className="absolute text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} style={{ left: '20px', top: '50%', transform: 'translateY(-50%)' }} />
                        <input
                            placeholder="Search doctor registry by name, mobile or city..."
                            className="w-full bg-[var(--bg-main)] border-none font-semibold text-slate-700"
                            style={{ paddingLeft: '60px', height: '56px', borderRadius: '16px' }}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-3 w-full md:w-auto">
                        <button className="button secondary h-11 flex-1 md:flex-none px-5 text-[10px] font-black uppercase tracking-widest gap-2 hover:bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl" onClick={() => toast.info("Parametric filtering active.")}>
                            <Filter size={16} />
                            <span>Filters</span>
                        </button>
                        <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-500/10 rounded-xl">
                            <Users size={14} className="text-blue-600" />
                            <span className="text-xs font-black text-blue-600">{staffData?.total || 0} Network Slots</span>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="management-table">
                        <thead>
                            <tr className="bg-slate-50/50 dark:bg-white/5">
                                <th style={{ paddingLeft: '32px', height: '60px' }}>SL NO</th>
                                <th>PROVIDER IDENTITY</th>
                                <th>SPECIALIZATION</th>
                                <th>TENURE</th>
                                <th>BASE FEE</th>
                                <th>STATUS</th>
                                <th className="text-center">ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody>
                             {isLoading ? (
                                <tr>
                                    <td colSpan={7} className="p-20 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Synchronizing Grid...</p>
                                        </div>
                                    </td>
                                </tr>
                             ) : Array.isArray(filteredStaff) && filteredStaff.length > 0 ? (
                                filteredStaff.map((doc, index) => (
                                <tr key={doc._id} className="hover:bg-slate-50/80 dark:hover:bg-blue-500/5 transition-all border-b border-[var(--border-color)]">
                                    <td className="p-4 pl-10 font-black text-slate-400 text-[10px]">
                                        {((page - 1) * 50 + index + 1).toString().padStart(2, '0')}
                                    </td>
                                    <td style={{ paddingBlock: '20px' }}>
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 font-black shadow-sm text-xs">
                                                {doc.name?.charAt(0) || "P"}
                                            </div>
                                            <div>
                                                <div className="font-bold text-[var(--text-main)]" style={{ fontSize: '0.9rem' }}>{doc.name || "Unnamed Partner"}</div>
                                                <div className="text-[9px] muted flex items-center gap-1.5 mt-1 font-black uppercase tracking-widest leading-none"><Phone size={10} className="text-blue-500/60" /> {doc.mobileNumber}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="flex flex-wrap gap-1.5">
                                            {doc.specialization?.slice(0, 2).map((s: string) => <span key={s} className="px-2 py-1 rounded-lg bg-[var(--bg-main)] text-[var(--text-muted)] text-[9px] font-black uppercase tracking-wider border border-[var(--border-color)]">{s}</span>)}
                                            {doc.specialization?.length > 2 && <span className="px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 text-[9px] font-black">+{doc.specialization.length - 2}</span>}
                                        </div>
                                    </td>
                                    <td>
                                        <div className="flex flex-col">
                                            <span className="font-black text-[var(--text-main)] text-xs tracking-tighter">
                                                {doc.startExperience
                                                    ? `${new Date().getFullYear() - new Date(doc.startExperience).getFullYear()}y Clinical`
                                                    : "5y+ Master"}
                                            </span>
                                            <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase mt-0.5">Exp Registry</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="flex items-center gap-1.5 font-black text-[var(--text-main)] text-sm">
                                            <span className="text-xs text-[var(--text-muted)] mt-0.5">₹</span>
                                            {doc.consultationFee}
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest
                                            ${doc.status === 'Active' ? 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10' : 
                                              doc.status === 'Pending' ? 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-500/10' : 
                                              'text-rose-600 bg-rose-50 dark:text-rose-400 dark:bg-rose-500/10'}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${doc.status === 'Active' ? 'bg-emerald-500' : doc.status === 'Pending' ? 'bg-amber-500' : 'bg-rose-500'}`}></span>
                                            {doc.status}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="justify-center flex">
                                            <button
                                                onClick={() => setSelectedDoctor(doc)}
                                                className={`h-9 px-5 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all shadow-sm
                                                    ${doc.status === 'Pending' ? 'bg-blue-600 text-white hover:bg-blue-700 hover:scale-105' : 'bg-[var(--bg-main)] text-[var(--text-muted)] hover:text-[var(--text-main)] shadow-none'}
                                                `}
                                            >
                                                {doc.status === 'Pending' ? 'Review Application' : 'Open Profile'}
                                            </button><button onClick={() => openSlotModal(doc)} className="h-9 ml-2 px-4 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] bg-blue-50 text-blue-700 hover:bg-blue-100"><CalendarClock size={14} className="inline mr-1" />Manage Slots</button></div></td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={7} className="py-24 text-center">
                                        <div className="w-16 h-16 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-[var(--border-color)]">
                                            <Search size={28} className="text-slate-300" />
                                        </div>
                                        <p className="font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest text-sm">Registry Trace Miss</p>
                                        <p className="text-xs text-slate-400 font-bold mt-1">No providers matching "{searchQuery}" in current sector.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="p-8 border-t border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-main)]/30 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                    <div className="flex items-center gap-4">
                        <span className="bg-[var(--card-bg)] px-4 py-2 rounded-xl border border-[var(--border-color)]">Page: <span className="text-[var(--text-main)] ml-2">{page} / {totalPages}</span></span>
                        <span className="bg-[var(--card-bg)] px-4 py-2 rounded-xl border border-[var(--border-color)]">Total Entries: <span className="text-[var(--text-main)] ml-2">{staffData?.total || 0}</span></span>
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="w-10 h-10 rounded-xl bg-[var(--card-bg)] border border-[var(--border-color)] flex items-center justify-center text-[var(--text-muted)] hover:text-blue-600 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <button 
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="w-10 h-10 rounded-xl bg-[var(--card-bg)] border border-[var(--border-color)] flex items-center justify-center text-[var(--text-muted)] hover:text-blue-600 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </div>
            </div>
            {/* Add Provider Modal */}
                        {slotDoctor && (
                <div className="fixed inset-0 z-[160] flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-md" onClick={() => setSlotDoctor(null)}>
                    <div className="bg-[var(--card-bg)] border border-[var(--border-color)] w-full max-w-lg p-8 rounded-[28px] shadow-3xl" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-black text-[var(--text-main)] mb-1">Manage Slots</h3>
                        <p className="text-xs text-[var(--text-muted)] mb-5">{slotDoctor.name}</p>
                        <div className="mb-4">
                            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Working Days</p>
                            <div className="flex flex-wrap gap-2">
                                {[0,1,2,3,4,5,6].map((d) => (
                                    <button key={d} type="button" onClick={() => toggleWeekDay(d)} className={`px-3 py-2 rounded-lg text-xs font-black ${weekDays.includes(d) ? 'bg-blue-600 text-white' : 'bg-[var(--bg-main)] text-[var(--text-muted)]'}`}>
                                        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d]}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 mb-3">
                            <input type="time" value={startingTime} onChange={e => setStartingTime(e.target.value)} className="w-full h-11 px-3 rounded-xl bg-[var(--bg-main)]" />
                            <input type="time" value={endingTime} onChange={e => setEndingTime(e.target.value)} className="w-full h-11 px-3 rounded-xl bg-[var(--bg-main)]" />
                        </div>
                        <input type="number" min="5" step="5" value={slotDuration} onChange={e => setSlotDuration(e.target.value)} placeholder="Slot duration (minutes)" className="w-full h-11 px-3 rounded-xl bg-[var(--bg-main)] mb-5" />
                        <div className="flex gap-3">
                            <button type="button" onClick={() => setSlotDoctor(null)} className="flex-1 h-11 rounded-xl bg-[var(--bg-main)] font-black text-xs">Cancel</button>
                            <button type="button" onClick={() => availabilityMutation.mutate()} disabled={availabilityMutation.isPending} className="flex-1 h-11 rounded-xl bg-blue-600 text-white font-black text-xs">{availabilityMutation.isPending ? 'Saving...' : 'Save Slots'}</button>
                        </div>
                    </div>
                </div>
            )}{isAddModalOpen && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-md" onClick={() => setIsAddModalOpen(false)}>
                    <div className="bg-[var(--card-bg)] border border-[var(--border-color)] w-full max-w-lg p-10 rounded-[40px] shadow-3xl flex flex-col items-center gap-8" onClick={e => e.stopPropagation()}>
                        <div className="w-20 h-20 rounded-3xl bg-blue-500/10 flex items-center justify-center text-blue-600">
                            <UserPlus size={40} />
                        </div>
                        <div className="text-center space-y-2">
                            <h2 className="text-[var(--text-main)] text-2xl font-black tracking-tight">Register New Provider</h2>
                            <p className="text-[var(--text-muted)] text-sm font-medium uppercase tracking-widest opacity-60">Initializing Medical Registry Protocol</p>
                        </div>
                        <form className="w-full space-y-5" onSubmit={handleAddProvider}>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-2">Full Legal Identity</label>
                                <input 
                                    className="w-full h-14 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-[20px] px-6 text-[var(--text-main)] font-black placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all" 
                                    value={newName} 
                                    onChange={e => setNewName(e.target.value)} 
                                    placeholder="e.g. Dr. Sarah Jenkins"
                                    required 
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-2">Primary Phone Network</label>
                                <input 
                                    className="w-full h-14 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-[20px] px-6 text-[var(--text-main)] font-black placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all" 
                                    value={newMobile} 
                                    onChange={e => setNewMobile(e.target.value)} 
                                    placeholder="e.g. +91 98765 43210"
                                    required 
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-2">Digital Communication (Mail)</label>
                                <input 
                                    className="w-full h-14 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-[20px] px-6 text-[var(--text-main)] font-black placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all" 
                                    value={newEmail} 
                                    onChange={e => setNewEmail(e.target.value)} 
                                    placeholder="sarah.j@a1care.com"
                                />
                            </div>
                            <div className="pt-4 flex gap-4">
                                <button type="button" className="flex-1 h-14 rounded-[20px] bg-[var(--bg-main)] text-[var(--text-muted)] font-black uppercase text-[10px]" onClick={() => setIsAddModalOpen(false)}>Abort</button>
                                <button type="submit" disabled={createMutation.isPending} className="flex-1 h-14 rounded-[20px] bg-blue-600 text-white font-black uppercase text-[10px]">
                                    {createMutation.isPending ? "Syncing..." : "Finalize Protocol"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
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

function DoctorWalletSection({ doctor }: { doctor: Doctor }) {
    const queryClient = useQueryClient();
    const [amount, setAmount] = useState("");
    const [description, setDescription] = useState("");
    const [isAdjusting, setIsAdjusting] = useState(false);

    const { data: wallet, isLoading } = useQuery({
        queryKey: ["user_wallet", doctor._id],
        queryFn: async () => {
            try {
                const res = await api.get(`/admin/users/doctor/${doctor._id}/wallet-balance`);
                return res.data.data;
            } catch (err: any) {
                // If wallet doesn't exist yet, create one with zero balance so UI always has data
                if (err?.response?.status === 404) {
                    await api.post(`/admin/users/doctor/${doctor._id}/wallet-adjust`, {
                        amount: 0,
                        description: "Auto-create wallet",
                        type: "Credit"
                    });
                    const res = await api.get(`/admin/users/doctor/${doctor._id}/wallet-balance`);
                    return res.data.data;
                }
                throw err;
            }
        }
    });

    const adjustMutation = useMutation({
        mutationFn: async (type: 'Credit' | 'Debit') => {
            const res = await api.post(`/admin/users/doctor/${doctor._id}/wallet-adjust`, {
                amount: parseFloat(amount),
                description,
                type
            });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["user_wallet", doctor._id] });
            toast.success("Wallet balanced updated.");
            setAmount("");
            setDescription("");
            setIsAdjusting(false);
        },
        onError: (err: any) => {
            toast.error(err?.response?.data?.message || "Adjustment failed.");
        }
    });

    return (
        <section className="space-y-6">
            <div className="flex items-center gap-3 mb-4 px-1">
                <div className="h-px flex-1 bg-[var(--bg-main)]"></div>
                <h3 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] flex items-center gap-2">
                    <WalletIcon size={14} className="text-emerald-500" /> Financial Protocol
                </h3>
                <div className="h-px flex-1 bg-[var(--bg-main)]"></div>
            </div>

            <div className="bg-slate-950 p-8 rounded-[40px] border border-white/5 flex flex-col md:flex-row justify-between items-center gap-8 shadow-2xl overflow-hidden relative group">
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                    <WalletIcon size={100} className="text-emerald-500" />
                </div>
                <div className="relative z-10">
                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Current Balance</p>
                    <h4 className="text-5xl font-black text-white leading-none">
                        {isLoading ? "---" : `₹${wallet?.balance || 0}`}
                    </h4>
                </div>
                
                {!isAdjusting ? (
                    <button 
                        onClick={() => setIsAdjusting(true)} 
                        className="h-14 px-10 rounded-2xl bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all hover:bg-emerald-700"
                    >
                        Execute Delta Adjust
                    </button>
                ) : (
                    <div className="w-full md:w-[340px] space-y-3 p-5 bg-white/5 rounded-3xl border border-white/10 animate-in zoom-in-95 backdrop-blur-xl">
                        <input 
                            type="number" 
                            placeholder="Amount in ₹" 
                            value={amount} 
                            onChange={e => setAmount(e.target.value)} 
                            className="w-full bg-white border-none h-12 px-5 rounded-2xl text-slate-950 font-black placeholder:text-slate-400 outline-none" 
                        />
                        <input 
                            placeholder="Reason (e.g., Promotion)" 
                            value={description} 
                            onChange={e => setDescription(e.target.value)} 
                            className="w-full bg-white border-none h-12 px-5 rounded-2xl text-slate-950 font-bold placeholder:text-slate-400 outline-none" 
                        />
                        <div className="flex gap-2">
                            <button 
                                onClick={() => adjustMutation.mutate('Credit')} 
                                className="flex-1 h-11 rounded-xl bg-emerald-600 text-white text-[10px] font-black uppercase flex items-center justify-center gap-2" 
                                disabled={adjustMutation.isPending}
                            >
                                <ArrowUpCircle size={14} /> Credit
                            </button>
                            <button 
                                onClick={() => adjustMutation.mutate('Debit')} 
                                className="flex-1 h-11 rounded-xl bg-rose-600 text-white text-[10px] font-black uppercase flex items-center justify-center gap-2" 
                                disabled={adjustMutation.isPending}
                            >
                                <ArrowDownCircle size={14} /> Debit
                            </button>
                            <button 
                                onClick={() => setIsAdjusting(false)} 
                                className="w-11 h-11 rounded-xl bg-white/10 text-white flex items-center justify-center hover:bg-white/20"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}

function ChevronDownIcon(props: any) {
    return (
        <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
    )
}

import { CreditCard as LucideCreditCard } from "lucide-react";
const CreditCard = LucideCreditCard;




