import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/store/auth";
import { toast } from "sonner";
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  Bell,
  MessageSquare,
  Search,
  ChevronDown,
  ChevronRight,
  LogOut,
  Ticket,
  AppWindow,
  ClipboardList,
  ShieldCheck,
  Layers,
  Settings,
  Moon,
  Sun,
  Truck,
  Box,
  Stethoscope,
  UserSquare2,
  BarChart3,
  Command,
  Flame,
  Banknote,
  Receipt,
  Package,
  X,
  LayoutGrid,
  Tag,
  Briefcase,
  Trash2,
  Calendar,
  CheckCircle
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { format } from "date-fns";

const mainNav = (role: string) => [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/bookings", label: "Service Orders", icon: CalendarCheck },
  { to: "/op-bookings", label: "Doctor Appointments", icon: ClipboardList },
  ...(role === "super_admin" ? [
    { to: "/partner-revenue-model", label: "Partner Plans", icon: BarChart3 },
    { to: "/payouts", label: "Payouts", icon: Banknote },
  ] : []),
  { to: "/kyc-verification", label: "KYC Verification", icon: ShieldCheck },
  { to: "/reviews", label: "User Reviews", icon: MessageSquare },
  { to: "/support-tickets", label: "Tickets", icon: Ticket },
  { to: "/notifications", label: "Push Notifications", icon: Bell },
];

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [servicesOpen, setServicesOpen] = useState(false);
  const [usersOpen, setUsersOpen] = useState(true);
  const [appsOpen, setAppsOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem("admin_theme") || "light");

  // Search / Command Palette State
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const searchItems = useMemo(() => [
    { label: "Dashboard", to: "/", icon: "📊", cat: "General" },
    { label: "Main Bookings", to: "/bookings", icon: "📅", cat: "Operations" },
    { label: "OP Bookings", to: "/op-bookings", icon: "📋", cat: "Operations" },
    { label: "Partner Revenue", to: "/partner-revenue-model", icon: "💰", cat: "Finance" },
    { label: "Payout Management", to: "/payouts", icon: "🏦", cat: "Finance" },
    { label: "KYC Verification", to: "/kyc-verification", icon: "🛡️", cat: "Audit" },
    { label: "User Reviews", to: "/reviews", icon: "💬", cat: "User Engagement" },
    { label: "Support Tickets", to: "/support-tickets", icon: "🎫", cat: "Support" },
    { label: "Broadcast Notifications", to: "/notifications", icon: "🔔", cat: "Support" },
    { label: "Patient Registry", to: "/manage-patients", icon: "👤", cat: "Users" },
    { label: "Doctor Registry", to: "/manage-doctors", icon: "🩺", cat: "Users" },
    { label: "Nurse Registry", to: "/manage-nurses", icon: "🏥", cat: "Users" },
    { label: "Ambulance Fleet", to: "/manage-ambulances", icon: "🚑", cat: "Users" },
    { label: "Rental Inventory", to: "/manage-rentals", icon: "📦", cat: "Users" },
    { label: "Service Categories", to: "/service-categories", icon: "📂", cat: "Services" },
    { label: "Sub-Categories", to: "/service-subcategories", icon: "📁", cat: "Services" },
    { label: "Service Items", to: "/service-child-services", icon: "🏷️", cat: "Services" },
    { label: "Health Packages", to: "/health-packages", icon: "📦", cat: "Services" },
    { label: "System Config", to: "/manage-system-config", icon: "⚙️", cat: "Admin" },
    { label: "Payment Audit Logs", to: "/payment-logs", icon: "🧾", cat: "Admin" },
    { label: "Audit Logs", to: "/audit-logs", icon: "📜", cat: "Admin" },
    { label: "Account Deletion Requests", to: "/deletion-requests", icon: "🗑️", cat: "Admin" },
  ], []);

  const filteredSearchItems = useMemo(() => {
    if (!searchQuery) return searchItems;
    const q = searchQuery.toLowerCase();
    return searchItems.filter(item =>
      item.label.toLowerCase().includes(q) ||
      item.cat.toLowerCase().includes(q)
    );
  }, [searchQuery, searchItems]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(prev => !prev);
      }
      if (e.key === 'Escape') setShowSearch(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleNavigate = (to: string) => {
    navigate(to);
    setShowSearch(false);
    setSearchQuery("");
  };

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem("admin_theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === "light" ? "dark" : "light");

  const servicesActive = useMemo(
    () => location.pathname.startsWith("/service-"),
    [location.pathname]
  );

  const usersActive = useMemo(
    () => location.pathname.startsWith("/manage-") || location.pathname === "/patients",
    [location.pathname]
  );

  const appsActive = useMemo(
    () =>
      location.pathname.startsWith("/manage-customer") ||
      location.pathname.startsWith("/manage-provider") ||
      location.pathname.startsWith("/manage-system-config"),
    [location.pathname]
  );

  // ── Notification Intelligence ─────────────────────────────────────────────
  const queryClient = useQueryClient();
  const [showBell, setShowBell] = useState(false);

  const { data: alerts = [] } = useQuery({
    queryKey: ["admin-system-alerts"],
    queryFn: async () => {
      const res = await api.get("/admin/notifications?recipientType=admin&limit=10");
      return res.data.data.notifications as any[];
    },
    refetchInterval: 30000 // Poll every 30s
  });

  const clearAlertsMutation = useMutation({
    mutationFn: async () => api.delete("/admin/notifications/clear"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-system-alerts"] });
      toast.success("Intelligence logs cleared.");
      setShowBell(false);
    }
  });

  return (
    <div className="shell min-h-screen">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="logo-box large">
            <img src="/a1care_logo1.png" alt="A1Care Logo" className="w-full h-full object-contain" />
          </div>
          <div className="text-center">
            <h2 className="brand-name">A1Care Admin</h2>
            <p className="role-label">System Controller</p>
          </div>
        </div>

        <nav>
          <div className="nav-section">Control Center</div>

          {mainNav(user?.role || "admin").map((item) => (
            <NavLink key={item.label} to={item.to} className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
              <item.icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          ))}

          <div className="nav-section">Inventory & Users</div>

          <button
            className={`submenu-trigger ${usersActive ? "active" : ""}`}
            onClick={() => setUsersOpen((prev) => !prev)}
          >
            <div className="flex items-center gap-3">
              <Users size={18} />
              <span>User Directory</span>
            </div>
            {usersOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>

          {usersOpen && (
            <div className="submenu-list">
              {[
                { to: "/manage-patients", label: "Patients" },
                { to: "/manage-doctors", label: "Doctors" },
                { to: "/manage-nurses", label: "Nurses" },
                { to: "/manage-ambulances", label: "Ambulances" },
                { to: "/manage-rentals", label: "Rental Inventory" },
                { to: "/manage-labs", label: "Lab Registry" },
                { to: "/manage-services", label: "Extra Services" }
              ].map(link => (
                <NavLink key={link.to} to={link.to} className={({ isActive }) => `sub-link ${isActive ? "active text-primary font-bold" : ""}`}>
                  {link.label}
                </NavLink>
              ))}
            </div>
          )}

          {user?.role === "super_admin" && (
            <>
              <button
                className={`submenu-trigger ${servicesActive ? "active" : ""}`}
                onClick={() => setServicesOpen((prev) => !prev)}
              >
                <div className="flex items-center gap-3">
                  <Layers size={18} />
                  <span>Healthcare Catalog</span>
                </div>
                {servicesOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>

              {servicesOpen && (
                <div className="submenu-list">
                  {[
                    { to: "/service-portfolio", label: "Portfolios Hub", icon: Briefcase },
                    { to: "/service-categories", label: "Master Categories", icon: LayoutGrid },
                    { to: "/service-subcategories", label: "Sub-Categories", icon: Layers },
                    { to: "/service-child-services", label: "Catalog Offerings", icon: Tag },
                    { to: "/health-packages", label: "Service Bundles", icon: Package }
                  ].map(link => (
                    <NavLink key={link.to} to={link.to} className={({ isActive }) => `sub-link flex items-center gap-2 ${isActive ? "active text-primary font-bold" : ""}`}>
                      <link.icon size={13} /> {link.label}
                    </NavLink>
                  ))}
                </div>
              )}
            </>
          )}

          {user?.role === "super_admin" && (
            <>
              <div className="nav-section">System Configuration</div>

              <button
                className={`submenu-trigger ${appsActive ? "active" : ""}`}
                onClick={() => setAppsOpen((prev) => !prev)}
              >
                <div className="flex items-center gap-3">
                  <AppWindow size={18} />
                  <span>App Deployment</span>
                </div>
                {appsOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>

              {appsOpen && (
                <div className="submenu-list">
                  <NavLink to="/manage-customer-app" className={({ isActive }) => `sub-link ${isActive ? "active" : ""}`}>User Apps</NavLink>
                  <NavLink to="/manage-provider-app" className={({ isActive }) => `sub-link ${isActive ? "active" : ""}`}>Provider Apps</NavLink>
                  <NavLink to="/audit-health-vault" className={({ isActive }) => `sub-link ${isActive ? "active" : ""}`}>Health Vault Audit</NavLink>
                  <NavLink to="/payment-logs" className={({ isActive }) => `sub-link flex items-center gap-2 ${isActive ? "active" : ""}`}>
                    <Receipt size={13} />
                    Payment Logs
                  </NavLink>
                  <NavLink to="/manage-system-config" className={({ isActive }) => `sub-link flex items-center gap-2 ${isActive ? "active" : ""}`}>
                    <ShieldCheck size={13} />
                    System Credentials
                  </NavLink>
                  <NavLink to="/audit-logs" className={({ isActive }) => `sub-link ${isActive ? "active" : ""}`}>Audit Logs</NavLink>
                  <NavLink to="/deletion-requests" className={({ isActive }) => `sub-link text-rose-500 font-bold ${isActive ? "active" : ""}`}>Deletion Requests</NavLink>
                </div>
              )}
            </>
          )}

          <NavLink to="/settings" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
            <Settings size={18} />
            <span>Core Settings</span>
          </NavLink>
        </nav>

        <div className="mt-auto p-4 border-t border-[var(--border-color)]">
          <div className="bg-[var(--sidebar-active)] rounded-[20px] p-3.5 flex items-center gap-3 transition-all hover:bg-[var(--border-color)] border border-transparent group overflow-hidden">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform shrink-0">
              {user?.name?.charAt(0) || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-black text-[var(--text-main)] truncate leading-none mb-1">
                {user?.name || "Premium Admin"}
              </p>
              <p className="text-[9px] font-bold text-[var(--text-muted)] truncate uppercase tracking-widest opacity-80">
                {user?.role?.replace('_', ' ') || "Global Manager"}
              </p>
            </div>
            <button
              className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all shrink-0"
              onClick={logout}
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      <main className="content">
        <header className="content-header h-16 backdrop-blur-xl border-b px-8 flex items-center justify-between sticky top-0 z-50">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-6">
              <div
                onClick={() => setShowSearch(true)}
                className="flex items-center gap-3 bg-slate-100/80 dark:bg-white/5 border border-transparent hover:border-blue-500/30 px-5 py-3 rounded-2xl text-slate-500 transition-all min-w-[380px] group cursor-pointer"
              >
                <Search size={18} className="text-slate-400 group-hover:text-blue-500 transition-colors shrink-0" />
                <span className="text-sm font-semibold text-slate-400 dark:text-slate-500 w-full">Search modules (Ctrl+K)...</span>
                <div className="flex items-center gap-1 opacity-40 shrink-0 bg-slate-200 dark:bg-white/10 px-1.5 py-0.5 rounded text-[10px] font-black">
                  <Command size={10} /> K
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-5">
            {/* Dark mode toggle hidden temporarily */}

            <div className="w-px h-6 bg-slate-200"></div>

            <div className="relative">
              <button
                onClick={() => setShowBell(!showBell)}
                className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${showBell ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'hover:bg-slate-100 text-[var(--text-muted)]'}`}
              >
                <Bell size={20} />
                {alerts.length > 0 && <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>}
              </button>

              {showBell && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowBell(false)}></div>
                  <div className="absolute right-0 mt-4 w-80 bg-white rounded-[32px] shadow-2xl border border-slate-100 overflow-hidden z-50 animate-in slide-in-from-top-4 duration-300">
                    <div className="p-6 border-b bg-slate-50 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">System Alerts</h3>
                        <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest">{alerts.length} Pending Actions</p>
                      </div>
                      <button
                        onClick={() => clearAlertsMutation.mutate()}
                        className="text-[9px] font-black text-slate-400 hover:text-red-500 uppercase tracking-widest transition-colors flex items-center gap-1.5"
                      >
                        <Trash2 size={10} /> Clear All
                      </button>
                    </div>

                    <div className="max-h-80 overflow-y-auto custom-scrollbar">
                      {alerts.length > 0 ? (
                        alerts.map((alert) => (
                          <div key={alert._id} className="p-6 border-b dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 transition-all cursor-pointer group">
                            <div className="flex gap-4">
                              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 shrink-0 group-hover:scale-110 transition-transform">
                                {alert.refType === 'ServiceRequest' ? <Calendar size={18} /> :
                                  alert.refType === 'Partner' ? <ShieldCheck size={18} /> :
                                    <Bell size={18} />}
                              </div>
                              <div className="space-y-1">
                                <p className="text-xs font-black text-slate-900 dark:text-white leading-tight">{alert.title}</p>
                                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">{alert.body}</p>
                                <p className="text-[8px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest pt-1">
                                  {format(new Date(alert.createdAt), 'MMM d, h:mm a')}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-12 text-center space-y-3">
                          <div className="w-16 h-16 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto text-slate-300">
                            <CheckCircle size={32} />
                          </div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Queue Clean</p>
                        </div>
                      )}
                    </div>

                    <div className="p-4 bg-slate-50/50 dark:bg-white/5 text-center">
                      <button
                        onClick={() => { navigate('/notifications'); setShowBell(false); }}
                        className="w-full py-3 rounded-2xl text-[10px] font-black text-blue-600 uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                      >
                        View Full Intelligence Log
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center gap-3 pl-2">
              <div className="text-right hidden sm:block">
                <p className="text-[13px] font-black text-[var(--text-main)] dark:text-white leading-none">{user?.name || "Admin User"}</p>
                <div className="flex items-center justify-end gap-1.5 mt-1">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                  <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Active Now</p>
                </div>
              </div>
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white text-sm font-black shadow-lg shadow-blue-100">
                {user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'AD'}
              </div>
            </div>
          </div>
        </header>

        <div className="page-body p-6 lg:p-8">
          <Outlet />
        </div>

        {/* Global Search / Command Palette Modal */}
        {showSearch && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
            <div onClick={() => setShowSearch(false)} className="absolute inset-0"></div>
            <div className="bg-white w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-300 flex flex-col max-h-[70vh]">
              <div className="p-6 border-b flex items-center gap-4">
                <Search size={22} className="text-blue-600" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Search anything..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent border-none text-xl font-bold text-slate-900 focus:ring-0 placeholder:text-slate-300"
                />
                <button onClick={() => setShowSearch(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl text-slate-400 transition-all">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {filteredSearchItems.length > 0 ? (
                  <div className="space-y-6">
                    {Array.from(new Set(filteredSearchItems.map(i => i.cat))).map(cat => (
                      <div key={cat} className="space-y-2">
                        <p className="px-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{cat}</p>
                        <div className="grid gap-1">
                          {filteredSearchItems.filter(i => i.cat === cat).map((item) => (
                            <button
                              key={item.to}
                              onClick={() => handleNavigate(item.to)}
                              className="flex items-center justify-between px-4 py-3 rounded-2xl hover:bg-blue-50 dark:hover:bg-blue-600/10 group transition-all text-left"
                            >
                              <div className="flex items-center gap-4">
                                <span className="text-xl">{item.icon}</span>
                                <span className="font-bold text-slate-700 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{item.label}</span>
                              </div>
                              <ChevronRight size={14} className="text-slate-300 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400 opacity-60">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                      <Search size={32} />
                    </div>
                    <p className="font-bold uppercase tracking-widest text-xs">No modules match your query</p>
                  </div>
                )}
              </div>

              <div className="p-6 bg-slate-50 dark:bg-white/5 border-t dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <span className="px-1.5 py-0.5 bg-white dark:bg-white/10 rounded shadow-sm border dark:border-slate-700 text-slate-600 dark:text-slate-300">ESC</span> Close
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <span className="px-1.5 py-0.5 bg-white dark:bg-white/10 rounded shadow-sm border dark:border-slate-700 text-slate-600 dark:text-slate-300">↵</span> Navigate
                  </div>
                </div>
                <p className="text-[10px] font-bold text-blue-500/60 uppercase tracking-widest">A1Care Intelligence Search</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
