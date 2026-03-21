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
    const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);

    const { data: staff, isLoading } = useQuery({
        queryKey: ["admin_staff_kyc"],
        queryFn: async () => {
            const res = await api.get("/admin/doctors");
            // Only show Pending or Recently Inactive for review
            return (res.data.data as Doctor[]).filter(d => d.status === "Pending" || d.status === "Inactive");
        }
    });

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

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-20">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
            </div>
        );
    }

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
                      <p className="text-xl font-black text-amber-900 leading-none mt-0.5">{staff?.filter(s => s.status === 'Pending').length || 0}</p>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {staff?.map((doctor) => (
                    <div key={doctor._id} className="bg-white rounded-[32px] border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-500 group overflow-hidden">
                        <div className="p-8">
                            <div className="flex items-start justify-between mb-8">
                                <div className="flex gap-4 items-center">
                                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-xl font-black text-slate-500 group-hover:from-blue-600 group-hover:to-indigo-700 group-hover:text-white transition-all duration-500 shadow-inner">
                                        {doctor.name?.charAt(0) || 'P'}
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-slate-900 leading-tight">{doctor.name || "Provider Application"}</h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Phone size={12} className="text-slate-400" />
                                            <p className="text-xs font-bold text-slate-500">{doctor.mobileNumber}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                    doctor.status === 'Pending' ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"
                                }`}>
                                    {doctor.status}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 mb-8">
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Expertise</p>
                                    <p className="text-xs font-black text-slate-700 truncate">{doctor.specialization?.join(', ') || "N/A"}</p>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Tenure</p>
                                    <p className="text-xs font-black text-slate-700 truncate">
                                      {doctor.startExperience ? `${new Date().getFullYear() - new Date(doctor.startExperience).getFullYear()} Years` : "N/A"}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-3 mb-8">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                  <FileText size={14} /> Submitted Documents
                                </h4>
                                {doctor.documents?.map((doc, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl group/doc hover:border-blue-200 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 group-hover/doc:text-blue-600 shadow-sm transition-colors">
                                                <FileText size={20} />
                                            </div>
                                            <p className="text-xs font-black text-slate-700">{doc.type}</p>
                                        </div>
                                        <a href={doc.url} target="_blank" className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-blue-600 transition-all">
                                            <ExternalLink size={18} />
                                        </a>
                                    </div>
                                ))}
                                {(!doctor.documents || doctor.documents.length === 0) && (
                                    <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No documents attached</p>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-3 pt-6 border-t border-slate-50">
                                <button 
                                    onClick={() => updateStatusMutation.mutate({ id: doctor._id, status: 'Active' })}
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-2xl text-xs uppercase tracking-widest shadow-lg shadow-emerald-100 transition-all flex items-center justify-center gap-2"
                                >
                                    <CheckCircle size={18} /> Approve
                                </button>
                                <button 
                                    onClick={() => updateStatusMutation.mutate({ id: doctor._id, status: 'Inactive' })}
                                    className="flex-1 bg-amber-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 font-black py-4 rounded-2xl text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                                >
                                    <XCircle size={18} /> Reject
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

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
