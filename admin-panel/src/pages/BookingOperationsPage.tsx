import { useState, useDeferredValue } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Clock, CheckCircle2, XCircle, User, Calendar, MapPin, CreditCard, Briefcase, ChevronRight, Search, Filter, Eye, Check, CheckCheck, X, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface BaseBooking {
    _id: string;
    patientId: { name: string; mobile: string };
    status: "Pending" | "Confirmed" | "Completed" | "Cancelled";
    paymentStatus: "PENDING" | "COMPLETED" | "FAILED";
    totalAmount: number;
    createdAt: string;
    notes?: string;
}

interface DoctorBooking extends BaseBooking {
    doctorId: { name: string; specialization: string[] };
    startingTime: string;
    date: string;
}

interface ServiceBooking extends BaseBooking {
    serviceId: { name: string };
    fulfillmentMode: "HOME_VISIT" | "HOSPITAL_VISIT" | "VIRTUAL";
    location?: string;
}

interface HospitalBooking extends BaseBooking {
    bookingType: 'doctor' | 'service';
    serviceName: string;
}

export function BookingOperationsPage() {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<"doctors" | "services" | "hospital">("doctors");
    const [searchQuery, setSearchQuery] = useState("");

    const [statusFilter, setStatusFilter] = useState("All");
    const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
    const [viewModalOpen, setViewModalOpen] = useState(false);
    
    // Defer search to prevent lag
    const deferredSearch = useDeferredValue(searchQuery);

    // Advanced Filters State
    const [showFilters, setShowFilters] = useState(false);
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [paymentFilter, setPaymentFilter] = useState("All");
    const [departmentFilter, setDepartmentFilter] = useState("All");
    const [serviceFilter, setServiceFilter] = useState("All");

    // Fetching Bookings
    const { data: doctorBookings, isLoading: loadingDocs } = useQuery({
        queryKey: ["admin_doctor_bookings"],
        queryFn: async () => {
            const res = await api.get("/admin/bookings/doctors");
            return res.data.data as DoctorBooking[];
        }
    });

    const { data: serviceBookings, isLoading: loadingServices } = useQuery({
        queryKey: ["admin_service_bookings"],
        queryFn: async () => {
            const res = await api.get("/admin/bookings/services");
            return res.data.data as ServiceBooking[];
        }
    });

    const { data: hospitalBookings, isLoading: loadingHospital } = useQuery({
        queryKey: ["admin_hospital_bookings"],
        queryFn: async () => {
            const res = await api.get("/admin/bookings/hospital");
            return res.data.data.map((b: any) => ({
                ...b,
                status: b.status || "Confirmed",
                patientId: b.patientId || { name: "Unknown", mobile: "N/A" }
            })) as HospitalBooking[];
        }
    });

    const { data: categories } = useQuery({
        queryKey: ["admin_categories"],
        queryFn: async () => {
            const res = await api.get("/services");
            return res.data.data as { _id: string, name: string, type?: string }[];
        }
    });

    const { data: doctorsList } = useQuery({
        queryKey: ["admin_doctors_list"],
        queryFn: async () => {
            const res = await api.get("/admin/doctors");
            return res.data.data as { _id: string; name: string; mobileNumber?: string }[];
        }
    });

    const doctorCategory = categories?.find(c => c.type === 'doctor' || c.name.toLowerCase().includes('doctor'));

    const { data: doctorSubServices } = useQuery({
        queryKey: ["admin_subservices", doctorCategory?._id],
        queryFn: async () => {
            if (!doctorCategory?._id) return [];
            const res = await api.get(`/subservice/${doctorCategory._id}`);
            return res.data.data as { _id: string, name: string }[];
        },
        enabled: !!doctorCategory?._id
    });

    const [subServiceFilter, setSubServiceFilter] = useState("All");
    const [acceptServiceModal, setAcceptServiceModal] = useState<{ bookingId: string; booking: any } | null>(null);
    const [selectedHospitalId, setSelectedHospitalId] = useState("");

    const updateStatusMutation = useMutation({
        mutationFn: async ({ id, type, status, assignedProviderId }: { id: string, type: "doctor" | "service", status: string; assignedProviderId?: string }) => {
            const endpoint = type === "doctor" ? `/admin/bookings/doctors/${id}/status` : `/admin/bookings/services/${id}/status`;
            const body: { status: string; assignedProviderId?: string } = { status };
            if (assignedProviderId) body.assignedProviderId = assignedProviderId;
            const res = await api.put(endpoint, body);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin_doctor_bookings"] });
            queryClient.invalidateQueries({ queryKey: ["admin_service_bookings"] });
            queryClient.invalidateQueries({ queryKey: ["admin_hospital_bookings"] });
            setAcceptServiceModal(null);
            setSelectedHospitalId("");
        }
    });

    const handleUpdateStatus = (id: string, type: "doctor" | "service", status: string, assignedProviderId?: string) => {
        updateStatusMutation.mutate({ id, type, status, assignedProviderId });
    };

    const handleAcceptServiceWithHospital = () => {
        if (!acceptServiceModal || !selectedHospitalId) return;
        handleUpdateStatus(acceptServiceModal.bookingId, "service", "ACCEPTED", selectedHospitalId);
    };

    if (loadingDocs || loadingServices || loadingHospital) return (
        <div className="flex flex-col items-center justify-center p-20 space-y-4">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <p className="font-bold text-[var(--text-muted)] animate-pulse">Syncing operations desk...</p>
        </div>
    );

    const activeData = activeTab === "doctors" ? (doctorBookings || [])
        : activeTab === "services" ? (serviceBookings?.filter(b => b.fulfillmentMode !== "HOSPITAL_VISIT") || [])
            : (hospitalBookings || []);

    const allCount = activeData.length;
    const pendingCount = activeData.filter(b => {
        const s = b.status?.toUpperCase();
        return s === "PENDING" || s === "BROADCASTED" || s === "RETURNED_TO_ADMIN";
    }).length;
    const confirmedCount = activeData.filter(b => (b.status?.toUpperCase() === "CONFIRMED" || b.status?.toUpperCase() === "ACCEPTED")).length;
    const completedCount = activeData.filter(b => b.status?.toUpperCase() === "COMPLETED").length;
    const cancelledCount = activeData.filter(b => b.status?.toUpperCase() === "CANCELLED").length;

    const statsCards = [
        { label: "All", count: allCount, value: "All" },
        { label: "Pending", count: pendingCount, value: "PENDING" },
        { label: "Assigned", count: confirmedCount, value: "CONFIRMED" },
        { label: "Completed", count: completedCount, value: "COMPLETED" },
        { label: "Cancelled", count: cancelledCount, value: "CANCELLED" },
    ];

    const filteredHospital = hospitalBookings?.filter(b => {
        const query = deferredSearch.toLowerCase().replace("#", "");
        const matchesSearch = !query ||
            b.patientId?.name?.toLowerCase().includes(query) ||
            b.patientId?.mobile?.toLowerCase().includes(query) ||
            b.serviceName?.toLowerCase().includes(query) ||
            b._id.toLowerCase().includes(query);
            
        const matchesStatus = statusFilter === "All" || b.status?.toUpperCase() === statusFilter || (statusFilter === "CONFIRMED" && (b.status?.toUpperCase() === "ACCEPTED" || b.status?.toUpperCase() === "IN_PROGRESS")) || (statusFilter === "PENDING" && (b.status?.toUpperCase() === "BROADCASTED" || b.status?.toUpperCase() === "RETURNED_TO_ADMIN"));

        const bDate = new Date(b.createdAt).getTime();
        const matchesDateFrom = !dateFrom || bDate >= new Date(dateFrom).getTime();
        const matchesDateTo = !dateTo || bDate <= (new Date(dateTo).getTime() + 86399999);
        const matchesPayment = paymentFilter === "All" || b.paymentStatus === paymentFilter;

        return matchesSearch && matchesStatus && matchesDateFrom && matchesDateTo && matchesPayment;
    });
    const filteredDocs = doctorBookings?.filter(b => {
        const query = deferredSearch.toLowerCase().replace("#", "");
        const matchesSearch = !query ||
            b.patientId?.name?.toLowerCase().includes(query) ||
            b.patientId?.mobile?.toLowerCase().includes(query) ||
            b.doctorId?.name?.toLowerCase().includes(query) ||
            b._id.toLowerCase().includes(query);
        
        const s = b.status?.toUpperCase();
        const matchesStatus = statusFilter === "All" || 
            s === statusFilter || 
            (statusFilter === "PENDING" && (s === "BROADCASTED" || s === "RETURNED_TO_ADMIN")) ||
            (statusFilter === "CONFIRMED" && (s === "ACCEPTED" || s === "IN_PROGRESS" || s === "CONFIRMED"));

        const bDate = new Date(b.date || b.createdAt).getTime();
        const matchesDateFrom = !dateFrom || bDate >= new Date(dateFrom).getTime();
        const matchesDateTo = !dateTo || bDate <= (new Date(dateTo).getTime() + 86399999);
        const matchesPayment = paymentFilter === "All" || b.paymentStatus === paymentFilter;
        const matchesSubService = subServiceFilter === "All" || b.doctorId?.specialization?.includes(subServiceFilter);

        return matchesSearch && matchesStatus && matchesDateFrom && matchesDateTo && matchesPayment && matchesSubService;
    });

    const filteredServices = serviceBookings?.filter(b => b.fulfillmentMode !== "HOSPITAL_VISIT")?.filter(b => {
        const query = deferredSearch.toLowerCase().replace("#", "");
        const matchesSearch = !query ||
            b.patientId?.name?.toLowerCase().includes(query) ||
            b.patientId?.mobile?.toLowerCase().includes(query) ||
            b.serviceId?.name?.toLowerCase().includes(query) ||
            b._id.toLowerCase().includes(query);
        
        const s = b.status?.toUpperCase();
        const matchesStatus = statusFilter === "All" || 
            s === statusFilter || 
            (statusFilter === "PENDING" && (s === "BROADCASTED" || s === "RETURNED_TO_ADMIN" || s === "RETURNED")) ||
            (statusFilter === "CONFIRMED" && (s === "ACCEPTED" || s === "IN_PROGRESS" || s === "CONFIRMED"));

        const bDate = new Date(b.createdAt).getTime();
        const matchesDateFrom = !dateFrom || bDate >= new Date(dateFrom).getTime();
        const matchesDateTo = !dateTo || bDate <= (new Date(dateTo).getTime() + 86399999);
        const matchesPayment = paymentFilter === "All" || b.paymentStatus === paymentFilter;
        const matchesServiceType = serviceFilter === "All" || b.serviceId?.name?.toLowerCase().includes(serviceFilter.toLowerCase());

        return matchesSearch && matchesStatus && matchesDateFrom && matchesDateTo && matchesPayment && matchesServiceType;
    });

    return (
        <div className="space-y-8 animate-in">
            <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-[var(--card-bg)] p-8 rounded-3xl shadow-sm border border-[var(--border-color)]">
                <div className="space-y-2">
                    <h1 className="text-3xl font-black tracking-tight text-[var(--text-main)]">Booking Desk</h1>
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-50 dark:bg-green-500/100 rounded-full animate-pulse"></span>
                        <p className="text-sm font-medium text-[var(--text-muted)] tracking-wide">LIVE OPERATIONS MONITOR</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center bg-[var(--bg-main)] p-1 rounded-2xl border border-[var(--border-color)]">
                        <div className="relative group min-w-[320px]">
                            <Search size={20} className="absolute text-[var(--text-muted)] group-focus-within:text-blue-500 transition-colors" style={{ left: '20px', top: '50%', transform: 'translateY(-50%)' }} />
                            <input
                                type="text"
                                placeholder="Search Patient name, ID or Mobile..."
                                className="w-full bg-transparent border-none text-sm font-semibold"
                                style={{ paddingLeft: '60px', height: '48px' }}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <button 
                            className="h-9 px-4 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all mr-1 shadow-sm"
                            onClick={() => toast.success(`Search telemetry synchronized for "${searchQuery}"`)}
                        >
                            Search
                        </button>
                    </div>

                    <div className="flex bg-[var(--bg-main)] p-1.5 rounded-2xl">
                        <button
                            onClick={() => setActiveTab("doctors")}
                            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${activeTab === "doctors" ? "bg-[var(--card-bg)] text-blue-600 dark:text-blue-400 shadow-sm scale-100" : "text-[var(--text-muted)] hover:text-[var(--text-main)]"}`}
                        >
                            Doctor Consults
                        </button>
                        <button
                            onClick={() => setActiveTab("services")}
                            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${activeTab === "services" ? "bg-[var(--card-bg)] text-blue-600 dark:text-blue-400 shadow-sm scale-100" : "text-[var(--text-muted)] hover:text-[var(--text-main)]"}`}
                        >
                            Service Tasks
                        </button>
                        <button
                            onClick={() => setActiveTab("hospital")}
                            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${activeTab === "hospital" ? "bg-[var(--card-bg)] text-blue-600 dark:text-blue-400 shadow-sm scale-100" : "text-[var(--text-muted)] hover:text-[var(--text-main)]"}`}
                        >
                            My Bookings
                        </button>
                    </div>

                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`h-12 px-5 flex items-center justify-center gap-2 rounded-xl text-sm font-bold transition-all shadow-sm ${showFilters ? 'bg-blue-600 text-white border-blue-600' : 'bg-[var(--bg-main)] border border-transparent text-[var(--text-main)] hover:border-[var(--border-color)]'}`}
                    >
                        <Filter size={16} />
                        <span className="hidden sm:inline">Filters</span>
                    </button>
                </div>
            </header>

            {/* Advanced Filters Panel */}
            {showFilters && (
                <div className="bg-[var(--card-bg)] p-6 rounded-2xl border border-[var(--border-color)] shadow-sm animate-in slide-in-from-top-4 fade-in duration-200">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-black uppercase tracking-widest text-[var(--text-muted)]">Advanced Filters</h3>
                        <button
                            onClick={() => {
                                setDateFrom(""); setDateTo(""); setPaymentFilter("All");
                                setDepartmentFilter("All"); setServiceFilter("All");
                                setSubServiceFilter("All");
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

                        {activeTab === "doctors" && (
                            <div>
                                <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1.5 ml-1">Sub-Specialization</label>
                                <select value={subServiceFilter} onChange={e => setSubServiceFilter(e.target.value)} className="w-full h-11 px-4 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100 text-[var(--text-main)]">
                                    <option value="All">All Specializations</option>
                                    {doctorSubServices?.map(sub => (
                                        <option key={sub._id} value={sub.name}>{sub.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {activeTab === "services" && (
                            <div>
                                <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1.5 ml-1">Service Node</label>
                                <select value={serviceFilter} onChange={e => setServiceFilter(e.target.value)} className="w-full h-11 px-4 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100 text-[var(--text-main)]">
                                    <option value="All">All Services</option>
                                    {categories?.map(c => (
                                        <option key={c._id} value={c.name}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                </div>
            )}

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

            <div className="bg-[var(--card-bg)] rounded-3xl border border-[var(--border-color)] overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[1000px]">
                        <thead>
                            <tr className="bg-[var(--bg-main)] border-b border-[var(--border-color)] text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-black">
                                <th className="py-5 px-6 whitespace-nowrap w-[60px]">Sl No</th>
                                <th className="py-5 px-6 whitespace-nowrap">Order ID</th>
                                <th className="py-5 px-6 whitespace-nowrap min-w-[200px]">
                                    {activeTab === "doctors" ? "Doctor" : activeTab === "services" ? "Service" : "Hospital Task"}
                                </th>
                                <th className="py-5 px-6 whitespace-nowrap">Patient Name</th>
                                <th className="py-5 px-6 whitespace-nowrap">Date & Time</th>
                                <th className="py-5 px-6 whitespace-nowrap">Status</th>
                                <th className="py-5 px-6 whitespace-nowrap">Amount</th>
                                <th className="py-5 px-6 whitespace-nowrap text-center">Acceptance</th>
                                <th className="py-5 px-6 whitespace-nowrap text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-color)]">
                            {((activeTab === "doctors" ? filteredDocs : activeTab === "services" ? filteredServices : filteredHospital) || []).length > 0 ? (
                                ((activeTab === "doctors" ? filteredDocs : activeTab === "services" ? filteredServices : filteredHospital) as any[]).map((booking, index) => {
                                    const isPending = booking.status?.toUpperCase() === "PENDING" || booking.status?.toUpperCase() === "RETURNED_TO_ADMIN";
                                    const isConfirmed = booking.status?.toUpperCase() === "CONFIRMED" || booking.status?.toUpperCase() === "ACCEPTED";
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
                                                <div className="text-sm font-bold text-[var(--text-main)] truncate max-w-[250px]">
                                                    {activeTab === "doctors" ? booking.doctorId?.name : activeTab === "services" ? booking.serviceId?.name : booking.serviceName}
                                                </div>
                                            </td>
                                            <td className="py-5 px-6">
                                                <div className="text-sm font-semibold text-[var(--text-main)]">
                                                    {booking.patientId?.name || booking.patientId?.mobile || "Anonymous Member"}
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
                                            <td className="py-5 px-6 text-center">
                                                {activeTab === "services" && (booking.status?.toUpperCase() === "RETURNED_TO_ADMIN") ? (
                                                    <button
                                                        onClick={() => setAcceptServiceModal({ bookingId: booking._id, booking })}
                                                        className="h-9 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm text-xs font-bold mx-auto bg-blue-600 text-white hover:bg-blue-700 animate-soft-glow"
                                                    >
                                                        <CheckCircle2 size={14} />
                                                        Assign to hospital
                                                    </button>
                                                ) : (
                                                    <button
                                                        disabled={!isPending}
                                                        onClick={() => handleUpdateStatus(booking.bookingId || booking._id, (booking as any).bookingType || (activeTab === "doctors" ? "doctor" : "service"), "CONFIRMED")}
                                                        className={`h-9 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm text-xs font-bold mx-auto 
                                                            ${isPending
                                                                ? "bg-blue-600 text-white hover:bg-blue-700 animate-soft-glow"
                                                                : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-200 dark:border-slate-700 shadow-none"
                                                            }`}
                                                    >
                                                        <CheckCircle2 size={14} />
                                                        Accept
                                                    </button>
                                                )}
                                            </td>
                                            <td className="py-5 px-6 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => { setSelectedBooking({ ...booking, tab: activeTab }); setViewModalOpen(true); }}
                                                        className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-500 dark:hover:text-white flex items-center justify-center transition-all border border-blue-200 dark:border-blue-500/20" title="View Details">
                                                        <Eye size={16} />
                                                    </button>



                                                    <button
                                                        disabled={booking.status?.toUpperCase() === "CANCELLED" || booking.status?.toUpperCase() === "COMPLETED"}
                                                        onClick={() => handleUpdateStatus(booking.bookingId || booking._id, (booking as any).bookingType || (activeTab === "doctors" ? "doctor" : "service"), "CANCELLED")}
                                                        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all border 
                                                            ${(booking.status?.toUpperCase() === "CANCELLED" || booking.status?.toUpperCase() === "COMPLETED")
                                                                ? "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border-slate-200 dark:border-slate-700"
                                                                : "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white dark:hover:bg-red-500 dark:hover:text-white border-red-200 dark:border-red-500/20 shadow-sm"
                                                            }`}
                                                        title="Cancel Booking"
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
                                    <td colSpan={9} className="py-24 text-center">
                                        <div className="w-20 h-20 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-full flex items-center justify-center mx-auto mb-5 shadow-sm">
                                            <Calendar size={32} className="text-[var(--text-muted)]" />
                                        </div>
                                        <h3 className="text-xl font-bold text-[var(--text-main)] mb-2">No active bookings found</h3>
                                        <p className="text-[var(--text-muted)]">There are currently no active bookings matching your criteria in this segment.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* View Details Modal */}
            {viewModalOpen && selectedBooking && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={() => setViewModalOpen(false)}></div>
                    <div className="relative w-full max-w-2xl bg-[var(--card-bg)] rounded-[32px] border border-[var(--border-color)] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-8 border-b border-[var(--border-color)]">
                            <div className="space-y-1">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">Order Details</span>
                                <h3 className="text-xl font-black text-[var(--text-main)] flex items-center gap-3">
                                    #{selectedBooking._id.slice(-12).toUpperCase()}
                                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest
                                        ${selectedBooking.status?.toUpperCase() === 'PENDING' ? 'text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-500/10' : ''}
                                        ${selectedBooking.status?.toUpperCase() === 'CONFIRMED' ? 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-500/10' : ''}
                                        ${selectedBooking.status?.toUpperCase() === 'COMPLETED' ? 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-500/10' : ''}
                                        ${selectedBooking.status?.toUpperCase() === 'CANCELLED' ? 'text-slate-500 bg-slate-50' : ''}
                                    `}>
                                        {selectedBooking.status}
                                    </span>
                                </h3>
                            </div>
                            <button onClick={() => setViewModalOpen(false)} className="w-10 h-10 rounded-full bg-[var(--bg-main)] hover:bg-[var(--border-color)] flex items-center justify-center transition-colors">
                                <X size={20} className="text-[var(--text-muted)]" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto">
                            {/* Entity Info Section */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6 bg-[var(--bg-main)] rounded-2xl border border-[var(--border-color)]">
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-2">
                                        <User size={12} className="text-blue-500" /> Patient Profile
                                    </h4>
                                    <div className="space-y-1">
                                        <p className="text-[var(--text-main)] font-bold text-lg leading-tight">{selectedBooking.patientId?.name || selectedBooking.patientId?.mobile || "Guest User"}</p>
                                        <p className="text-[var(--text-muted)] font-mono text-xs">{selectedBooking.patientId?.mobile || "No mobile available"}</p>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-2">
                                        <Briefcase size={12} className="text-blue-500" />
                                        {selectedBooking.tab === "doctors" ? "Medical Expert" : "Service Info"}
                                    </h4>
                                    <div className="space-y-1">
                                        <p className="text-[var(--text-main)] font-bold text-lg leading-tight">
                                            {selectedBooking.tab === "doctors" ? selectedBooking.doctorId?.name : selectedBooking.tab === "services" ? selectedBooking.serviceId?.name : selectedBooking.serviceName}
                                        </p>
                                        <p className="text-[var(--text-muted)] text-sm font-medium">
                                            {selectedBooking.tab === "doctors" ? selectedBooking.doctorId?.specialization?.join(", ") : "Hospital Facility Token"}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Scheduling & Payment */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                <div className="space-y-3">
                                    <h4 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-2">
                                        <Calendar size={12} /> Appointment
                                    </h4>
                                    <div className="space-y-1">
                                        <p className="text-sm font-bold text-[var(--text-main)]">{new Date(selectedBooking.date || selectedBooking.createdAt).toLocaleDateString()}</p>
                                        <p className="text-xs font-medium text-[var(--text-muted)]">{selectedBooking.startingTime || new Date(selectedBooking.createdAt).toLocaleTimeString()}</p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <h4 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-2">
                                        <CreditCard size={12} /> Billing
                                    </h4>
                                    <div className="space-y-1">
                                        <p className="text-lg font-black text-[var(--text-main)]">₹{selectedBooking.totalAmount}</p>
                                        <span className={`text-[9px] font-black uppercase tracking-widest 
                                            ${selectedBooking.paymentStatus === 'COMPLETED' ? 'text-green-600' : 'text-orange-600'}`}>
                                            {selectedBooking.paymentStatus}
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <h4 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-2">
                                        <Clock size={12} /> Created On
                                    </h4>
                                    <p className="text-sm font-bold text-[var(--text-main)]">{new Date(selectedBooking.createdAt).toLocaleString()}</p>
                                </div>
                            </div>

                            {/* Additional Details */}
                            {selectedBooking.notes && (
                                <div className="space-y-3 p-5 bg-blue-50/50 dark:bg-blue-500/5 rounded-2xl border border-blue-100 dark:border-blue-500/10">
                                    <h4 className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">Medical Notes / Requirements</h4>
                                    <p className="text-sm text-[var(--text-main)] leading-relaxed italic">"{selectedBooking.notes}"</p>
                                </div>
                            )}

                            {selectedBooking.tab === "services" && selectedBooking.location && (
                                <div className="space-y-3">
                                    <h4 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-2">
                                        <MapPin size={12} /> Service Location
                                    </h4>
                                    <p className="text-sm font-medium text-[var(--text-main)] p-4 bg-[var(--bg-main)] rounded-xl border border-[var(--border-color)]">
                                        {selectedBooking.location}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-8 border-t border-[var(--border-color)] flex justify-end">
                            <button
                                onClick={() => setViewModalOpen(false)}
                                className="px-10 h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition-all shadow-md active:scale-95"
                            >
                                Close View
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Assign service to hospital modal (for RETURNED_TO_ADMIN) */}
            {acceptServiceModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setAcceptServiceModal(null); setSelectedHospitalId(""); }}></div>
                    <div className="relative w-full max-w-md bg-[var(--card-bg)] rounded-2xl border border-[var(--border-color)] shadow-2xl p-6">
                        <h3 className="text-lg font-bold text-[var(--text-main)] mb-2">Assign to hospital</h3>
                        <p className="text-sm text-[var(--text-muted)] mb-4">Select a provider to accept this booking. It will appear in Hospital Bookings.</p>
                        <select
                            value={selectedHospitalId}
                            onChange={(e) => setSelectedHospitalId(e.target.value)}
                            className="w-full h-12 px-4 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl text-sm font-medium text-[var(--text-main)] mb-4"
                        >
                            <option value="">Choose provider...</option>
                            {(doctorsList || []).map((d) => (
                                <option key={d._id} value={d._id}>{d.name} {d.mobileNumber ? `(${d.mobileNumber})` : ""}</option>
                            ))}
                        </select>
                        <div className="flex gap-3 justify-end">
                            <button onClick={() => { setAcceptServiceModal(null); setSelectedHospitalId(""); }} className="px-5 h-11 rounded-xl border border-[var(--border-color)] font-bold text-[var(--text-main)]">Cancel</button>
                            <button onClick={handleAcceptServiceWithHospital} disabled={!selectedHospitalId || updateStatusMutation.isPending} className="px-5 h-11 rounded-xl bg-blue-600 text-white font-bold disabled:opacity-50">Assign</button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
}
