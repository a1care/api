import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, UserPlus, Stethoscope, Settings, LogOut, Activity, ChevronRight } from 'lucide-react';

const Sidebar = () => {
    const location = useLocation();
    const isActive = (path) => location.pathname === path;

    const menuItems = [
        { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { path: '/users', icon: Users, label: 'Patients' },
        { path: '/doctors', icon: Stethoscope, label: 'Doctors' },
        { path: '/services', icon: Activity, label: 'Services' },
    ];

    return (
        <div className="w-64 bg-white h-screen fixed left-0 top-0 shadow-card z-20 flex flex-col transition-all duration-300">
            {/* Logo Section */}
            <div className="h-20 flex items-center px-6 border-b border-dashed border-gray-200">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-primary/40">
                        A1
                    </div>
                    <span className="text-lg font-bold text-dark-header tracking-tight">A1CARE 24/7</span>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto custom-scrollbar">
                <div className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Main Menu
                </div>

                {menuItems.map((item) => {
                    const active = isActive(item.path);
                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`group flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-200 mb-1 ${active
                                ? 'bg-gradient-to-r from-primary to-primary-hover text-white shadow-lg shadow-primary/30'
                                : 'text-dark-body hover:bg-gray-50 hover:translate-x-1'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <item.icon className={`h-5 w-5 ${active ? 'text-white' : 'text-gray-500 group-hover:text-primary'}`} />
                                <span className="font-medium text-sm">{item.label}</span>
                            </div>
                            {active && <ChevronRight className="h-4 w-4 text-white/80" />}
                        </Link>
                    );
                })}

                <div className="mt-8 px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Settings
                </div>

                <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-dark-body hover:bg-gray-50 hover:translate-x-1 transition-all duration-200">
                    <Settings className="h-5 w-5 text-gray-500 group-hover:text-primary" />
                    <span className="font-medium text-sm">Settings</span>
                </button>
            </nav>

            {/* User Profile / Footer */}
            <div className="p-4 border-t border-dashed border-gray-200 bg-gray-50/50">
                <div className="flex items-center gap-3 p-2 rounded-lg bg-white border border-gray-100 shadow-sm">
                    <div className="h-10 w-10 rounded-full bg-primary-light text-primary flex items-center justify-center font-bold text-lg">
                        A
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-dark-header truncate">Admin User</p>
                        <p className="text-xs text-gray-500 truncate">admin@a1care.com</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
