import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Clock, CheckCircle2, XCircle, Calendar, CreditCard, Search, Eye, Check, CheckCheck, X, Filter, ChevronDown, RefreshCw } from "lucide-react";

interface ServiceBooking {
    _id: string;
    patientId: { name: string; mobile: string };
    serviceId: { name: string };
    status: "Pending" | "Confirmed" | "Completed" | "Cancelled";
    paymentStatus: "PENDING" | "COMPLETED" | "FAILED";
    totalAmount: number;
    createdAt: string;
    fulfillmentMode: "HOME_VISIT" | "HOSPITAL_VISIT" | "VIRTUAL";
    date?: string;
    startingTime?: string;
    notes?: string;
}

export function OPBookingsPage() {
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [selectedBooking, setSelectedBooking] = useState<ServiceBooking | null>(null);

    // Advanced Filters State
    const [showFilters, setShowFilters] = useState(false);
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [paymentFilter, setPaymentFilter] = useState("All");
    const [sourceFilter, setSourceFilter] = useState("All");
    const [patientTypeFilter, setPatientTypeFilter] = useState("All");
    const [doctorFilter, setDoctorFilter] = useState("All");
    const [departmentFilter, setDepartmentFilter] = useState("All");
    const [slotFilter, setSlotFilter] = useState("All");

    // Fetching Bookings
    const { data: serviceBookings, isLoading: loadingServices } = useQuery({
        queryKey: ["admin_service_bookings", searchQuery, dateFrom, dateTo, paymentFilter, sourceFilter, patientTypeFilter, doctorFilter, departmentFilter, slotFilter],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (searchQuery) params.append("search", searchQuery);
            if (dateFrom) params.append("dateFrom", dateFrom);
            if (dateTo) params.append("dateTo", dateTo);
            if (paymentFilter !== "All") params.append("payment", paymentFilter);
            if (sourceFilter !== "All") params.append("source", sourceFilter);
            if (departmentFilter !== "All") params.append("department", departmentFilter);

            const res = await api.get(`/admin/bookings/services?${params.toString()}`);
            return res.data.data as ServiceBooking[];
        }
    });

    const { data: categories } = useQuery({
        queryKey: ["admin_categories"],
        queryFn: async () => {
            const res = await api.get("/services");
            return res.data.data as { _id: string, name: string, type?: string }[];
        }
    });

    const updateStatusMutation = useMutation({
        mutationFn: async ({ id, status }: { id: string, status: string }) => {
            const endpoint = `/admin/bookings/services/${id}/status`;
            const res = await api.put(endpoint, { status });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin_service_bookings"] });
        }
    });

    const handleUpdateStatus = (id: string, status: string) => {
        updateStatusMutation.mutate({ id, status });
    };

    if (loadingServices) return (
        <div className="flex flex-col items-center justify-center p-20 space-y-4">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <p className="font-bold text-[var(--text-muted)] animate-pulse">Syncing operations desk...</p>
        </div>
    );

    // Initial filter for OP Tokens only
    const allTokens = serviceBookings?.filter(b => b.fulfillmentMode === "HOSPITAL_VISIT") || [];

    // Calculate counts from the UNFILTERED set (allTokens)
    const allCount = allTokens.length;
    const pendingCount = allTokens.filter(b => b.status?.toUpperCase() === "PENDING" || b.status?.toUpperCase() === "RETURNED_TO_ADMIN").length;
    const confirmedCount = allTokens.filter(b => b.status?.toUpperCase() === "CONFIRMED").length;
    const completedCount = allTokens.filter(b => b.status?.toUpperCase() === "COMPLETED").length;
    const cancelledCount = allTokens.filter(b => b.status?.toUpperCase() === "CANCELLED").length;

    // Filter displayed tokens based on selected statusFilter
    const filteredTokens = statusFilter === "All" 
        ? allTokens 
        : allTokens.filter(b => {
            const s = b.status?.toUpperCase();
            if (statusFilter === "PENDING") return s === "PENDING" || s === "RETURNED_TO_ADMIN";
            return s === statusFilter;
        });

    const statsCards = [
        { label: "All", count: allCount, value: "All" },
        { label: "Pending", count: pendingCount, value: "PENDING" },
        { label: "Confirmed", count: confirmedCount, value: "CONFIRMED" },
        { label: "Completed", count: completedCount, value: "COMPLETED" },
        { label: "Cancelled", count: cancelledCount, value: "CANCELLED" },
    ];

    return (
        <div className="space-y-6 animate-in">
            <header className="flex flex-col gap-2 bg-[var(--card-bg)] p-6 md:p-8 rounded-2xl shadow-sm border border-[var(--border-color)] relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-2xl md:text-3xl font-black tracking-tight text-[var(--text-main)] mb-1">OP Token Orders</h1>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        <p className="text-xs md:text-sm font-medium text-[var(--text-muted)] tracking-wide">Home • Bookings • OP Token Orders</p>
                    </div>
                </div>
                {/* Decorative background element reminiscent of the user's screenshot */}
                <div className="absolute -bottom-24 -right-12 w-64 h-64 bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -top-12 right-32 w-48 h-48 bg-purple-500/5 dark:bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />
            </header>

            {/* Stat Cards Row */}
            <div className="flex flex-wrap gap-4">
                {statsCards.map((stat) => (
                    <button
                        key={stat.value}
                        onClick={() => setStatusFilter(stat.value)}
                        className={`group flex-1 min-w-[140px] flex flex-col items-center justify-center py-5 px-4 rounded-2xl border transition-all duration-300 ${statusFilter === stat.value
                            ? "bg-[var(--card-bg)] border-[var(--text-main)] shadow-md ring-1 ring-[var(--text-main)] scale-[1.02]"
                            : "bg-[var(--card-bg)] border-[var(--border-color)] hover:border-[var(--text-muted)] shadow-sm"
                            }`}
                    >
                        <span className={`text-[32px] md:text-[40px] leading-none font-black mb-1 transition-colors ${statusFilter === stat.value ? "text-[var(--text-main)]" : "text-[var(--text-main)]"}`}>
                            {stat.count}
                        </span>
                        <span className={`text-xs font-semibold capitalize tracking-wide ${statusFilter === stat.value ? "text-[var(--text-main)]" : "text-[var(--text-muted)] group-hover:text-[var(--text-main)]"}`}>
                            {stat.label}
                        </span>
                    </button>
                ))}
            </div>

            {/* Filters Row */}
            <div className="flex flex-row items-center gap-4">
                <div className="relative flex-1">
                    <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Search by Order ID, Service..."
                        className="w-full pr-4 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl h-12 text-sm focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-500/20 outline-none text-[var(--text-main)] transition-shadow shadow-sm"
                        style={{ paddingLeft: '2.75rem' }}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="relative w-[180px] shrink-0">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full h-12 pl-4 pr-10 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl text-sm font-semibold text-[var(--text-main)] outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-500/20 appearance-none shadow-sm cursor-pointer"
                    >
                        {statsCards.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-muted)]">▼</div>
                </div>

                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`h-12 px-5 flex items-center justify-center gap-2 rounded-xl text-sm font-bold transition-all shadow-sm ${showFilters ? 'bg-blue-600 text-white border-blue-600' : 'bg-[var(--card-bg)] border border-[var(--border-color)] text-[var(--text-main)] hover:bg-[var(--bg-main)]'}`}
                >
                    <Filter size={16} />
                    <span className="hidden sm:inline">Filters</span>
                </button>
            </div>

            {/* Advanced Filters Panel */}
            {showFilters && (
                <div className="bg-[var(--card-bg)] p-6 rounded-2xl border border-[var(--border-color)] shadow-sm animate-in slide-in-from-top-4 fade-in duration-200">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-black uppercase tracking-widest text-[var(--text-muted)]">Advanced Filters</h3>
                        <button
                            onClick={() => {
                                setDateFrom(""); setDateTo(""); setPaymentFilter("All");
                                setSourceFilter("All"); setDoctorFilter("All"); setDepartmentFilter("All");
                                setPatientTypeFilter("All"); setSlotFilter("All");
                            }}
                            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                        >
                            <RefreshCw size={12} /> Reset All
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Date Range */}
                        <div className="col-span-1 lg:col-span-2 grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1.5 ml-1">From Date</label>
                                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full h-11 px-4 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100 text-[var(--text-main)]" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1.5 ml-1">To Date</label>
                                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full h-11 px-4 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100 text-[var(--text-main)]" />
                            </div>
                        </div>

                        {/* Payment Status */}
                        <div>
                            <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1.5 ml-1">Payment</label>
                            <select value={paymentFilter} onChange={e => setPaymentFilter(e.target.value)} className="w-full h-11 px-4 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100 text-[var(--text-main)]">
                                <option value="All">All Statuses</option>
                                <option value="COMPLETED">Paid</option>
                                <option value="PENDING">Pending</option>
                                <option value="FAILED">Failed</option>
                            </select>
                        </div>

                        {/* Doctor */}
                        <div>
                            <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1.5 ml-1">Doctor Assigned</label>
                            <select value={doctorFilter} onChange={e => setDoctorFilter(e.target.value)} className="w-full h-11 px-4 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100 text-[var(--text-main)]">
                                <option value="All">All Doctors</option>
                                <option value="Unassigned">Unassigned</option>
                            </select>
                        </div>

                        {/* Department */}
                        <div>
                            <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1.5 ml-1">Department Specialization</label>
                            <select value={departmentFilter} onChange={e => setDepartmentFilter(e.target.value)} className="w-full h-11 px-4 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100 text-[var(--text-main)]">
                                <option value="All">All Departments</option>
                                {categories?.filter(c => c.type === 'doctor' || c.name.toLowerCase().includes('doctor')).map(c => (
                                    <option key={c._id} value={c.name}>{c.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Slot Time */}
                        <div>
                            <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1.5 ml-1">Slot Time</label>
                            <select value={slotFilter} onChange={e => setSlotFilter(e.target.value)} className="w-full h-11 px-4 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100 text-[var(--text-main)]">
                                <option value="All">All Slots</option>
                                <option value="Morning">Morning (8AM - 12PM)</option>
                                <option value="Afternoon">Afternoon (12PM - 4PM)</option>
                                <option value="Evening">Evening (4PM - 8PM)</option>
                            </select>
                        </div>

                        {/* Booking Source */}
                        <div>
                            <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1.5 ml-1">Source</label>
                            <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)} className="w-full h-11 px-4 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100 text-[var(--text-main)]">
                                <option value="All">All Sources</option>
                                <option value="App">Mobile App</option>
                                <option value="Walk-in">Walk-in</option>
                                <option value="Admin">Admin Portal</option>
                            </select>
                        </div>

                        {/* Patient Type */}
                        <div>
                            <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1.5 ml-1">Patient Type</label>
                            <select value={patientTypeFilter} onChange={e => setPatientTypeFilter(e.target.value)} className="w-full h-11 px-4 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100 text-[var(--text-main)]">
                                <option value="All">All Types</option>
                                <option value="New">New Patient</option>
                                <option value="Returning">Returning Patient</option>
                            </select>
                        </div>
                    </div>
                </div>
            )}

            {/* Data Table */}
            <div className="bg-[var(--card-bg)] rounded-3xl border border-[var(--border-color)] overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[1000px]">
                        <thead>
                            <tr className="bg-[var(--bg-main)] border-b border-[var(--border-color)] text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-black">
                                <th className="py-5 px-6 whitespace-nowrap w-[60px]">Sl No</th>
                                <th className="py-5 px-6 whitespace-nowrap">Order ID</th>
                                <th className="py-5 px-6 whitespace-nowrap min-w-[200px]">Service</th>
                                <th className="py-5 px-6 whitespace-nowrap">Customer</th>
                                <th className="py-5 px-6 whitespace-nowrap">Date & Time</th>
                                <th className="py-5 px-6 whitespace-nowrap">Status</th>
                                <th className="py-5 px-6 whitespace-nowrap">Amount</th>
                                <th className="py-5 px-6 whitespace-nowrap text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-color)]">
                            {filteredTokens.length > 0 ? (
                                filteredTokens.map((booking, index) => {
                                    const isPending = booking.status?.toUpperCase() === "PENDING" || booking.status?.toUpperCase() === "RETURNED_TO_ADMIN";
                                    const isConfirmed = booking.status?.toUpperCase() === "CONFIRMED";
                                    return (
                                        <tr key={booking._id} className="hover:bg-blue-50/50 dark:hover:bg-blue-500/5 transition-colors group">
                                            <td className="py-5 px-6 text-sm font-black text-[var(--text-muted)]">
                                                {String(index + 1).padStart(2, '0')}
                                            </td>
                                            <td className="py-5 px-6">
                                                <div className="text-sm font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-2 py-1 rounded inline-block">
                                                    #{booking._id.slice(-8).toUpperCase()}
                                                </div>
                                            </td>
                                            <td className="py-5 px-6">
                                                <div className="text-sm font-bold text-[var(--text-main)] truncate max-w-[250px]" title={booking.serviceId?.name}>
                                                    {booking.serviceId?.name}
                                                </div>
                                            </td>
                                            <td className="py-5 px-6">
                                                <div className="text-sm font-semibold text-[var(--text-main)]">
                                                    {booking.patientId?.name || "Guest User"}
                                                </div>
                                                <div className="text-[11px] font-mono text-[var(--text-muted)] mt-0.5">
                                                    {booking.patientId?.mobile || "N/A"}
                                                </div>
                                            </td>
                                            <td className="py-5 px-6">
                                                <div className="text-sm font-medium text-[var(--text-main)] whitespace-nowrap">
                                                    {new Date(booking.date || booking.createdAt).toLocaleDateString()}
                                                </div>
                                                <div className="text-[11px] font-black uppercase tracking-wider text-[var(--text-muted)] mt-0.5 whitespace-nowrap">
                                                    {booking.startingTime || new Date(booking.createdAt).toLocaleTimeString()}
                                                </div>
                                            </td>
                                            <td className="py-5 px-6 whitespace-nowrap">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest
                                                    ${booking.status?.toUpperCase() === 'PENDING' ? 'text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-500/10' : ''}
                                                    ${booking.status?.toUpperCase() === 'RETURNED_TO_ADMIN' ? 'text-rose-600 bg-rose-50 dark:text-rose-400 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20' : ''}
                                                    ${booking.status?.toUpperCase() === 'CONFIRMED' ? 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-500/10' : ''}
                                                    ${booking.status?.toUpperCase() === 'COMPLETED' ? 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-500/10' : ''}
                                                    ${booking.status?.toUpperCase() === 'CANCELLED' ? 'text-[var(--text-muted)] bg-[var(--bg-main)]' : ''}
                                                `}>
                                                    {booking.status?.replace(/_/g, ' ')}
                                                </span>
                                            </td>
                                            <td className="py-5 px-6">
                                                <div className={`text-sm font-black whitespace-nowrap ${booking.paymentStatus === 'COMPLETED' ? 'text-green-600 dark:text-green-400' : 'text-[var(--text-main)]'}`}>
                                                    ₹{booking.totalAmount}
                                                </div>
                                                <div className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider mt-0.5">
                                                    {booking.paymentStatus}
                                                </div>
                                            </td>
                                            <td className="py-5 px-6 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => setSelectedBooking(booking)}
                                                        className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-500 dark:hover:text-white flex items-center justify-center transition-all border border-blue-200 dark:border-blue-500/20 shadow-sm" title="View Details">
                                                        <Eye size={16} />
                                                    </button>

                                                    <button
                                                        disabled={!isPending}
                                                        onClick={() => handleUpdateStatus(booking._id, "CONFIRMED")}
                                                        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all border shadow-sm
                                                            ${isPending
                                                                ? "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-600 hover:text-white dark:hover:bg-amber-500 dark:hover:text-white border-amber-200 dark:border-amber-500/20"
                                                                : "bg-slate-50 dark:bg-slate-800/50 text-slate-300 dark:text-slate-600 border-slate-100 dark:border-slate-800 cursor-not-allowed opacity-50"
                                                            }`}
                                                        title="Confirm Token"
                                                    >
                                                        <Check size={16} />
                                                    </button>

                                                    <button
                                                        disabled={!(isConfirmed || isPending)}
                                                        onClick={() => handleUpdateStatus(booking._id, "COMPLETED")}
                                                        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all border shadow-sm
                                                            ${(isConfirmed || isPending)
                                                                ? "bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-600 hover:text-white dark:hover:bg-green-500 dark:hover:text-white border-green-200 dark:border-green-500/20"
                                                                : "bg-slate-50 dark:bg-slate-800/50 text-slate-300 dark:text-slate-600 border-slate-100 dark:border-slate-800 cursor-not-allowed opacity-50"
                                                            }`}
                                                        title="Complete Token"
                                                    >
                                                        <CheckCheck size={16} />
                                                    </button>

                                                    <button
                                                        disabled={booking.status?.toUpperCase() === "CANCELLED" || booking.status?.toUpperCase() === "COMPLETED"}
                                                        onClick={() => handleUpdateStatus(booking._id, "CANCELLED")}
                                                        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all border shadow-sm
                                                            ${(booking.status?.toUpperCase() !== "CANCELLED" && booking.status?.toUpperCase() !== "COMPLETED")
                                                                ? "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white dark:hover:bg-red-500 dark:hover:text-white border-red-200 dark:border-red-500/20"
                                                                : "bg-slate-50 dark:bg-slate-800/50 text-slate-300 dark:text-slate-600 border-slate-100 dark:border-slate-800 cursor-not-allowed opacity-50"
                                                            }`}
                                                        title="Cancel Token"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={8} className="py-24 text-center">
                                        <div className="w-20 h-20 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-full flex items-center justify-center mx-auto mb-5 shadow-sm">
                                            <Calendar size={32} className="text-[var(--text-muted)]" />
                                        </div>
                                        <h3 className="text-xl font-black tracking-tight text-[var(--text-main)]">No active OP Tokens</h3>
                                        <p className="text-[var(--text-muted)] mt-2 max-w-sm mx-auto text-sm font-medium">No hospital tokens match your current filters. Try changing your search query or status filter.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Popup */}
            {selectedBooking && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-5 border-b border-[var(--border-color)] bg-[var(--bg-main)]">
                            <div>
                                <h3 className="text-lg font-black text-[var(--text-main)] leading-none">Token Details</h3>
                                <p className="text-xs font-semibold text-[var(--text-muted)] font-mono mt-1">Ref: {selectedBooking._id.toUpperCase()}</p>
                            </div>
                            <button
                                onClick={() => setSelectedBooking(null)}
                                className="w-8 h-8 rounded-full bg-[var(--card-bg)] border border-[var(--border-color)] flex items-center justify-center text-[var(--text-muted)] hover:text-red-500 hover:border-red-200 transition-all shadow-sm"
                            >
                                <X size={16} />
                            </button>
                        </div>
                        <div className="p-6 space-y-6">
                            {/* Info Grid */}
                            <div className="grid grid-cols-2 gap-y-5 gap-x-4">
                                <div>
                                    <p className="text-[10px] uppercase font-black tracking-widest text-[var(--text-muted)] mb-1">Patient</p>
                                    <p className="text-sm font-bold text-[var(--text-main)]">{selectedBooking.patientId?.name || "Guest User"}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-black tracking-widest text-[var(--text-muted)] mb-1">Mobile</p>
                                    <p className="text-sm font-bold text-[var(--text-main)]">{selectedBooking.patientId?.mobile || "N/A"}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-black tracking-widest text-[var(--text-muted)] mb-1">Service</p>
                                    <p className="text-sm font-bold text-[var(--text-main)]">{selectedBooking.serviceId?.name}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-black tracking-widest text-[var(--text-muted)] mb-1">Fulfillment</p>
                                    <p className="text-xs font-bold bg-[var(--bg-main)] border border-[var(--border-color)] text-[var(--text-main)] px-2.5 py-1 rounded-md inline-block">{selectedBooking.fulfillmentMode?.replace("_", " ")}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-black tracking-widest text-[var(--text-muted)] mb-1">Date & Time</p>
                                    <p className="text-sm font-bold text-[var(--text-main)]">{new Date(selectedBooking.date || selectedBooking.createdAt).toLocaleDateString()}</p>
                                    <p className="text-xs font-semibold text-[var(--text-muted)] mt-0.5">{selectedBooking.startingTime || new Date(selectedBooking.createdAt).toLocaleTimeString()}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-black tracking-widest text-[var(--text-muted)] mb-1">Status</p>
                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest
                                        ${selectedBooking.status === 'Pending' ? 'text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-500/10' : ''}
                                        ${selectedBooking.status === 'Confirmed' ? 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-500/10' : ''}
                                        ${selectedBooking.status === 'Completed' ? 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-500/10' : ''}
                                        ${selectedBooking.status === 'Cancelled' ? 'text-[var(--text-muted)] bg-[var(--bg-main)] border border-[var(--border-color)]' : ''}
                                    `}>
                                        {selectedBooking.status}
                                    </span>
                                </div>
                            </div>

                            <hr className="border-[var(--border-color)]" />

                            <div className="flex items-center justify-between bg-[var(--bg-main)] p-4 rounded-xl border border-[var(--border-color)]">
                                <div>
                                    <p className="text-[10px] uppercase font-black tracking-widest text-[var(--text-muted)] mb-0.5">Total Amount</p>
                                    <p className="text-xl font-black text-blue-600 dark:text-blue-400">₹{selectedBooking.totalAmount}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] uppercase font-black tracking-widest text-[var(--text-muted)] mb-1.5">Payment Status</p>
                                    <p className={`text-[11px] font-black uppercase tracking-widest px-2.5 py-1 inline-block rounded-md ${selectedBooking.paymentStatus === 'COMPLETED' ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-[var(--card-bg)] border border-[var(--border-color)] text-[var(--text-muted)]'}`}>{selectedBooking.paymentStatus}</p>
                                </div>
                            </div>

                            {selectedBooking.notes && (
                                <div className="bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 p-4 rounded-xl">
                                    <p className="text-[10px] uppercase font-black tracking-widest text-yellow-800 dark:text-yellow-500 mb-1">Notes / Reason</p>
                                    <p className="text-xs font-semibold text-yellow-900 dark:text-yellow-100">{selectedBooking.notes}</p>
                                </div>
                            )}

                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
