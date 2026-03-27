import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/store/auth";
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
  HeartPulse,
  Stethoscope,
  UserSquare2,
  BarChart3,
  Command,
  Flame,
  Banknote,
  Receipt,
  Package
} from "lucide-react";

const mainNav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/bookings", label: "Main Bookings", icon: CalendarCheck },
  { to: "/op-bookings", label: "OP Bookings", icon: ClipboardList },
  { to: "/partner-revenue-model", label: "Partner Revenue", icon: BarChart3 },
  { to: "/payouts", label: "Payouts", icon: Banknote },
  { to: "/kyc-verification", label: "KYC Verification", icon: ShieldCheck },
  { to: "/reviews", label: "User Reviews", icon: MessageSquare },
  { to: "/support-tickets", label: "Tickets", icon: Ticket },
];

export function AppLayout() {
  const location = useLocation();
  const { user, logout } = useAuth();

  const [servicesOpen, setServicesOpen] = useState(false);
  const [usersOpen, setUsersOpen] = useState(true);
  const [appsOpen, setAppsOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem("admin_theme") || "light");

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

  return (
    <div className="shell">
      <aside className="sidebar border-r border-[var(--border-color)] dark:border-slate-800">
        <div className="sidebar-brand py-8 px-6 flex items-center gap-4">
          <div className="relative group">
            <div className="absolute inset-0 bg-blue-500 blur-xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
            <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-lg relative z-10 transition-transform group-hover:rotate-6 duration-500">
              <HeartPulse size={28} color="white" strokeWidth={2.5} />
            </div>
          </div>

          <div className="flex flex-col">
            <h2 className="text-3xl font-black italic tracking-tighter text-blue-600 leading-none">
              24/7
            </h2>
            <p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 mt-1.5 opacity-70">
              Global Systems
            </p>
          </div>
        </div>

        <nav className="px-4 py-6 space-y-2">
          <div className="px-4 pb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] opacity-60">Control Center</span>
          </div>

          {mainNav.map((item) => (
            <NavLink key={item.label} to={item.to} className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-300 ${isActive ? "bg-blue-600 text-white shadow-lg shadow-blue-100" : "text-[var(--text-muted)] hover:bg-[var(--bg-main)] hover:text-[var(--text-main)]"}`}>
              <item.icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          ))}

          <div className="pt-6 px-4 pb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] opacity-60">Inventory & Users</span>
          </div>

          <button
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all duration-300 ${usersActive ? "text-blue-600 bg-blue-50" : "text-[var(--text-muted)] hover:bg-[var(--bg-main)]"}`}
            onClick={() => setUsersOpen((prev) => !prev)}
          >
            <div className="flex items-center gap-3">
              <Users size={18} />
              <span>User Base</span>
            </div>
            {usersOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>

          {usersOpen && (
            <div className="ml-4 pl-4 border-l border-[var(--border-color)] space-y-1 mt-1">
              {[
                { to: "/manage-patients", label: "Patients" },
                { to: "/manage-doctors", label: "Doctors" },
                { to: "/manage-nurses", label: "Nurses" },
                { to: "/manage-ambulances", label: "Ambulances" },
                { to: "/manage-rentals", label: "Rentals" }
              ].map(link => (
                <NavLink key={link.to} to={link.to} className={({ isActive }) => `block py-2 text-[13px] font-medium transition-colors ${isActive ? "text-blue-600 font-bold" : "text-[var(--text-muted)] hover:text-[var(--text-main)]"}`}>
                  {link.label}
                </NavLink>
              ))}
            </div>
          )}

          <button
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all duration-300 ${servicesActive ? "text-blue-600 bg-blue-50" : "text-[var(--text-muted)] hover:bg-[var(--bg-main)]"}`}
            onClick={() => setServicesOpen((prev) => !prev)}
          >
            <div className="flex items-center gap-3">
              <Layers size={18} />
              <span>Healthcare Catalog</span>
            </div>
            {servicesOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>

          {servicesOpen && (
            <div className="ml-4 pl-4 border-l border-[var(--border-color)] space-y-1 mt-1">
              <NavLink to="/service-management" className="block py-2 text-[13px] font-medium text-[var(--text-muted)] hover:text-[var(--text-main)]">Catalog</NavLink>
              <NavLink to="/service-categories" className="block py-2 text-[13px] font-medium text-[var(--text-muted)] hover:text-[var(--text-main)]">Categories</NavLink>
              <NavLink to="/service-subcategories" className="block py-2 text-[13px] font-medium text-[var(--text-muted)] hover:text-[var(--text-main)]">Sub-Services</NavLink>
              <NavLink to="/health-packages" className={({ isActive }) => `flex items-center gap-2 py-2 text-[13px] font-medium transition-colors ${isActive ? "text-blue-600 font-bold" : "text-[var(--text-muted)] hover:text-[var(--text-main)]"}`}>
                <Package size={13} /> Health Packages
              </NavLink>
            </div>
          )}

          <div className="pt-6 px-4 pb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] opacity-60">System Configuration</span>
          </div>

          <button
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all duration-300 ${appsActive ? "text-blue-600 bg-blue-50" : "text-[var(--text-muted)] hover:bg-[var(--bg-main)]"}`}
            onClick={() => setAppsOpen((prev) => !prev)}
          >
            <div className="flex items-center gap-3">
              <AppWindow size={18} />
              <span>App Deployment</span>
            </div>
            {appsOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>

          {appsOpen && (
            <div className="ml-4 pl-4 border-l border-[var(--border-color)] space-y-1 mt-1">
              <NavLink to="/manage-customer-app" className="block py-2 text-[13px] font-medium text-[var(--text-muted)] hover:text-[var(--text-main)]">User Apps</NavLink>
              <NavLink to="/manage-provider-app" className="block py-2 text-[13px] font-medium text-[var(--text-muted)] hover:text-[var(--text-main)]">Provider Apps</NavLink>
              <NavLink to="/audit-health-vault" className="block py-2 text-[13px] font-medium text-[var(--text-muted)] hover:text-[var(--text-main)]">Health Vault Audit</NavLink>
              <NavLink to="/payment-logs" className="flex items-center gap-2 py-2 text-[13px] font-medium text-[var(--text-muted)] hover:text-[var(--text-main)]">
                <Receipt size={13} />
                Payment Logs
              </NavLink>
              <NavLink
                to="/manage-system-config"
                className={({ isActive }) =>
                  `flex items-center gap-2 py-2 text-[13px] font-medium transition-colors ${isActive ? "text-orange-500 font-bold" : "text-[var(--text-muted)] hover:text-orange-500"
                  }`
                }
              >
                <ShieldCheck size={13} className="text-orange-400" />
                System Credentials
              </NavLink>
            </div>
          )}

          <NavLink to="/settings" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-[var(--text-muted)] hover:bg-[var(--bg-main)] hover:text-[var(--text-main)] transition-all">
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
        <header className="content-header h-20 backdrop-blur-xl border-b px-8 flex items-center justify-between sticky top-0 z-50">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3 bg-slate-100/80 dark:bg-white/5 border border-transparent focus-within:border-blue-500/30 focus-within:bg-white px-5 py-3 rounded-2xl text-slate-500 focus-within:ring-4 focus-within:ring-blue-500/5 transition-all min-w-[380px] group">
                <Search size={18} className="text-slate-400 group-focus-within:text-blue-500 transition-colors shrink-0" />
                <input type="text" placeholder="Search telemetry, users or logs..." className="bg-transparent border-none text-sm font-semibold text-slate-700 dark:text-slate-200 focus:ring-0 placeholder:text-slate-400 h-auto p-0 w-full" style={{ paddingLeft: '8px' }} />
                <div className="flex items-center gap-1 opacity-40 shrink-0 bg-slate-200 dark:bg-white/10 px-1.5 py-0.5 rounded text-[10px] font-black">
                  <Command size={10} /> K
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-5">
            <div className="flex bg-slate-100/50 p-1 rounded-xl">
              <button className={`p-2 rounded-lg transition-all ${theme === 'dark' ? 'bg-[var(--card-bg)] text-blue-600 shadow-sm' : 'text-[var(--text-muted)] hover:text-slate-600'}`} onClick={() => setTheme('dark')}>
                <Moon size={18} />
              </button>
              <button className={`p-2 rounded-lg transition-all ${theme === 'light' ? 'bg-[var(--card-bg)] text-blue-600 shadow-sm' : 'text-[var(--text-muted)] hover:text-slate-600'}`} onClick={() => setTheme('light')}>
                <Sun size={18} />
              </button>
            </div>

            <div className="w-px h-6 bg-slate-200"></div>

            <button className="relative w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors">
              <Bell size={20} className="text-[var(--text-muted)]" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
            </button>

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

        <div className="page-body p-8 lg:p-12">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
