import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
    Users, Search, Filter, Plus,
    ChevronLeft, ChevronRight, Phone, Mail,
    Activity, ShieldCheck, CheckCircle2, Clock,
    BarChart3, UserCheck, UserPlus, Users2,
    X, Trash2, Calendar,
    FileText, Download, Eye
} from "lucide-react";

interface CategoryStats {
    total: number;
    active: number;
    inactive: number;
    today: number;
    week: number;
    month: number;
}

export function UserManagementPage({ category }: { category: string }) {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("All");
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [viewingDocument, setViewingDocument] = useState<any | null>(null);

    // Add User Form State
    const [newName, setNewName] = useState("");
    const [newMobile, setNewMobile] = useState("");
    const [newEmail, setNewEmail] = useState("");

    const isAnyModalOpen = !!selectedUser || isAddModalOpen || !!viewingDocument;

    useEffect(() => {
        if (!isAnyModalOpen) return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [isAnyModalOpen]);

    const { data: stats } = useQuery({
        queryKey: ["category_stats", category],
        queryFn: async () => {
            const res = await api.get(`/admin/user-stats/${category}`);
            return res.data.data as CategoryStats;
        }
    });

    const { data: users, isLoading } = useQuery({
        queryKey: ["category_users", category],
        queryFn: async () => {
            const res = await api.get(`/admin/user-list/${category}`);
            return res.data.data;
        }
    });

    const statusMutation = useMutation({
        mutationFn: async ({ id, status, isRegistered }: { id: string, status?: string, isRegistered?: boolean }) => {
            const res = await api.put(`/admin/users/${category}/${id}/status`, { status, isRegistered });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["category_users", category] });
            queryClient.invalidateQueries({ queryKey: ["category_stats", category] });
            if (selectedUser) {
                // Refresh detail state if open
                queryClient.invalidateQueries({ queryKey: ["user_details", category, selectedUser._id] });
            }
        }
    });

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await api.post(`/admin/users/${category}/create`, data);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["category_users", category] });
            queryClient.invalidateQueries({ queryKey: ["category_stats", category] });
            setIsAddModalOpen(false);
            setNewName("");
            setNewMobile("");
            setNewEmail("");
            toast.success(`${category} record created successfully.`);
        },
        onError: (err: any) => {
            toast.error(err?.response?.data?.message || `Failed to create ${category}.`);
        }
    });

    const handleAddUser = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName || !newMobile) return toast.error("Required fields missing.");
        createMutation.mutate({ name: newName, mobileNumber: newMobile, email: newEmail });
    };

    const filteredUsers = useMemo(() => {
        if (!users) return [];
        return users.filter((u: any) => {
            const matchesSearch =
                (u.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                (u.mobileNumber || "").toString().includes(searchTerm) ||
                (u._id || "").toLowerCase().includes(searchTerm.toLowerCase());

            const userStatus = category === 'patient' ? (u.isRegistered ? "Verified" : "Pending") : u.status;
            const matchesFilter = statusFilter === "All" || userStatus === statusFilter;

            return matchesSearch && matchesFilter;
        });
    }, [users, searchTerm, statusFilter, category]);

    const getRawTitle = () => {
        if (category === 'patient') return "Patients";
        if (category === 'doctor') return "Doctors";
        if (category === 'nurse') return "Nurses";
        if (category === 'ambulance') return "Ambulances";
        if (category === 'rental') return "Medical Rental Providers";
        return category;
    };

    const title = getRawTitle();

    if (isLoading) return (
        <div className="p-4 py-20 text-center">
            <Activity className="animate-pulse mx-auto text-indigo-500 dark:text-indigo-400 mb-4" size={48} />
            <p className="muted font-bold tracking-wider uppercase" style={{ fontSize: '0.75rem' }}>Loading {title} Database...</p>
        </div>
    );

    const statCards = [
        { label: "Total Registered", value: stats?.total ?? 0, icon: Users2, color: "#1A7FD4", bg: "#EBF3FD" },
        { label: "Active", value: stats?.active ?? 0, icon: UserCheck, color: "#22C55E", bg: "#F0FDF4" },
        { label: "Inactive", value: stats?.inactive ?? 0, icon: Clock, color: "#64748B", bg: "#F8FAFC" },
        { label: "This Week", value: stats?.week ?? 0, icon: BarChart3, color: "#7C3AED", bg: "#F5F3FF" },
        { label: "This Month", value: stats?.month ?? 0, icon: CheckCircle2, color: "#EC4899", bg: "#FDF2F8" },
    ];

    return (
        <div className="flex-col gap-10" style={{ padding: '8px' }}>
            <header className="flex justify-between items-center" style={{ marginBottom: '16px' }}>
                <div>
                    <h1 className="brand-name" style={{ fontSize: '2rem', letterSpacing: '-0.03em' }}>{title}</h1>
                    <p className="text-xs muted font-extrabold uppercase tracking-widest" style={{ marginTop: '4px', opacity: 0.8 }}>
                        Management and Metrics Overview for {category}s
                    </p>
                </div>
                <button className="button primary shadow-xl h-12 px-8 rounded-2xl" onClick={() => setIsAddModalOpen(true)}>
                    <Plus size={20} />
                    <span style={{ fontWeight: 800 }}>Add New {category}</span>
                </button>
            </header>

            {/* Mini Dashboard */}
            <div className="flex-col gap-4">
                <div className="grid-5">
                    {statCards.map((stat) => (
                        <div key={stat.label} className="card p-5 flex-col gap-3 justify-center text-center transition-all hover:scale-[1.02] !bg-slate-950/40 backdrop-blur-3xl" style={{ border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px', boxShadow: '0 10px 30px -5px rgba(0,0,0,0.2)' }}>
                            <div className="icon-box" style={{ background: `rgba(${parseInt(stat.color.slice(1,3), 16)}, ${parseInt(stat.color.slice(3,5), 16)}, ${parseInt(stat.color.slice(5,7), 16)}, 0.1)`, color: stat.color, width: '48px', height: '48px', margin: '0 auto', marginBottom: '8px', borderRadius: '16px', border: `1px solid ${stat.color}10` }}>
                                <stat.icon size={24} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-white m-0">{stat.value}</h3>
                                <p className="text-white/30 font-bold uppercase tracking-widest" style={{ fontSize: '9px', marginTop: '6px' }}>{stat.label}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex-col gap-4" style={{ marginTop: '16px' }}>
                <div className="card p-0 overflow-hidden !bg-slate-950/40 backdrop-blur-3xl" style={{ border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px', boxShadow: '0 20px 50px -10px rgba(0,0,0,0.3)' }}>
                    <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
                        <div className="relative" style={{ width: '380px' }}>
                            <Search className="absolute text-white/30" size={18} style={{ left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                            <input
                                placeholder={`Search by name, phone or UUID...`}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-black/20 border-white/5 px-5 text-sm text-white placeholder:text-white/20"
                                style={{ paddingLeft: '48px', height: '52px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}
                            />
                        </div>
                        <div className="flex gap-4">
                            <select
                                className="bg-black/20 border-white/5 px-4 text-xs font-black uppercase tracking-widest text-white/70"
                                style={{ height: '52px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option value="All" className="bg-slate-900">All Status</option>
                                {category === 'patient' ? (
                                    <>
                                        <option value="Verified" className="bg-slate-900">Verified</option>
                                        <option value="Pending" className="bg-slate-900">Pending</option>
                                    </>
                                ) : (
                                    <>
                                        <option value="Active" className="bg-slate-900">Active</option>
                                        <option value="Pending" className="bg-slate-900">Pending</option>
                                        <option value="Inactive" className="bg-slate-900">Inactive</option>
                                    </>
                                )}
                            </select>
                            <button className="button secondary !bg-white/5 !text-white/50 hover:!bg-white/10 h-12 px-6 text-xs font-black gap-2 uppercase tracking-widest border border-white/5" style={{ borderRadius: '16px' }}>
                                <Filter size={18} />
                                <span>Advanced Filters</span>
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="management-table">
                            <thead>
                                <tr className="bg-white/5 border-b border-white/5">
                                    <th className="!text-white/30 !bg-transparent" style={{ paddingLeft: '32px', height: '60px' }}>NAME / IDENTITY</th>
                                    <th className="!text-white/30 !bg-transparent">CONTACT METHOD</th>
                                    {category !== 'patient' && <th className="!text-white/30 !bg-transparent">SPECIALIZATION</th>}
                                    <th className="!text-white/30 !bg-transparent">OPERATIONAL STATUS</th>
                                    <th className="!text-white/30 !bg-transparent">JOINED DATE</th>
                                    <th className="text-center !text-white/30 !bg-transparent">ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map((user: any) => (
                                    <tr key={user._id} className="cursor-pointer group hover:!bg-indigo-500/10 border-b border-white/5 transition-all duration-300" onClick={() => setSelectedUser(user)}>
                                        <td style={{ paddingLeft: '32px', paddingBlock: '20px' }}>
                                            <div className="flex items-center gap-3">
                                                <div className="avatar small bg-indigo-500/10 text-indigo-400" style={{ borderRadius: '12px' }}>
                                                    {user.name?.charAt(0) || "A"}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-white/90" style={{ fontSize: '0.95rem' }}>{user.name || "Anonymous User"}</div>
                                                    <div className="text-xs text-white/20 mt-1.5 uppercase tracking-wider font-bold" style={{ fontSize: '10px' }}>UUID: {user._id.slice(-8).toUpperCase()}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="flex-col gap-1">
                                                <div className="text-sm font-bold text-white/70 flex items-center gap-2"><Phone size={14} className="text-indigo-400/80" /> {user.mobileNumber}</div>
                                                {user.email && <div className="text-xs text-white/30 flex items-center gap-2 font-bold tracking-tight"><Mail size={13} /> {user.email}</div>}
                                            </div>
                                        </td>
                                        {category !== 'patient' && (
                                            <td>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {(user.specialization || []).slice(0, 2).map((s: string) => <span key={s} className="badge secondary text-[10px] !bg-white/5 !text-white/40 !border-white/5">{s}</span>)}
                                                    {(user.specialization || []).length > 2 && <span className="badge secondary text-[10px] bg-indigo-500/10 text-indigo-400 border-indigo-400/10">+{(user.specialization || []).length - 2}</span>}
                                                    {!(user.specialization || []).length && <span className="text-white/10 text-[9px] font-black tracking-widest uppercase">General Core</span>}
                                                </div>
                                            </td>
                                        )}
                                        <td>
                                            <span className={`badge ${(category === 'patient' ? user.isRegistered : user.status === 'Active') ? 'success' : user.status === 'Pending' ? 'warning' : 'danger'} text-[10px] uppercase font-black bg-opacity-10 border border-white/5`} style={{ padding: '6px 14px', letterSpacing: '0.05em' }}>
                                                {category === 'patient' ? (user.isRegistered ? 'Verified' : 'Pending') : user.status}
                                            </span>
                                        </td>
                                        <td className="text-[11px] font-black text-white/20 tracking-widest">
                                            {new Date(user.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}
                                        </td>
                                        <td>
                                            <div className="justify-center flex gap-2">
                                                {(category !== 'patient' && user.status === 'Pending') && (
                                                    <button
                                                        className="icon-button text-green-500 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-500/10 dark:bg-green-500/10"
                                                        onClick={(e) => { e.stopPropagation(); statusMutation.mutate({ id: user._id, status: 'Active', isRegistered: true }); }}
                                                        title="Verify & Approve"
                                                    >
                                                        <ShieldCheck size={18} />
                                                    </button>
                                                )}
                                                <button className="icon-button !text-indigo-400 hover:!bg-indigo-500/20" style={{ width: '40px', height: '40px' }} title="View Profile Trace"><Eye size={18} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {!filteredUsers.length && (
                                    <tr>
                                        <td colSpan={6} style={{ padding: '100px 0' }}>
                                            <div className="flex-col items-center gap-4 text-center">
                                                <div className="icon-box bg-[var(--bg-main)]" style={{ width: '72px', height: '72px', borderRadius: '24px' }}>
                                                    <Users size={36} className="text-[var(--text-muted)]" />
                                                </div>
                                                <div className="space-y-2">
                                                    <p className="font-black text-[var(--text-main)] uppercase tracking-widest text-sm">No registry matches</p>
                                                    <p className="text-xs muted font-bold">Try adjusting your search terms or filters.</p>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="p-6 border-t border-white/5 flex justify-between items-center bg-white/5 text-[10px] font-black uppercase tracking-widest text-white/30">
                        <p>Total Records Trace: <span className="text-indigo-400 text-sm ml-2">{filteredUsers.length}</span></p>
                        <div className="flex gap-3">
                            <button className="icon-button !bg-white/5 hover:!bg-white/10 !text-white/40" style={{ borderRadius: '12px' }}><ChevronLeft size={18} /></button>
                            <button className="icon-button !bg-white/5 hover:!bg-white/10 !text-white/40" style={{ borderRadius: '12px' }}><ChevronRight size={18} /></button>
                        </div>
                    </div>
                </div>
            </div>

            {/* User Detail Modal */}
            {selectedUser && (
                <div className="modal-overlay fixed inset-0 z-[100] flex items-start md:items-center justify-center p-4 md:p-8 overflow-y-auto" onClick={() => setSelectedUser(null)}>
                    <div 
                        className="modal-content !bg-slate-950/90 backdrop-blur-[60px] w-full !max-w-6xl max-h-[92vh] overflow-y-auto overflow-x-hidden flex flex-col gap-0 relative shadow-[0_0_200px_-50px_rgba(0,0,0,1)] transition-all animate-in border border-white/10 !p-0" 
                        onClick={e => e.stopPropagation()} 
                        style={{ borderRadius: '48px' }}
                    >
                        {/* Integrated Header Row */}
                        <div className="px-8 md:px-12 py-8 border-b border-white/5 bg-gradient-to-r from-indigo-500/10 via-transparent to-transparent flex items-center justify-between gap-6 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full -mr-32 -mt-32 blur-[100px]"></div>

                            <div className="flex items-center gap-6 min-w-0">
                                <div className="avatar-container relative shrink-0">
                                    <div className="w-20 h-20 rounded-[28px] bg-black/40 backdrop-blur-3xl p-2 border border-white/10 shadow-2xl relative z-10">
                                        <div className="w-full h-full rounded-[20px] overflow-hidden bg-gradient-to-br from-indigo-500/20 to-blue-500/20 flex items-center justify-center text-3xl font-black text-white">
                                            {(() => {
                                                const profileUrl =
                                                    selectedUser?.profileImage ||
                                                    selectedUser?.profilePicture ||
                                                    selectedUser?.profilePic ||
                                                    selectedUser?.avatarUrl ||
                                                    selectedUser?.avatar ||
                                                    selectedUser?.photoUrl ||
                                                    selectedUser?.photo ||
                                                    selectedUser?.imageUrl ||
                                                    selectedUser?.image;

                                                if (!profileUrl) return (selectedUser.name?.charAt(0) || "U");

                                                return (
                                                    <img
                                                        src={profileUrl}
                                                        alt={selectedUser.name || "Profile"}
                                                        className="w-full h-full object-cover"
                                                        loading="lazy"
                                                    />
                                                );
                                            })()}
                                        </div>
                                    </div>
                                </div>

                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-3 mb-2">
                                        <h2 className="text-white text-2xl md:text-3xl font-black tracking-tight tracking-[-0.04em] truncate">
                                            {selectedUser.name || "Member Profile"}
                                        </h2>
                                        <span className={`badge ${(category === 'patient' ? selectedUser.isRegistered : selectedUser.status === 'Active') ? 'success' : 'warning'} text-[10px] uppercase font-black px-4 py-1.5 shadow-xl backdrop-blur-3xl bg-white/5 border border-white/10 text-white whitespace-nowrap`}>
                                            {(category === 'patient' ? selectedUser.isRegistered : selectedUser.status === 'Active') ? <CheckCircle2 size={12} className="mr-2 text-green-400" /> : <Clock size={12} className="mr-2 text-amber-400" />}
                                            {category === 'patient' ? (selectedUser.isRegistered ? 'Verified Account' : 'Pending Verification') : selectedUser.status}
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-4 text-[11px] font-bold text-white/40 uppercase tracking-[0.2em]">
                                        <div className="flex items-center gap-2"><Calendar size={14} className="text-indigo-400/60" /> Joined {new Date(selectedUser.createdAt).toLocaleDateString()}</div>
                                        <div className="flex items-center gap-2 font-mono text-[9px] bg-black/40 px-3 py-1.5 rounded-xl border border-white/5 backdrop-blur-md text-white/60">NODE_ID: {selectedUser._id}</div>
                                    </div>
                                </div>
                            </div>

                            <button
                                className="w-12 h-12 rounded-2xl bg-white/5 backdrop-blur-3xl flex items-center justify-center text-white/30 hover:text-white hover:bg-red-500/20 border border-white/5 transition-all z-20 shrink-0"
                                onClick={() => setSelectedUser(null)}
                            >
                                <X size={24} />
                            </button>
                        </div>
                        <div className="px-8 md:px-12 py-12">
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                                <div className="lg:col-span-12 xl:col-span-8 space-y-12">
                                    <section>
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-400/60 mb-8 flex items-center gap-4">
                                            <span className="w-10 h-[2px] bg-indigo-500/30"></span>
                                            Details
                                        </h3>
                                        <div className="bg-white/5 backdrop-blur-3xl p-7 rounded-[32px] border border-white/5 shadow-xl">
                                            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-6">
                                                <div>
                                                    <dt className="text-[10px] font-black text-white/25 uppercase tracking-[0.25em]">Full name</dt>
                                                    <dd className="mt-2 text-base font-bold text-white/90 tracking-tight">{selectedUser.name || "N/A"}</dd>
                                                </div>
                                                <div>
                                                    <dt className="text-[10px] font-black text-white/25 uppercase tracking-[0.25em]">Phone</dt>
                                                    <dd className="mt-2 text-base font-bold text-white/90 tracking-tight">{selectedUser.mobileNumber || "N/A"}</dd>
                                                </div>
                                                <div>
                                                    <dt className="text-[10px] font-black text-white/25 uppercase tracking-[0.25em]">Gender</dt>
                                                    <dd className="mt-2 text-base font-bold text-white/90 tracking-tight">{selectedUser.gender || "Not specified"}</dd>
                                                </div>
                                                <div>
                                                    <dt className="text-[10px] font-black text-white/25 uppercase tracking-[0.25em]">Status</dt>
                                                    <dd className="mt-2 text-base font-bold text-white/90 tracking-tight">
                                                        {category === "patient" ? (selectedUser.isRegistered ? "Verified" : "Pending") : (selectedUser.status || "N/A")}
                                                    </dd>
                                                </div>
                                                <div className="sm:col-span-2">
                                                    <dt className="text-[10px] font-black text-white/25 uppercase tracking-[0.25em]">Email</dt>
                                                    <dd className="mt-2 text-base font-bold text-white/90 tracking-tight break-all">{selectedUser.email || "No email"}</dd>
                                                </div>
                                            </dl>
                                        </div>
                                    </section>

                                    {category !== 'patient' && (
                                        <section>
                                            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-indigo-400/40 mb-6 flex items-center gap-4">
                                                <span className="w-8 h-px bg-indigo-500/20"></span>
                                                Performance Metrics
                                            </h3>
                                            <div className="bg-white/5 backdrop-blur-3xl p-8 rounded-[40px] border border-white/5 space-y-8 shadow-xl">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                                    <div className="space-y-4">
                                                        <p className="text-[10px] font-black text-white/20 uppercase tracking-widest leading-none">Specializations</p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {(selectedUser.specialization || []).map((s: string) => (
                                                                <span key={s} className="px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/10 text-[10px] font-black text-white uppercase tracking-wider backdrop-blur-md">{s}</span>
                                                            ))}
                                                            {!(selectedUser.specialization || []).length && (
                                                                <span className="text-xs italic text-white/10">No reported data</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="space-y-4">
                                                        <p className="text-[10px] font-black text-white/20 uppercase tracking-widest leading-none">Authority Index</p>
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex text-amber-500/80">
                                                                {[1, 2, 3, 4, 5].map(i => (
                                                                    <Activity key={i} size={16} className={i <= (selectedUser.rating || 0) ? "fill-amber-500" : "opacity-10"} />
                                                                ))}
                                                            </div>
                                                            <p className="font-black text-white text-2xl leading-none">{selectedUser.rating || "0.0"}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="p-5 rounded-3xl bg-black/30 border border-white/5 shadow-inner">
                                                        <p className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-1.5">In-Situ Fee</p>
                                                        <p className="font-black text-xl text-white">₹{selectedUser.homeConsultationFee || selectedUser.consultationFee || "0"}</p>
                                                    </div>
                                                    <div className="p-5 rounded-3xl bg-black/30 border border-white/5 shadow-inner">
                                                        <p className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-1.5">Remote Fee</p>
                                                        <p className="font-black text-xl text-white">₹{selectedUser.onlineConsultationFee || "0"}</p>
                                                    </div>
                                                </div>

                                                <div className="space-y-4 pt-6 border-t border-white/5">
                                                    <p className="text-[10px] font-black text-white/20 uppercase tracking-widest flex items-center gap-2">
                                                        <FileText size={14} className="text-indigo-400/60" /> Provider Biography
                                                    </p>
                                                    <p className="text-sm font-medium text-white/40 leading-relaxed italic border-l-2 border-indigo-500/20 pl-6 py-1">
                                                        "{selectedUser.about || "Biography not available in production registry."}"
                                                    </p>
                                                </div>
                                            </div>
                                        </section>
                                    )}


                                </div>

                                <div className="lg:col-span-12 xl:col-span-4 space-y-8">
                                    <div className="bg-white/5 backdrop-blur-3xl rounded-[32px] p-7 border border-white/10 shadow-xl">
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.35em] text-indigo-400/60 mb-6">Actions</h3>
                                        <div className="space-y-3">
                                            {category === "patient" && !selectedUser.isRegistered && (
                                                <button
                                                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white h-12 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                                                    onClick={() => statusMutation.mutate({ id: selectedUser._id, isRegistered: true })}
                                                >
                                                    <ShieldCheck size={18} /> Verify patient
                                                </button>
                                            )}
                                            {category !== "patient" && selectedUser.status === "Pending" && (
                                                <button
                                                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white h-12 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                                                    onClick={() => statusMutation.mutate({ id: selectedUser._id, status: "Active", isRegistered: true })}
                                                >
                                                    <ShieldCheck size={18} /> Approve
                                                </button>
                                            )}

                                            <button
                                                className="w-full bg-red-500/10 hover:bg-red-500/15 text-red-400 h-12 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] border border-red-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                                                onClick={() => {
                                                    if (confirm("Permanently remove this record?")) {
                                                        api.delete(`/admin/users/${category}/${selectedUser._id}`).then(() => {
                                                            queryClient.invalidateQueries({ queryKey: ["category_users", category] });
                                                            setSelectedUser(null);
                                                        });
                                                    }
                                                }}
                                            >
                                                <Trash2 size={18} /> Delete
                                            </button>
                                        </div>
                                    </div>

                                    <div className="bg-white/5 backdrop-blur-3xl rounded-[32px] p-7 border border-white/10 shadow-xl">
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.35em] text-white/25 mb-6">Documents</h3>
                                        <div className="space-y-3">
                                            {(selectedUser.documents || []).length > 0 ? (
                                                (selectedUser.documents || []).map((doc: any, idx: number) => (
                                                    <div key={idx} className="p-4 bg-black/30 border border-white/5 rounded-2xl flex items-center justify-between">
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 shrink-0">
                                                                <FileText size={18} />
                                                            </div>
                                                            <p className="text-xs font-black text-white/80 uppercase tracking-tight truncate">{doc.type}</p>
                                                        </div>
                                                        <button
                                                            className="text-[9px] font-black text-indigo-400 hover:text-white uppercase tracking-widest px-3 py-1.5 bg-white/5 rounded-lg border border-white/10 transition-all shrink-0"
                                                            onClick={() => setViewingDocument(doc)}
                                                        >
                                                            Inspect
                                                        </button>

                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-xs text-white/20 font-bold">No documents.</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add User Placeholder Modal */}
            {isAddModalOpen && (
                <div className="modal-overlay fixed inset-0 z-[100] flex items-center justify-center p-6" onClick={() => setIsAddModalOpen(false)}>
                    <div className="modal-content !bg-slate-950/90 backdrop-blur-3xl border border-white/10 w-full max-w-lg p-10 flex-col items-center text-center gap-6" onClick={e => e.stopPropagation()} style={{ borderRadius: '40px' }}>
                        <div className="w-20 h-20 rounded-3xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                            <UserPlus size={40} />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-white text-2xl font-black">Create New {category}</h2>
                            <p className="text-sm text-white/30 font-medium">Inject a new member directly into the production registry.</p>
                        </div>
                        <form className="w-full space-y-4" onSubmit={handleAddUser}>
                            <div className="input-group text-left">
                                <label className="!text-white/40">Member Full Name</label>
                                <input 
                                    placeholder="Legal name..." 
                                    className="w-full !bg-white/5 h-12 px-5 rounded-2xl border-white/5 !text-white font-bold" 
                                    value={newName}
                                    onChange={e => setNewName(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="input-group text-left">
                                <label className="!text-white/40">Mobile Identity (Primary Phone)</label>
                                <input 
                                    placeholder="+91 000 000 0000" 
                                    className="w-full !bg-white/5 h-12 px-5 rounded-2xl border-white/5 !text-white font-bold" 
                                    value={newMobile}
                                    onChange={e => setNewMobile(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="input-group text-left">
                                <label className="!text-white/40">Email Protocol (Optional)</label>
                                <input 
                                    type="email"
                                    placeholder="email@example.com" 
                                    className="w-full !bg-white/5 h-12 px-5 rounded-2xl border-white/5 !text-white font-bold" 
                                    value={newEmail}
                                    onChange={e => setNewEmail(e.target.value)}
                                />
                            </div>
                            <div className="pt-4 flex gap-4">
                                <button type="button" className="button secondary !bg-white/5 !text-white/50 h-14 flex-1 rounded-2xl font-black uppercase tracking-widest" onClick={() => setIsAddModalOpen(false)}>Abort</button>
                                <button type="submit" disabled={createMutation.isPending} className="button primary flex-1 h-14 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-indigo-500/20">
                                    {createMutation.isPending ? "Syncing..." : "Finalize Registry"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Document Viewer Modal */}
            {viewingDocument && (
                <div className="modal-overlay fixed inset-0 z-[200] flex items-center justify-center p-12 bg-slate-900/80 backdrop-blur-xl" onClick={() => setViewingDocument(null)}>
                    <div className="modal-content !bg-slate-950/90 border border-white/10 w-full max-w-4xl max-h-[90vh] p-0 flex flex-col shadow-2xl relative overflow-hidden" onClick={e => e.stopPropagation()} style={{ borderRadius: '48px' }}>
                        <div className="p-8 border-b border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-indigo-500/10 text-indigo-400 rounded-2xl flex items-center justify-center">
                                    <ShieldCheck size={28} />
                                </div>
                                <div>
                                    <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Document Registry Trace</h4>
                                    <h2 className="text-white text-2xl font-black tracking-tight">{viewingDocument.type}</h2>
                                </div>
                            </div>
                            <button className="icon-button !text-white/20 hover:!text-white" onClick={() => setViewingDocument(null)}><X size={32} /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 bg-black/20">
                            {viewingDocument.url.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
                                <img src={viewingDocument.url} alt={viewingDocument.type} className="w-full h-auto rounded-[32px] shadow-2xl border border-white/5" />
                            ) : viewingDocument.url.match(/\.pdf$/i) ? (
                                <iframe src={viewingDocument.url} title="PDF Viewer" className="w-full h-[60vh] rounded-[32px] border border-white/5" />
                            ) : (
                                <div className="py-40 text-center flex flex-col items-center gap-6">
                                    <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center text-white/20">
                                        <FileText size={64} />
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-white font-black text-xl">Encoded Asset Vector</p>
                                        <p className="text-white/30 text-sm font-medium">This asset type requires an external viewer or download.</p>
                                    </div>
                                    <button 
                                        onClick={() => window.open(viewingDocument.url, "_blank")}
                                        className="button primary h-14 px-10 rounded-2xl font-black uppercase tracking-widest shadow-2xl shadow-indigo-500/20"
                                    >
                                        Open External Stream
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="p-8 border-t border-white/5 bg-white/5 flex gap-4 justify-end">
                            <button 
                                className="button secondary !bg-white/5 !text-white/50 h-14 px-12 rounded-2xl font-black uppercase tracking-widest"
                                onClick={() => setViewingDocument(null)}
                            >
                                Close Trace
                            </button>
                            <a 
                                href={viewingDocument.url} 
                                download 
                                className="button primary h-14 px-14 rounded-2xl font-black uppercase tracking-widest flex items-center gap-3"
                            >
                                <Download size={20} />
                                Download Asset
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
