import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useState } from "react";
import {
    Users,
    Search,
    Filter,
    FileText,
    Eye,
    CheckCircle,
    XCircle,
    Loader2,
    ShieldCheck,
    Phone,
    Calendar,
    X,
    ExternalLink
} from "lucide-react";
import { toast } from "sonner";

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

export default function KYCVerificationPage() {
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState("");
    const [page, setPage] = useState(1);
    const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
    const [viewingDoc, setViewingDoc] = useState<{ type: string; url: string } | null>(null);

    const { data: kycData, isLoading, isFetching } = useQuery({
        queryKey: ["admin_staff_kyc", page, searchQuery],
        queryFn: async () => {
            const res = await api.get(`/admin/doctors?page=${page}&limit=50&search=${searchQuery}`);
            const data = res.data.data;
            // The backend returns { items, total, ... }
            // We need to filter for Pending/Inactive on frontend if backend doesn't filter by status=Pending
            // But I updated backend to support status filter. 
            // However, the original code had a manual filter. I'll stick to manual filter for now to preserve logic unless I'm sure about status mapping.
            const items = data.items || [];
            return {
                ...data,
                items: items.filter((d: Doctor) => d.status === "Pending" || d.status === "Inactive")
            };
        }
    });

    const staff = kycData?.items || [];
    const totalPages = kycData?.totalPages || 1;

    const updateStatusMutation = useMutation({
        mutationFn: async ({ id, status }: { id: string, status: string }) => {
            return api.put(`/admin/users/doctor/${id}/status`, { status, isRegistered: status === 'Active' });
        },
        onSuccess: () => {
            toast.success("Provider status updated successfully");
            queryClient.invalidateQueries({ queryKey: ["admin_staff_kyc"] });
            queryClient.invalidateQueries({ queryKey: ["admin-dashboard-overview"] });
            setSelectedDoctor(null);
        },
        onError: (err: any) => {
            toast.error(err?.response?.data?.message || "Verification failed");
        }
    });

    // Removed early return to prevent page blinking
    // if (isLoading) {
    //     return (
    //         <div className="flex items-center justify-center p-20">
    //             <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
    //         </div>
    //     );
    // }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">KYC Verification</h1>
                    <p className="text-slate-500 font-medium whitespace-nowrap">Audit and approve new partner applications.</p>
                </div>
                
                <div className="flex items-center gap-4 bg-amber-50 border border-amber-100 px-6 py-3 rounded-[20px]">
                    <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center text-amber-600">
                      <ShieldCheck size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest">Awaiting Review</p>
                      <p className="text-xl font-black text-amber-900 leading-none mt-0.5">{staff?.filter((s: Doctor) => s.status === 'Pending').length || 0}</p>
                    </div>
                </div>
            </header>

            {/* Search Row */}
            <div className="relative group max-w-xl">
                <Search size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors z-10" />
                <input
                    type="text"
                    placeholder="Search by Provider Name, Mobile or Specialization..."
                    className="w-full h-14 pl-16 pr-6 bg-white border border-slate-100 rounded-[28px] text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-50 transition-all shadow-sm"
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {isLoading ? (
                    <div className="col-span-full py-20 text-center">
                        <div className="flex flex-col items-center gap-4">
                            <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Syncing Credentials...</p>
                        </div>
                    </div>
                ) : Array.isArray(staff) && staff.map((doctor) => (
                    <div key={doctor._id} className="bg-white rounded-[24px] border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-500 group overflow-hidden flex flex-col">
                        <div className="p-5 flex-1 flex flex-col">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex gap-3 items-center">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-sm font-black text-slate-500 group-hover:from-blue-600 group-hover:to-indigo-700 group-hover:text-white transition-all duration-500 shadow-inner">
                                        {doctor.name?.charAt(0) || 'P'}
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="text-sm font-black text-slate-900 truncate leading-tight">{doctor.name || "Provider"}</h3>
                                        <div className="flex items-center gap-1.5 mt-1">
                                            <Phone size={12} className="text-slate-400" />
                                            <p className="text-xs font-bold text-slate-500 truncate">{doctor.mobileNumber}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                    doctor.status === 'Pending' ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"
                                }`}>
                                    {doctor.status}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-3 mb-6">
                                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Expertise</p>
                                    <p className="text-xs font-black text-slate-700 truncate">{doctor.specialization?.join(', ') || "N/A"}</p>
                                </div>
                                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Tenure</p>
                                    <p className="text-xs font-black text-slate-700">
                                      {doctor.startExperience ? `${new Date().getFullYear() - new Date(doctor.startExperience).getFullYear()} Years` : "N/A"}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-3 mb-6 flex-1">
                                <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                  <FileText size={14} /> Submitted Documents
                                </h4>
                                <div className="max-h-32 overflow-y-auto pr-1 space-y-2">
                                    {Array.isArray(doctor.documents) && doctor.documents.map((doc: { type: string; url: string }, idx: number) => (
                                        <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-2xl hover:border-blue-200 transition-colors">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <FileText size={16} className="text-slate-400" />
                                                <p className="text-[10px] font-black text-slate-700 truncate">{doc.type}</p>
                                            </div>
                                            <button onClick={() => setViewingDoc(doc)} className="text-slate-400 hover:text-blue-600 p-1">
                                                <Eye size={16} />
                                            </button>
                                        </div>
                                    ))}
                                    {(!doctor.documents || doctor.documents.length === 0) && (
                                        <div className="text-center py-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">No Documents</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-slate-50">
                                <button 
                                    onClick={() => updateStatusMutation.mutate({ id: doctor._id, status: 'Active' })}
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3.5 rounded-2xl text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                                >
                                    <CheckCircle size={14} /> Approve
                                </button>
                                <button 
                                    onClick={() => updateStatusMutation.mutate({ id: doctor._id, status: 'Inactive' })}
                                    className="px-4 bg-rose-50 hover:bg-rose-100 text-rose-600 font-black py-3.5 rounded-2xl text-[10px] uppercase tracking-widest transition-all"
                                >
                                    Reject
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-between items-center bg-white p-8 rounded-[40px] border border-slate-100 shadow-xl shadow-slate-100/50 mt-12">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Page {page} of {totalPages}</p>
                    <div className="flex gap-4">
                        <button 
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="px-6 py-3 rounded-2xl bg-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-500 disabled:opacity-30 hover:bg-slate-200 transition-colors"
                        >
                            Prev
                        </button>
                        <button 
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="px-6 py-3 rounded-2xl bg-slate-900 text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-30 hover:bg-black transition-colors"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}

            {/* Document Viewer Modal */}
            {viewingDoc && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl flex items-center justify-center z-[100] p-6 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-5xl h-[85vh] rounded-[48px] overflow-hidden shadow-3xl animate-in zoom-in-95 duration-300 flex flex-col">
                        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-white">
                            <div>
                                <h3 className="text-2xl font-black text-slate-900">{viewingDoc.type}</h3>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Provider Credential Verification</p>
                            </div>
                            <button 
                                onClick={() => setViewingDoc(null)}
                                className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-all"
                            >
                                <X size={24} />
                            </button>
                        </div>
                        <div className="flex-1 bg-slate-50 p-10 overflow-auto">
                            {viewingDoc.url.toLowerCase().endsWith('.pdf') ? (
                                <iframe src={viewingDoc.url} className="w-full h-full rounded-2xl border border-slate-200" />
                            ) : (
                                <img src={viewingDoc.url} alt={viewingDoc.type} className="max-w-full mx-auto rounded-2xl shadow-lg shadow-slate-200" />
                            )}
                        </div>
                        <div className="p-8 bg-white border-t border-slate-100 flex justify-end">
                            <a 
                                href={viewingDoc.url} 
                                target="_blank" 
                                className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-100"
                            >
                                <ExternalLink size={18} /> Open in New Tab
                            </a>
                        </div>
                    </div>
                </div>
            )}

            {staff?.length === 0 && (
                <div className="py-20 text-center bg-white rounded-[40px] border border-dashed border-slate-200">
                    <ShieldCheck size={64} className="mx-auto text-slate-200 mb-6" />
                    <h3 className="text-xl font-black text-slate-900">Audit Queue Clear</h3>
                    <p className="text-slate-500 font-medium mt-2">All partner KYC applications have been reviewed.</p>
                </div>
            )}
        </div>
    );
}
