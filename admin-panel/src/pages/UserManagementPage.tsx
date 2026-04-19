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
    FileText, Download, Eye, CreditCard
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
    const [deleteConfig, setDeleteConfig] = useState<{ id: string, type: 'patient' | 'doctor' | 'nurse' | 'ambulance' | 'rental' } | null>(null);

    const confirmGenericDelete = () => {
        if (!deleteConfig) return;
        const { id, type } = deleteConfig;
        api.delete(`/admin/users/${type}/${id}`).then(() => {
            queryClient.invalidateQueries({ queryKey: ["category_users", category] });
            setSelectedUser(null);
            setDeleteConfig(null);
            toast.success("Member record deleted.");
        });
    };

    // Add User Form State
    const [newName, setNewName] = useState("");
    const [newMobile, setNewMobile] = useState("");
    const [newEmail, setNewEmail] = useState("");
    const [newSpecialization, setNewSpecialization] = useState("");

    const isAnyModalOpen = !!selectedUser || isAddModalOpen || !!viewingDocument;

    useEffect(() => {
        if (!isAnyModalOpen) return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [isAnyModalOpen]);

    const { data: categories } = useQuery({
        queryKey: ["admin_categories_list"],
        queryFn: async () => {
            const res = await api.get("/services");
            return res.data.data as any[];
        }
    });

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
        createMutation.mutate({ 
            name: newName, 
            mobileNumber: newMobile, 
            email: newEmail,
            specialization: newSpecialization ? [newSpecialization] : []
        });
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
        if (category === 'rental') return "Medical Rentals";
        if (category === 'lab') return "Diagnostic Labs";
        if (category === 'service') return "Extra Services";
        return category;
    };

    const title = getRawTitle();

    if (isLoading) return (
        <div className="p-4 py-20 text-center">
            <Activity className="animate-pulse mx-auto text-indigo-500 dark:text-indigo-400 mb-4" size={48} />
            <p className="muted font-bold tracking-wider uppercase" style={{ fontSize: '0.75rem' }}>Loading {title} Directory...</p>
        </div>
    );

    const statCards = [
        { label: "Total Registered", value: stats?.total || 0, icon: Users2, color: "#1A7FD4", bg: "#EBF3FD" },
        { label: "Active", value: (category === 'patient' ? stats?.active : stats?.active) || 0, icon: UserCheck, color: "var(--emerald-600)", bg: "#F0FDF4" },
        { label: "Inactive", value: stats?.inactive || 0, icon: Clock, color: "#64748B", bg: "#F8FAFC" },
        { label: "This Week", value: stats?.week || 0, icon: BarChart3, color: "#7C3AED", bg: "#F5F3FF" },
        { label: "This Month", value: stats?.month || 0, icon: CheckCircle2, color: "#EC4899", bg: "#FDF2F8" },
    ];

    return (
        <div className="flex-col gap-6">
            <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6" style={{ marginBottom: '8px' }}>
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600">Users</span>
                        <ChevronRight size={10} className="text-slate-300" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">{title} Registry</span>
                    </div>
                    <h1 className="brand-name" style={{ fontSize: '2.25rem', letterSpacing: '-0.04em' }}>{title} Registry</h1>
                    <p className="text-xs muted font-extrabold uppercase tracking-widest" style={{ marginTop: '4px', opacity: 0.8 }}>
                        Strategic Management and Operational Metrics
                    </p>
                </div>
                <button className="button primary shadow-2xl h-12 px-8 rounded-2xl group active:scale-95 transition-all uppercase tracking-widest text-[10px] font-black" onClick={() => setIsAddModalOpen(true)}>
                    <UserPlus size={18} className="group-hover:rotate-12 transition-transform" />
                    <span>Add {title.slice(0, -1)}</span>
                </button>
            </header>

            {/* Mini Dashboard */}
            <div className="flex-col gap-4">
                <div className="grid-5 gap-4">
                    {statCards.map((stat) => (
                        <div key={stat.label} className="card p-6 flex flex-col gap-4 text-left hover:scale-[1.02] hover:shadow-xl transition-all duration-300" style={{ borderRadius: '24px' }}>
                            <div className="icon-box" style={{ background: `${stat.color}10`, color: stat.color, width: '52px', height: '52px', borderRadius: '18px', border: `1px solid ${stat.color}20` }}>
                                <stat.icon size={26} />
                            </div>
                            <div>
                                <h3 className="text-3xl font-black text-[var(--text-main)] m-0 tracking-tight">{stat.value}</h3>
                                <p className="text-[var(--text-muted)] font-black uppercase tracking-[0.2em]" style={{ fontSize: '9px', marginTop: '8px' }}>{stat.label}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex-col gap-4" style={{ marginTop: '8px' }}>
                <div className="card p-0 overflow-hidden shadow-2xl shadow-blue-900/5" style={{ borderRadius: '28px', border: '1px solid var(--border-color)' }}>
                    <div className="p-6 border-b border-[var(--border-color)] flex flex-col md:flex-row justify-between items-center bg-[var(--card-bg)] gap-4">
                        <div className="relative group w-full md:w-[420px]">
                            <Search className="absolute text-[var(--text-muted)] group-focus-within:text-blue-500 transition-colors" size={20} style={{ left: '20px', top: '50%', transform: 'translateY(-50%)' }} />
                            <input
                                placeholder={`Search by name, identity or contact...`}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-[var(--bg-main)] border-none px-6 text-sm font-semibold text-[var(--text-main)] placeholder:text-slate-400"
                                style={{ paddingLeft: '56px', height: '56px', borderRadius: '18px' }}
                            />
                        </div>
                        <div className="flex gap-4 w-full md:w-auto">
                            <select
                                className="bg-[var(--bg-main)] border-none px-6 text-[10px] font-black uppercase tracking-widest text-[var(--text-main)] outline-none focus:ring-2 focus:ring-blue-100"
                                style={{ height: '56px', borderRadius: '18px', minWidth: '160px' }}
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option value="All">All Status</option>
                                {category === 'patient' ? (
                                    <>
                                        <option value="Verified">Verified</option>
                                        <option value="Pending">Pending</option>
                                    </>
                                ) : (
                                    <>
                                        <option value="Active">Active</option>
                                        <option value="Pending">Pending</option>
                                        <option value="Inactive">Inactive</option>
                                    </>
                                )}
                            </select>
                             <button className="button secondary h-14 px-6 text-[10px] font-black uppercase tracking-[0.2em] gap-2 border border-[var(--border-color)] group hover:border-blue-500/50" style={{ borderRadius: '18px' }} onClick={() => toast.info("Advanced filters are enabled automatically based on search criteria.")}>
                                <Filter size={18} className="group-hover:text-blue-500 transition-colors" />
                                <span>Advanced Filters</span>
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="management-table">
                            <thead>
                                <tr className="bg-[var(--bg-main)]/50">
                                    <th className="!bg-transparent !text-[var(--text-muted)] p-6 pl-8">#</th>
                                    <th className="!bg-transparent !text-[var(--text-muted)]">MEMBER NAME</th>
                                    <th className="!bg-transparent !text-[var(--text-muted)]">CONTACT INFO</th>
                                    {category !== 'patient' && <th className="!bg-transparent !text-[var(--text-muted)]">SPECIALIZATION</th>}
                                    <th className="!bg-transparent !text-[var(--text-muted)]">STATUS</th>
                                    <th className="!bg-transparent !text-[var(--text-muted)]">REG. DATE</th>
                                    <th className="text-center !bg-transparent !text-[var(--text-muted)] pr-8">ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map((user: any, index: number) => (
                                    <tr key={user._id} className="cursor-pointer group hover:bg-blue-50/50 dark:hover:bg-blue-500/5 transition-all duration-300" onClick={() => setSelectedUser(user)}>
                                        <td className="p-6 pl-10 font-black text-slate-400 text-xs">
                                            {(index + 1).toString().padStart(2, '0')}
                                        </td>
                                        <td className="p-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 font-black shadow-sm group-hover:scale-110 transition-transform text-xs">
                                                    {user.name?.charAt(0) || "U"}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-[var(--text-main)]" style={{ fontSize: '0.95rem' }}>{user.name || "Anonymous Member"}</div>
                                                    <div className="flex items-center gap-2 mt-1.5 ">
                                                        <div className="text-[10px] text-[var(--text-muted)] uppercase font-black tracking-widest">ID: {user._id.slice(-8).toUpperCase()}</div>
                                                        {category === 'service' && user.specialization?.[0] && (
                                                            <>
                                                                <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                                                <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{user.specialization[0]}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="flex flex-col gap-1.5">
                                                <div className="text-xs font-black text-[var(--text-main)] flex items-center gap-2"><Phone size={13} className="text-blue-500/60" /> {user.mobileNumber}</div>
                                                {user.email && <div className="text-[10px] text-[var(--text-muted)] flex items-center gap-2 font-bold tracking-tight"><Mail size={12} className="opacity-40" /> {user.email}</div>}
                                            </div>
                                        </td>
                                        {category !== 'patient' && (
                                            <td>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {(user.specialization || []).slice(0, 2).map((s: string) => <span key={s} className="px-2.5 py-1 rounded-lg bg-[var(--bg-main)] text-[var(--text-muted)] text-[9px] font-black uppercase tracking-wider border border-[var(--border-color)]">{s}</span>)}
                                                    {(user.specialization || []).length > 2 && <span className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 text-[9px] font-black">+{user.specialization.length - 2}</span>}
                                                    {!(user.specialization || []).length && <span className="text-[9px] font-black tracking-widest uppercase opacity-20">CORE ASSET</span>}
                                                </div>
                                            </td>
                                        )}
                                        <td>
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest
                                                ${(category === 'patient' ? user.isRegistered : user.status === 'Active') ? 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10' : 
                                                  user.status === 'Pending' ? 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-500/10' : 
                                                  'text-rose-600 bg-rose-50 dark:text-rose-400 dark:bg-rose-500/10'}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${(category === 'patient' ? user.isRegistered : user.status === 'Active') ? 'bg-emerald-500' : user.status === 'Pending' ? 'bg-amber-500' : 'bg-rose-500'}`}></span>
                                                {category === 'patient' ? (user.isRegistered ? 'Verified' : 'Pending') : user.status}
                                            </span>
                                        </td>
                                        <td className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest opacity-60">
                                            {new Date(user.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </td>
                                        <td className="pr-8">
                                            <div className="justify-end flex items-center gap-2">
                                                {(category !== 'patient' && user.status === 'Pending') && (
                                                    <button
                                                        className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white flex items-center justify-center transition-all border border-emerald-100"
                                                        onClick={(e) => { e.stopPropagation(); statusMutation.mutate({ id: user._id, status: 'Active', isRegistered: true }); }}
                                                        title="Approve Member"
                                                    >
                                                        <ShieldCheck size={18} />
                                                    </button>
                                                )}
                                                <button className="w-10 h-10 rounded-xl bg-[var(--bg-main)] text-[var(--text-muted)] hover:text-blue-600 hover:bg-blue-50 flex items-center justify-center transition-all" title="Inspect Protocol"><Eye size={18} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {!filteredUsers.length && (
                                    <tr>
                                        <td colSpan={6} style={{ padding: '120px 0' }}>
                                            <div className="flex flex-col items-center gap-6 text-center">
                                                <div className="w-20 h-20 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-[24px] flex items-center justify-center shadow-inner">
                                                    <Users size={32} className="text-[var(--text-muted)] opacity-30" />
                                                </div>
                                                <div className="space-y-2">
                                                    <p className="font-black text-[var(--text-main)] uppercase tracking-[0.3em] text-sm">NO MEMBERS FOUND</p>
                                                    <p className="text-xs muted font-bold max-w-[280px]">No member records detected matching your current search criteria.</p>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="p-8 border-t border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-main)]/30 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                        <div className="flex items-center gap-4">
                            <span className="bg-[var(--card-bg)] px-4 py-2 rounded-xl border border-[var(--border-color)]">Total Entries: <span className="text-[var(--text-main)] ml-2">{filteredUsers.length}</span></span>
                        </div>
                        <div className="flex gap-2">
                            <button className="w-10 h-10 rounded-xl bg-[var(--card-bg)] border border-[var(--border-color)] flex items-center justify-center text-[var(--text-muted)] hover:text-blue-600 transition-all opacity-50 cursor-not-allowed"><ChevronLeft size={18} /></button>
                            <button className="w-10 h-10 rounded-xl bg-[var(--card-bg)] border border-[var(--border-color)] flex items-center justify-center text-[var(--text-muted)] hover:text-blue-600 transition-all opacity-50 cursor-not-allowed"><ChevronRight size={18} /></button>
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
                        <header className="px-8 md:px-12 py-8 border-b border-white/5 bg-gradient-to-r from-indigo-500/10 via-transparent to-transparent flex items-center justify-between gap-6">
                            <div className="flex items-center gap-6 min-w-0">
                                <div className="w-20 h-20 rounded-[28px] bg-black/40 backdrop-blur-3xl p-2 border border-white/10 shadow-2xl">
                                    <div className="w-full h-full rounded-[20px] overflow-hidden bg-gradient-to-br from-indigo-500/20 to-blue-500/20 flex items-center justify-center text-3xl font-black text-white">
                                        {selectedUser.name?.charAt(0) || "U"}
                                    </div>
                                </div>
                                <div className="min-w-0">
                                    <h2 className="text-white text-2xl md:text-3xl font-black tracking-tight truncate">{selectedUser.name || "Member Profile"}</h2>
                                    <div className="flex flex-wrap items-center gap-4 text-[11px] font-bold text-white/40 uppercase tracking-[0.2em] mt-2">
                                        <div className="flex items-center gap-2 font-mono text-[9px] bg-black/40 px-3 py-1.5 rounded-xl border border-white/5 text-white/60">USER_ID: {selectedUser._id}</div>
                                    </div>
                                </div>
                            </div>
                            <button className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-white/30 hover:text-white" onClick={() => setSelectedUser(null)}><X size={24} /></button>
                        </header>

                        <div className="p-8 md:p-12">
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                                <div className="lg:col-span-8 space-y-12">
                                    <section>
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-400/60 mb-6 flex items-center gap-4">
                                            <span className="w-10 h-[2px] bg-indigo-500/30"></span> Personal Details
                                        </h3>
                                        <div className="bg-white/5 backdrop-blur-3xl p-7 rounded-[32px] border border-white/5 grid grid-cols-2 gap-6">
                                            {[
                                                { label: "Mobile Number", value: selectedUser.mobileNumber },
                                                { label: "Email Address", value: selectedUser.email || "No Email" },
                                                { label: "Gender", value: selectedUser.gender || "Unspecified" },
                                                { label: "Verification Status", value: category === 'patient' ? (selectedUser.isRegistered ? "Verified" : "Unverified") : selectedUser.status }
                                            ].map(item => (
                                                <div key={item.label}>
                                                    <dt className="text-[9px] font-black text-white/20 uppercase tracking-widest">{item.label}</dt>
                                                    <dd className="mt-1 text-white font-bold">{item.value}</dd>
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                    <WalletSection user={selectedUser} category={category} />
                                </div>

                                <div className="lg:col-span-4 space-y-8">
                                    <div className="bg-white/5 rounded-[32px] p-7 border border-white/10">
                                        <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-6">KYC Documents</h3>
                                        <div className="space-y-3">
                                            {(selectedUser.documents || []).length > 0 ? (
                                                selectedUser.documents.map((doc: any, i: number) => (
                                                    <div key={i} className="p-4 bg-black/40 rounded-2xl flex items-center justify-between border border-white/5">
                                                        <span className="text-[10px] font-bold text-white uppercase truncate">{doc.type}</span>
                                                        <button className="text-[9px] font-black text-indigo-400 hover:text-white uppercase" onClick={() => setViewingDocument(doc)}>View</button>
                                                    </div>
                                                ))
                                            ) : <p className="text-[10px] text-white/20 font-black">No documents uploaded.</p>}
                                        </div>
                                    </div>
                                    <div className="bg-white/5 rounded-[32px] p-7 border border-white/10">
                                        <h3 className="text-[10px] font-black uppercase tracking-widest text-rose-400 mb-6">Account Management</h3>
                                        <button 
                                            className="w-full h-12 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[10px] font-black uppercase tracking-widest border border-rose-500/20 transition-all"
                                            onClick={() => {
                                                toast.error("Confirm Account Deletion", {
                                                    description: "Are you sure you want to permanently remove this user record? This action cannot be undone.",
                                                    action: {
                                                        label: "Delete",
                                                        onClick: () => confirmGenericDelete()
                                                    }
                                                });
                                            }}
                                        >
                                            Delete Account
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add User Modal */}
            {isAddModalOpen && (
                <div className="modal-overlay fixed inset-0 z-[150] flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-md" onClick={() => setIsAddModalOpen(false)}>
                    <div className="modal-content !bg-slate-900 border border-white/10 w-full max-w-lg p-10 rounded-[40px] shadow-3xl flex flex-col items-center gap-8" onClick={e => e.stopPropagation()}>
                        <div className="w-20 h-20 rounded-3xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                            <UserPlus size={40} />
                        </div>
                        <div className="text-center space-y-2">
                            <h2 className="text-white text-2xl font-black tracking-tight">Add New {title.slice(0, -1)}</h2>
                            <p className="text-white/30 text-sm font-medium">Adding a new {title.slice(0, -1).toLowerCase()} to the A1Care directory.</p>
                        </div>
                        <form className="w-full space-y-5" onSubmit={handleAddUser}>
                            {[
                                { label: "Full Name", value: newName, set: setNewName, type: "text", placeholder: "e.g. John Doe" },
                                { label: "Mobile Number", value: newMobile, set: setNewMobile, type: "tel", placeholder: "+91 XXXXX XXXXX" },
                                { label: "Email Address", value: newEmail, set: setNewEmail, type: "email", placeholder: "john@example.com" }
                            ].map(field => (
                                <div className="space-y-2" key={field.label}>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-indigo-200/50 ml-2">{field.label}</label>
                                    <input 
                                        type={field.type}
                                        className="w-full h-14 bg-white border-none rounded-[20px] px-6 text-slate-900 font-bold placeholder:text-indigo-900/40 focus:ring-4 focus:ring-indigo-500/20 outline-none transition-all shadow-inner"
                                        value={field.value}
                                        onChange={e => field.set(e.target.value)}
                                        placeholder={field.placeholder}
                                        required={field.label !== "Email Address"}
                                    />
                                </div>
                            ))}

                            {category === 'service' && (
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-indigo-200/50 ml-2">Service Specialization</label>
                                    <select 
                                        className="w-full h-14 bg-white border-none rounded-[20px] px-6 text-slate-900 font-bold focus:ring-4 focus:ring-indigo-500/20 outline-none transition-all shadow-inner"
                                        value={newSpecialization}
                                        onChange={e => setNewSpecialization(e.target.value)}
                                        required
                                    >
                                        <option value="">Select Service...</option>
                                        {categories?.filter(c => c.type === 'service').map(c => (
                                            <option key={c._id} value={c.name.replace(/SELECT|ASSIGN/g, "").trim()}>{c.name.replace(/SELECT|ASSIGN/g, "").trim()}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            <div className="pt-4 flex gap-4">
                                <button type="button" className="flex-1 h-14 rounded-[20px] bg-white/5 text-white/40 font-black uppercase tracking-widest text-[10px]" onClick={() => setIsAddModalOpen(false)}>Abort</button>
                                <button type="submit" disabled={createMutation.isPending} className="flex-1 h-14 rounded-[20px] bg-indigo-600 text-white font-black uppercase tracking-widest text-[10px] shadow-lg shadow-indigo-600/20">
                                    {createMutation.isPending ? "Saving..." : "Create Record"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfig && (
                <div className="modal-overlay fixed inset-0 z-[250] flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-xl">
                    <div className="modal-content !bg-slate-900 border border-white/10 w-full max-w-md p-10 rounded-[40px] shadow-3xl flex flex-col items-center text-center gap-6">
                        <div className="w-20 h-20 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500">
                            <Trash2 size={40} />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-white text-2xl font-black tracking-tight">Purge Member Signature?</h2>
                            <p className="text-white/40 text-sm font-medium">This operation will permanently wipe this record from the grid. This action is irreversible.</p>
                        </div>
                        <div className="flex gap-4 w-full">
                            <button className="flex-1 h-14 rounded-2xl bg-white/5 text-white/40 font-black uppercase tracking-widest text-[10px]" onClick={() => setDeleteConfig(null)}>Abort</button>
                            <button className="flex-1 h-14 rounded-2xl bg-rose-600 text-white font-black uppercase tracking-widest text-[10px]" onClick={confirmGenericDelete}>Purge Record</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Document Viewer Modal */}
            {viewingDocument && (
                <div className="modal-overlay fixed inset-0 z-[200] flex items-center justify-center p-12 bg-slate-950/80 backdrop-blur-2xl" onClick={() => setViewingDocument(null)}>
                    <div className="modal-content !bg-slate-900 border border-white/10 w-full max-w-4xl max-h-[90vh] rounded-[48px] overflow-hidden flex flex-col p-0 shadow-3xl" onClick={e => e.stopPropagation()}>
                        <div className="p-8 border-b border-white/5 flex items-center justify-between">
                            <h2 className="text-white text-2xl font-black">{viewingDocument.type}</h2>
                            <button className="text-white/20 hover:text-white" onClick={() => setViewingDocument(null)}><X size={32} /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-10 flex items-center justify-center bg-black/20">
                            {viewingDocument.url.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
                                <img src={viewingDocument.url} className="w-full h-auto rounded-3xl" alt="Preview" />
                            ) : (
                                <div className="text-center space-y-6">
                                    <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto text-white/20"><FileText size={64} /></div>
                                    <p className="text-white font-black text-xl">Encoded Data Stream</p>
                                    <a href={viewingDocument.url} target="_blank" className="button primary h-14 px-10 rounded-2xl inline-flex items-center gap-3">
                                        <Eye size={20} /> Open Stream
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function WalletSection({ user, category }: { user: any, category: string }) {
    const queryClient = useQueryClient();
    const [amount, setAmount] = useState("");
    const [description, setDescription] = useState("");
    const [isAdjusting, setIsAdjusting] = useState(false);

    const { data: wallet, isLoading } = useQuery({
        queryKey: ["user_wallet", user._id],
        queryFn: async () => {
            const res = await api.get(`/admin/users/${category}/${user._id}/wallet-balance`);
            return res.data.data;
        }
    });

    const adjustMutation = useMutation({
        mutationFn: async (type: 'Credit' | 'Debit') => {
            const res = await api.post(`/admin/users/${category}/${user._id}/wallet-adjust`, {
                amount: parseFloat(amount),
                description,
                type
            });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["user_wallet", user._id] });
            toast.success("Wallet synchronized.");
            setAmount("");
            setDescription("");
            setIsAdjusting(false);
        },
        onError: (err: any) => {
            toast.error(err?.response?.data?.message || "Sync failed.");
        }
    });

    return (
        <section className="space-y-6">
            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-400/60 flex items-center gap-4">
                <span className="w-10 h-[2px] bg-indigo-500/30"></span> Wallet Management
            </h3>
            <div className="bg-white/5 p-8 rounded-[40px] border border-white/5 flex flex-col md:flex-row justify-between items-center gap-8 shadow-2xl overflow-hidden relative group">
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity"><CreditCard size={100} className="text-indigo-500" /></div>
                <div className="relative z-10">
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Available Balance</p>
                    <h4 className="text-5xl font-black text-white">{isLoading ? "---" : `₹${wallet?.balance || 0}`}</h4>
                </div>
                
                {!isAdjusting ? (
                    <button onClick={() => setIsAdjusting(true)} className="h-14 px-10 rounded-2xl bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all">Adjust Balance</button>
                ) : (
                    <div className="w-full md:w-[320px] space-y-3 p-4 bg-black/40 rounded-3xl border border-white/5 animate-in zoom-in-95">
                        <input type="number" placeholder="Enter Amount to Credit/Debit..." value={amount} onChange={e => setAmount(e.target.value)} className="w-full bg-white border border-white/10 h-12 px-5 rounded-2xl text-slate-900 font-bold placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/50 outline-none" />
                        <input placeholder="Transaction Memo (e.g., Bonus, Refund)..." value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-white border border-white/10 h-12 px-5 rounded-2xl text-slate-900 font-bold placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/50 outline-none" />
                        <div className="flex gap-2">
                            <button onClick={() => adjustMutation.mutate('Credit')} className="flex-1 h-10 rounded-xl bg-emerald-600 text-white text-[9px] font-black uppercase tracking-widest" disabled={adjustMutation.isPending}>Credit (+)</button>
                            <button onClick={() => adjustMutation.mutate('Debit')} className="flex-1 h-10 rounded-xl bg-rose-600 text-white text-[9px] font-black uppercase tracking-widest" disabled={adjustMutation.isPending}>Debit (-)</button>
                            <button onClick={() => setIsAdjusting(false)} className="px-3 rounded-xl bg-white/10 text-white"><X size={16} /></button>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}
