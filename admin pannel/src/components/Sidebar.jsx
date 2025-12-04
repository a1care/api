import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Stethoscope, BriefcaseMedical, LogOut, Activity, Settings, HelpCircle } from 'lucide-react';

const Sidebar = () => {
    const menuItems = [
        { path: '/dashboard', label: 'Overview', icon: LayoutDashboard },
        { path: '/users', label: 'Patients', icon: Users },
        { path: '/doctors', label: 'Medical Staff', icon: Stethoscope },
        { path: '/services', label: 'Services & Depts', icon: BriefcaseMedical },
    ];

    const bottomItems = [
        { path: '/settings', label: 'Settings', icon: Settings },
        { path: '/help', label: 'Help & Support', icon: HelpCircle },
    ];

    return (
        <aside className="w-72 bg-medical-primary text-white flex flex-col h-screen shadow-xl z-20">
            {/* Logo Area */}
            <div className="p-6 border-b border-teal-800/50 bg-teal-900/20">
                <div className="flex items-center gap-3">
                    <div className="bg-white/10 p-2 rounded-lg backdrop-blur-sm border border-white/10">
                        <Activity className="h-6 w-6 text-medical-accent" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-white">A1Care</h1>
                        <p className="text-xs text-teal-200 font-medium tracking-wide uppercase opacity-80">Enterprise Admin</p>
                    </div>
                </div>
            </div>

            {/* Main Navigation */}
            <div className="flex-1 overflow-y-auto py-6 px-4 space-y-8">
                <div>
                    <h3 className="text-xs font-semibold text-teal-200/60 uppercase tracking-wider mb-3 px-3">Main Menu</h3>
                    <nav className="space-y-1">
                        {menuItems.map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className={({ isActive }) =>
                                    `flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 group ${isActive
                                        ? 'bg-white/10 text-white font-medium shadow-lg border border-white/10'
                                        : 'text-teal-100 hover:bg-white/5 hover:text-white'
                                    }`
                                }
                            >
                                <item.icon className={`h-5 w-5 transition-colors ${({ isActive }) => isActive ? 'text-medical-accent' : 'text-teal-300 group-hover:text-white'
                                    }`} />
                                <span className="text-sm">{item.label}</span>
                            </NavLink>
                        ))}
                    </nav>
                </div>

                <div>
                    <h3 className="text-xs font-semibold text-teal-200/60 uppercase tracking-wider mb-3 px-3">System</h3>
                    <nav className="space-y-1">
                        {bottomItems.map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className={({ isActive }) =>
                                    `flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 group ${isActive
                                        ? 'bg-white/10 text-white font-medium shadow-lg border border-white/10'
                                        : 'text-teal-100 hover:bg-white/5 hover:text-white'
                                    }`
                                }
                            >
                                <item.icon className="h-5 w-5 text-teal-300 group-hover:text-white" />
                                <span className="text-sm">{item.label}</span>
                            </NavLink>
                        ))}
                    </nav>
                </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-teal-800/50 bg-teal-900/40">
                <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-medical-accent to-teal-600 flex items-center justify-center text-white font-bold text-sm shadow-lg border-2 border-white/20">
                        AD
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">Admin User</p>
                        <p className="text-xs text-teal-200 truncate">admin@a1care.com</p>
                    </div>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
