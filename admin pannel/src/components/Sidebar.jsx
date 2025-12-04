import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Stethoscope, BriefcaseMedical, LogOut, Activity } from 'lucide-react';

const Sidebar = () => {
    const menuItems = [
        { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/users', label: 'Patients', icon: Users },
        { path: '/doctors', label: 'Doctors', icon: Stethoscope },
        { path: '/services', label: 'Services', icon: BriefcaseMedical },
    ];

    return (
        <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen">
            {/* Logo Area */}
            <div className="p-6 border-b border-gray-100">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-600 p-2 rounded-lg">
                        <Activity className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">A1Care</h1>
                        <p className="text-xs text-gray-500 font-medium tracking-wide">ADMIN PORTAL</p>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
                {menuItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 group ${isActive
                                ? 'bg-blue-50 text-blue-600 font-medium shadow-sm'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            }`
                        }
                    >
                        <item.icon className="h-5 w-5 transition-colors" />
                        <span className="text-sm">{item.label}</span>
                    </NavLink>
                ))}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50/50">
                <div className="flex items-center gap-3 px-3 py-2">
                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                        AD
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">Admin User</p>
                        <p className="text-xs text-gray-500 truncate">admin@a1care.com</p>
                    </div>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
