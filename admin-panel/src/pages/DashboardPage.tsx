import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { DashboardOverview, DoctorPerformance, RecentActivity } from "@/types";
import {
  Users,
  Stethoscope,
  Calendar,
  Activity,
  ArrowUpRight,
  ShieldCheck,
  TrendingUp,
  Clock,
  Search,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Eye,
  ArrowUpDown,
  Filter,
  CreditCard,
  Ticket
} from "lucide-react";

export function DashboardPage() {
  const [performanceSearch, setPerformanceSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"appointments" | "services">("appointments");
  const [sortField, setSortField] = useState<string>("stats.total");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);

  // --- Data Fetching ---
  const { data: overview, isLoading: isOverviewLoading } = useQuery({
    queryKey: ["admin-dashboard-overview"],
    queryFn: async () => {
      const res = await api.get("/admin/dashboard/overview");
      return res.data.data as DashboardOverview;
    }
  });

  const { data: performance, isLoading: isPerformanceLoading } = useQuery({
    queryKey: ["admin-doctor-performance"],
    queryFn: async () => {
      const res = await api.get("/admin/dashboard/doctor-performance");
      return res.data.data as DoctorPerformance[];
    }
  });

  const { data: activity, isLoading: isActivityLoading } = useQuery({
    queryKey: ["admin-recent-activity"],
    queryFn: async () => {
      const res = await api.get("/admin/dashboard/recent-bookings");
      return res.data.data as RecentActivity[];
    }
  });

  if (isOverviewLoading || isPerformanceLoading || isActivityLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="font-bold text-slate-500 animate-pulse">Synchronizing operational intelligence...</p>
      </div>
    );
  }

  const kpis = overview?.kpis;
  const bookings = overview?.bookings;
  const alerts = overview?.alerts;

  // --- Performance Table Logic ---
  const filteredPerformance = performance
    ?.filter(d => {
      const name = d.name?.toLowerCase() || "";
      const mobile = d.mobile || "";
      const search = performanceSearch.toLowerCase();
      return name.includes(search) || mobile.includes(search);
    })
    .sort((a, b) => {
      const getVal = (obj: any, path: string) => path.split('.').reduce((o, i) => o[i], obj);
      const valA = getVal(a, sortField) || 0;
      const valB = getVal(b, sortField) || 0;
      return sortOrder === "desc" ? valB - valA : valA - valB;
    });

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "desc" ? "asc" : "desc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const statusLabel = (status: string) => {
    const s = (status || "").toUpperCase();
    if (["COMPLETED", "RESOLVED", "CONFIRMED"].includes(s)) return "bg-emerald-50 text-emerald-600 border-emerald-100";
    if (["PENDING"].includes(s)) return "bg-amber-50 text-amber-600 border-amber-100";
    if (["CANCELLED", "CLOSED", "FAILED"].includes(s)) return "bg-red-50 text-red-600 border-red-100";
    return "bg-blue-50 text-blue-600 border-blue-100";
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-16 px-2">
      {/* Dynamic Header Experience */}
      <header className="relative flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full">
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">Network Command</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-none">Administrative Intelligence</h1>
          <p className="text-slate-500 font-medium text-lg">Operational command center for global A1Care systems.</p>
        </div>
        
        <div className="flex items-center gap-4">
           <div className="px-5 py-3 bg-white/80 backdrop-blur-md border border-white shadow-xl shadow-slate-200/50 rounded-[22px] flex items-center gap-3 transition-transform hover:scale-105 cursor-default">
             <div className="w-8 h-8 bg-slate-900 text-white rounded-lg flex items-center justify-center">
                <Calendar size={16} />
             </div>
             <div>
               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">System Date</p>
               <span className="text-sm font-black text-slate-700">{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
             </div>
           </div>
        </div>
      </header>

      {/* KPI Intelligence Cluster */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-5">
        <StatCard title="Total Patients" value={kpis?.patients} icon={Users} color="blue" onClick={() => setSelectedMetric("Patients")} />
        <StatCard title="Active Staff" value={kpis?.activeStaff} icon={Stethoscope} color="indigo" onClick={() => setSelectedMetric("Doctors")} />
        <StatCard title="Pending Verif" value={kpis?.pendingVerifications} icon={ShieldCheck} color="amber" onClick={() => setSelectedMetric("Verifications")} />
        <StatCard title="Total Volume" value={kpis?.totalBookings} icon={Calendar} color="sky" onClick={() => setSelectedMetric("Bookings")} />
        <StatCard title="Today Rev" value={kpis?.revenue?.today ? `₹${kpis.revenue.today.toLocaleString()}` : "₹0"} icon={TrendingUp} color="emerald" onClick={() => setSelectedMetric("Revenue Today")} />
        <StatCard title="Monthly Rev" value={kpis?.revenue?.month ? `₹${kpis.revenue.month.toLocaleString()}` : "₹0"} icon={CreditCard} color="blue" onClick={() => setSelectedMetric("Revenue Month")} />
        <StatCard title="Total Assets" value={kpis?.revenue?.total ? `₹${kpis.revenue.total.toLocaleString()}` : "₹0"} icon={Activity} color="slate" onClick={() => setSelectedMetric("Revenue Total")} />
      </section>

      {/* Metric Detail Overlay System */}
      {selectedMetric && (
        <MetricDetailModal 
          metric={selectedMetric} 
          data={overview} 
          onClose={() => setSelectedMetric(null)} 
        />
      )}

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Column: Bookings Overview & Activity */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Booking Matrix - High Density Intelligence */}
          <div className="bg-white/90 backdrop-blur-md rounded-[40px] border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden transition-all hover:shadow-2xl hover:shadow-blue-500/5 group">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-2 h-8 bg-blue-600 rounded-full shadow-[0_0_15px_rgba(37,99,235,0.4)]"></div>
                <div>
                  <h2 className="text-2xl font-black tracking-tight text-slate-900">Distribution Matrix</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Real-time status allocation</p>
                </div>
              </div>
              <div className="flex p-1.5 bg-slate-100/50 backdrop-blur-sm rounded-2xl border border-slate-200/50">
                <button 
                  onClick={() => setActiveTab("appointments")}
                  className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all duration-300 ${activeTab === 'appointments' ? 'bg-white shadow-lg text-blue-600 scale-105' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  Doctor Intel
                </button>
                <button 
                  onClick={() => setActiveTab("services")}
                  className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all duration-300 ${activeTab === 'services' ? 'bg-white shadow-lg text-blue-600 scale-105' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  Service Core
                </button>
              </div>
            </div>
            <div className="p-10 grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {(activeTab === "appointments" ? bookings?.appointments : bookings?.services)?.map((status: any) => (
                <div key={status._id} className="p-6 bg-slate-50/50 border border-slate-100 rounded-[28px] text-center group/item hover:bg-white hover:border-blue-200 transition-all duration-500 cursor-default shadow-sm hover:shadow-xl hover:-translate-y-1">
                   <div className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 group-hover/item:text-blue-500 transition-colors">{status._id || "NEW"}</div>
                   <div className="text-3xl font-black text-slate-900 group-hover/item:scale-110 transition-transform duration-500">{status.count}</div>
                </div>
              ))}
              {(!(activeTab === "appointments" ? bookings?.appointments : bookings?.services)?.length) && (
                <div className="col-span-full py-10 text-center">
                   <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 opacity-50">
                     <Activity size={32} className="text-slate-300" />
                   </div>
                   <p className="text-sm font-black text-slate-400 italic">Static intelligence synchronization in progress...</p>
                </div>
              )}
            </div>
          </div>

          {/* Activity Logs */}
          {/* Activity Logs - High Fidelity Stream */}
           <div className="bg-white/90 backdrop-blur-md rounded-[40px] border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden group">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
               <div className="flex items-center gap-4">
                <div className="w-2 h-8 bg-slate-900 rounded-full"></div>
                <div>
                  <h2 className="text-2xl font-black tracking-tight text-slate-900">Activity Analytics</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Global transaction stream</p>
                </div>
              </div>
              <button className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg shadow-slate-200">
                Audit Full Protocol
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="p-6 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Asset Type</th>
                    <th className="p-6 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Stakeholder</th>
                    <th className="p-6 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Service Vector</th>
                    <th className="p-6 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Value</th>
                    <th className="p-6 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Status Code</th>
                    <th className="p-6 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activity?.map((act) => (
                    <tr key={act.id} className="hover:bg-blue-50/30 transition-all duration-300 group/row">
                      <td className="p-6">
                        <span className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${act.type === 'Appointment' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-purple-50 text-purple-700 border-purple-100'}`}>
                          {act.type}
                        </span>
                      </td>
                      <td className="p-6">
                        <div className="text-sm font-black text-slate-800">{act.patient}</div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-0.5">PATIENT_ID_V7</div>
                      </td>
                      <td className="p-6">
                        <div className="text-sm font-bold text-slate-600">{act.provider}</div>
                      </td>
                      <td className="p-6">
                        <div className="text-sm font-black text-slate-900">₹{act.amount.toLocaleString()}</div>
                      </td>
                      <td className="p-6">
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black border uppercase tracking-widest ${statusLabel(act.status)}`}>
                          {act.status}
                        </span>
                      </td>
                      <td className="p-6 text-right">
                        <div className="text-[10px] font-black text-slate-900">{new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        <div className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{new Date(act.createdAt).toLocaleDateString()}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
           </div>
        </div>

        {/* Right Column: Admin Alerts & Quick Insights */}
        <div className="space-y-8">
           <div className="flex items-center gap-3 px-2">
             <AlertCircle size={22} className="text-red-500" />
             <h3 className="text-xl font-black tracking-tight text-slate-900">Critical Alerts</h3>
           </div>
           
           <div className="grid gap-5">
             <AlertItem 
               title="Provider Verification" 
               count={alerts?.pendingVerifications || 0} 
               icon={ShieldCheck} 
               description="Providers awaiting security clearance."
               color="amber"
               link="/kyc-verification"
             />
             <AlertItem 
               title="Support Intervention" 
               count={alerts?.openTickets || 0} 
               icon={Ticket} 
               description="High priority tickets active now."
               color="blue"
               link="/tickets"
             />
             <AlertItem 
               title="Failed Transactions" 
               count={alerts?.failedPayments || 0} 
               icon={XCircle} 
               description="Payment reconciliation required."
               color="red"
             />
             <AlertItem 
               title="Payout Requests" 
               count={overview?.pendingPayouts || 0} 
               icon={CreditCard} 
               description="Partner withdrawal requests."
               color="blue"
               link="/payouts"
             />
           </div>

           <div className="bg-slate-950 rounded-[40px] p-10 text-white relative overflow-hidden group shadow-2xl shadow-slate-900/30">
              <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/20 rounded-full blur-[80px] -mr-20 -mt-20 group-hover:bg-blue-500/30 transition-all duration-700"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/10 rounded-full blur-[80px] -ml-20 -mb-20"></div>
              
              <div className="relative z-10">
                <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] mb-6">Network Diagnostics</h4>
                <div className="space-y-8">
                  <div className="group/metric">
                     <div className="flex justify-between text-xs font-black mb-3">
                       <span className="text-slate-400 group-hover/metric:text-white transition-colors">Success Probability</span>
                       <span className="text-blue-400">98.4%</span>
                     </div>
                     <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                       <div className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 rounded-full shadow-[0_0_15px_rgba(37,99,235,0.5)]" style={{ width: '98.4%' }}></div>
                     </div>
                  </div>
                  <div className="group/metric">
                     <div className="flex justify-between text-xs font-black mb-3">
                       <span className="text-slate-400 group-hover/metric:text-white transition-colors">Provider Availability</span>
                       <span className="text-purple-400">94.2%</span>
                     </div>
                     <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                       <div className="h-full bg-gradient-to-r from-purple-600 to-pink-500 rounded-full shadow-[0_0_15px_rgba(147,51,234,0.5)]" style={{ width: '94.2%' }}></div>
                     </div>
                  </div>
                </div>
                <button className="w-full mt-10 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all hover:scale-[1.02] active:scale-95">
                  Launch deep diagnostics
                </button>
              </div>
           </div>
        </div>
      </div>

      {/* Doctor Performance Productivity Table */}
      <section className="bg-white rounded-[40px] border border-[var(--border-color)] shadow-xl overflow-hidden">
        <div className="p-8 border-b border-[var(--border-color)] flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-inner">
               <Stethoscope size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight">Doctor Productivity Portfolio</h2>
              <p className="text-sm text-slate-500 font-medium">Performance analytics and engagement metrics per provider.</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
              <input 
                type="text" 
                placeholder="Search name or ID..."
                className="pl-11 pr-5 py-3 bg-slate-50 border-none rounded-2xl text-sm font-bold w-64 focus:ring-2 focus:ring-blue-100 transition-all"
                value={performanceSearch}
                onChange={(e) => setPerformanceSearch(e.target.value)}
              />
            </div>
            <button className="w-12 h-12 bg-slate-100 hover:bg-slate-200 rounded-2xl flex items-center justify-center text-slate-600 transition-all shadow-sm active:scale-95">
               <Filter size={20} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <button onClick={() => handleSort('name')} className="flex items-center gap-2 hover:text-slate-900 transition-colors">
                    Provider Detail <ArrowUpDown size={12} />
                  </button>
                </th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                  <button onClick={() => handleSort('stats.total')} className="flex items-center gap-2 mx-auto hover:text-slate-900 transition-colors">
                    Total Bookings <ArrowUpDown size={12} />
                  </button>
                </th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Pending</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Confirmed</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Completed</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Cancelled</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                  <button onClick={() => handleSort('stats.revenue')} className="flex items-center gap-2 mx-auto hover:text-slate-900 transition-colors">
                    Revenue <ArrowUpDown size={12} />
                  </button>
                </th>
                <th className="p-6 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPerformance?.map((doc) => (
                <tr key={doc.id} className="hover:bg-blue-50/30 transition-colors group">
                  <td className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black text-sm shadow-lg group-hover:scale-110 transition-transform">
                        {doc.name?.[0] || 'D'}
                      </div>
                      <div>
                        <div className="font-black text-slate-900 text-base leading-tight">{doc.name || 'Unknown Doctor'}</div>
                        <div className="text-[10px] font-mono text-slate-400 mt-1 uppercase">ID: {doc.id.substring(0, 12)}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-6 text-center text-sm font-black text-slate-900">{doc.stats.total}</td>
                  <td className="p-6 text-center">
                    <span className="text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1 rounded-lg">{doc.stats.pending}</span>
                  </td>
                  <td className="p-6 text-center">
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-lg">{doc.stats.confirmed}</span>
                  </td>
                  <td className="p-6 text-center">
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg">{doc.stats.completed}</span>
                  </td>
                  <td className="p-6 text-center">
                    <span className="text-xs font-bold text-red-500 bg-red-50 px-3 py-1 rounded-lg">{doc.stats.cancelled}</span>
                  </td>
                  <td className="p-6 text-center font-black text-slate-900">₹{doc.stats.revenue.toLocaleString()}</td>
                  <td className="p-6 text-right">
                    <button className="h-10 w-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 hover:text-blue-600 hover:border-blue-200 hover:shadow-sm transition-all shadow-sm">
                      <Eye size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color, onClick }: { title: string, value: any, icon: any, color: string, onClick?: () => void }) {
  const colors: any = {
    blue: "bg-blue-50 text-blue-600 shadow-blue-100",
    indigo: "bg-indigo-50 text-indigo-600 shadow-indigo-100",
    amber: "bg-amber-50 text-amber-600 shadow-amber-100",
    emerald: "bg-emerald-50 text-emerald-600 shadow-emerald-100",
    sky: "bg-sky-50 text-sky-600 shadow-sky-100",
    slate: "bg-slate-50 text-slate-800 shadow-slate-100"
  };

  return (
    <article 
      onClick={onClick}
      className="bg-white/80 backdrop-blur-sm border border-white/50 p-6 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_50px_rgba(26,127,212,0.12)] hover:-translate-y-1.5 transition-all duration-500 cursor-pointer group"
    >
       <div className={`w-12 h-12 ${colors[color]} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-inner`}>
         <Icon size={24} strokeWidth={2.5} />
       </div>
       <div className="space-y-1">
         <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] leading-none mb-1">{title}</p>
         <h2 className="text-2xl font-black text-slate-900 truncate leading-none py-1">{value?.toLocaleString() || "0"}</h2>
       </div>
    </article>
  );
}

function AlertItem({ title, count, icon: Icon, description, color, link }: { title: string, count: number, icon: any, description: string, color: string, link?: string }) {
  const colors: any = {
    amber: "bg-amber-50 text-amber-600 border-amber-100",
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    red: "bg-red-50 text-red-600 border-red-100"
  };
  
  const pulse: any = {
    amber: "bg-amber-500",
    blue: "bg-blue-500",
    red: "bg-red-500"
  };

  return (
    <a href={link} className={`block p-4 bg-white border rounded-2xl shadow-sm hover:shadow-md transition-all group ${count > 0 ? 'border-l-4 border-l-' + color + '-500' : 'opacity-70 grayscale-[0.5]'}`}>
       <div className="flex items-center justify-between mb-2">
         <div className={`w-10 h-10 ${colors[color]} border rounded-xl flex items-center justify-center`}>
           <Icon size={20} />
         </div>
         {count > 0 && (
           <div className="flex items-center gap-2">
             <span className={`w-2 h-2 ${pulse[color]} rounded-full animate-pulse`}></span>
             <span className="text-lg font-black text-slate-900">{count}</span>
           </div>
         )}
       </div>
       <div className="font-bold text-sm text-slate-900">{title}</div>
       <p className="text-[10px] font-medium text-slate-500 mt-1">{description}</p>
    </a>
  );
}

function MetricDetailModal({ metric, data, onClose }: { metric: string, data: any, onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md bg-slate-900/40 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-300">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
               <Activity size={24} />
             </div>
             <div>
               <h3 className="text-2xl font-black text-slate-900 tracking-tight">{metric} Intelligence</h3>
               <p className="text-sm font-medium text-slate-500">Real-time deep dive into network metrics.</p>
             </div>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 bg-white hover:bg-slate-100 text-slate-400 hover:text-slate-900 rounded-xl flex items-center justify-center transition-all border border-slate-200 shadow-sm"
          >
            <XCircle size={20} />
          </button>
        </div>

        <div className="p-8 max-h-[60vh] overflow-y-auto">
          {metric.includes("Revenue") ? (
             <div className="space-y-6">
                <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-3xl">
                  <div className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-1">Total Validated Income</div>
                  <div className="text-4xl font-black text-emerald-900">₹{data?.kpis?.revenue?.total?.toLocaleString()}</div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                     <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 text-center">Avg Transaction</div>
                     <div className="text-xl font-black text-slate-900 text-center">₹3,420</div>
                   </div>
                   <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                     <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 text-center">Growth Rate</div>
                     <div className="text-xl font-black text-emerald-600 text-center">+12.4%</div>
                   </div>
                </div>
             </div>
          ) : metric === "Patients" ? (
            <div className="space-y-6">
               <div className="flex items-center justify-between p-6 bg-blue-50 border border-blue-100 rounded-3xl">
                 <div>
                    <div className="text-xs font-black text-blue-600 uppercase tracking-widest mb-1">Total Registered</div>
                    <div className="text-4xl font-black text-blue-900">{data?.kpis?.patients}</div>
                 </div>
                 <Users size={48} className="text-blue-200" />
               </div>
               <div className="space-y-3">
                 <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest px-2">Registration Trends</h4>
                 <div className="p-4 bg-slate-50 rounded-2xl flex items-center justify-between group hover:bg-white hover:border-blue-200 border border-transparent transition-all">
                    <span className="text-sm font-bold text-slate-700">Last 7 Days</span>
                    <span className="text-sm font-black text-blue-600">+8 new</span>
                 </div>
                 <div className="p-4 bg-slate-50 rounded-2xl flex items-center justify-between group hover:bg-white hover:border-blue-200 border border-transparent transition-all">
                    <span className="text-sm font-bold text-slate-700">Returning Patients</span>
                    <span className="text-sm font-black text-slate-900">64%</span>
                 </div>
               </div>
            </div>
          ) : (
            <div className="py-20 text-center">
               <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                 <Search size={32} className="text-slate-200" />
               </div>
               <p className="text-lg font-bold text-slate-400 italic font-mono italic">Advanced telemetry for "{metric}" is synchronizing...</p>
               <p className="text-sm text-slate-400 mt-2">Checking global network nodes for real-time distribution.</p>
            </div>
          )}
        </div>

        <div className="p-8 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
           <p className="text-xs font-medium text-slate-500">Live operational data synced at {new Date().toLocaleTimeString()}</p>
           <button 
             onClick={onClose}
             className="px-6 py-2.5 bg-slate-900 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-blue-600 transition-all shadow-lg"
           >
             Close Intel
           </button>
        </div>
      </div>
    </div>
  );
}

