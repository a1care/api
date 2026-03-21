import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { 
  ShieldAlert, Database, FileText, ClipboardList, 
  Search, Calendar, ArrowRight, User, Phone, Clock 
} from "lucide-react";
import { useState } from "react";

export function HealthVaultAuditPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["health-vault-audit"],
    queryFn: async () => {
      const res = await api.get("/admin/audit/health-vault");
      return res.data.data;
    }
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
        <p className="font-black text-[10px] text-slate-400 uppercase tracking-widest animate-pulse">Scanning Secure Vault Clusters...</p>
      </div>
    );
  }

  const { totalRecords, newToday, stats, recentRecords } = data;

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-10 rounded-[32px] border border-slate-100 shadow-sm shadow-indigo-50">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
              <ShieldAlert size={24} />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Health Vault <span className="text-indigo-600">Audit</span></h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Privacy-Focused Storage Monitoring</p>
            </div>
          </div>
        </div>

        <div className="flex gap-4">
           <div className="px-6 py-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Vault Status</span>
              <span className="text-xs font-black text-emerald-600 flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div> ENCRYPTED
              </span>
           </div>
        </div>
      </header>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Total Vault Records", value: totalRecords, icon: Database, color: "indigo" },
          { label: "New Records Today", value: newToday, icon: Calendar, color: "emerald", trend: "+12%" },
          { label: "Total Prescriptions", value: stats.totalPrescriptions, icon: ClipboardList, color: "blue" },
          { label: "Total Lab Reports", value: stats.totalLabReports, icon: FileText, color: "purple" },
        ].map((kpi, i) => (
          <div key={i} className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-md transition-shadow group">
            <div className={`w-12 h-12 rounded-2xl bg-${kpi.color}-50 text-${kpi.color}-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
              <kpi.icon size={22} />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{kpi.label}</p>
            <div className="flex items-baseline gap-3">
              <h4 className="text-3xl font-black text-slate-900">{kpi.value.toLocaleString()}</h4>
              {kpi.trend && <span className="text-[10px] font-black text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full">{kpi.trend}</span>}
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
             <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                <h3 className="text-xl font-black text-slate-900">Recent Vault Interactions</h3>
                <div className="relative">
                   <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                   <input 
                    className="h-11 pl-11 pr-6 bg-slate-50 border-none rounded-xl text-sm font-bold placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-100 transition-all w-64"
                    placeholder="Search patient/ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                   />
                </div>
             </div>

             <div className="overflow-x-auto">
               <table className="w-full text-left">
                  <thead className="bg-slate-50/50">
                    <tr>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Patient Details</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Timestamp</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {recentRecords.map((record: any) => (
                      <tr key={record._id} className="hover:bg-slate-50/30 transition-colors">
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 font-black text-xs">
                              {record.patientId?.name?.[0] || "P"}
                            </div>
                            <div>
                               <p className="text-sm font-black text-slate-900">{record.patientId?.name || "Anonymous Patient"}</p>
                               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{record.patientId?.mobileNumber || "No Contact"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                           <div className="flex items-center gap-4">
                              <div className="flex flex-col gap-1">
                                 {record.prescriptions?.length > 0 && (
                                   <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-black rounded-full border border-blue-100">
                                      {record.prescriptions.length} PRESCRIPTIONS
                                   </span>
                                 )}
                                 {record.labReports?.length > 0 && (
                                   <span className="px-3 py-1 bg-purple-50 text-purple-600 text-[10px] font-black rounded-full border border-purple-100">
                                      {record.labReports.length} LAB REPORTS
                                   </span>
                                 )}
                              </div>
                           </div>
                        </td>
                        <td className="px-8 py-6">
                           <div className="flex flex-col">
                              <span className="text-sm font-bold text-slate-700">{new Date(record.createdAt).toLocaleDateString()}</span>
                              <span className="text-[10px] font-bold text-slate-400 uppercase">{new Date(record.createdAt).toLocaleTimeString()}</span>
                           </div>
                        </td>
                        <td className="px-8 py-6 text-right">
                           <button className="p-2.5 text-slate-400 hover:text-indigo-600 bg-slate-50 rounded-xl hover:bg-indigo-50 transition-all active:scale-95">
                              <ArrowRight size={18} />
                           </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
               </table>
             </div>
          </div>
        </div>

        {/* Storage Insights */}
        <div className="space-y-8">
           <div className="bg-slate-900 rounded-[40px] p-10 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 blur-[50px]"></div>
              <h3 className="text-xl font-black mb-2">Storage Usage</h3>
              <p className="text-slate-400 text-xs font-medium mb-8">Aggregated cluster storage for all patient vaults.</p>
              
              <div className="space-y-6">
                 <div>
                   <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-2">
                     <span>AWS S3 Primary</span>
                     <span className="text-indigo-400">42%</span>
                   </div>
                   <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: "42%" }}></div>
                   </div>
                 </div>
                 <div>
                   <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-2">
                     <span>Glacier Backup</span>
                     <span className="text-blue-400">12%</span>
                   </div>
                   <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: "12%" }}></div>
                   </div>
                 </div>
              </div>

              <div className="mt-10 pt-8 border-t border-white/5 flex items-center justify-between">
                 <div className="text-[10px] font-black uppercase opacity-40">Next Scrubber Run</div>
                 <div className="text-[10px] font-black uppercase text-indigo-400">In 14 Hours</div>
              </div>
           </div>

           <div className="bg-white border border-slate-100 rounded-[40px] p-8 space-y-6">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center">
                    <User size={20} />
                 </div>
                 <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Compliance Status</h4>
              </div>
              <div className="space-y-4">
                 {[
                   { label: "Data Encryption", status: "Active" },
                   { label: "Access Logs", status: "Live" },
                   { label: "HIPAA Alignment", status: "Audit Ready" }
                 ].map((item, i) => (
                   <div key={i} className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
                      <span className="text-xs font-bold text-slate-500">{item.label}</span>
                      <span className="text-[10px] font-black text-emerald-600 uppercase tracking-tighter">{item.status}</span>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
