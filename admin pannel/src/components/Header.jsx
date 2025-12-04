import { useNavigate } from 'react-router-dom';
import { Bell, Search, Menu } from 'lucide-react';

const Header = () => {
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem('adminToken');
        navigate('/login');
    };

    return (
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-6 sticky top-0 z-10 shadow-sm">
            {/* Search Bar */}
            <div className="relative w-96 hidden md:block group">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4 group-focus-within:text-medical-primary transition-colors" />
                <input
                    type="text"
                    placeholder="Search patients, doctors, or services..."
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-primary/20 focus:border-medical-primary transition-all text-sm text-slate-700 placeholder-slate-400"
                />
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-4">
                <button className="relative p-2 text-slate-400 hover:text-medical-primary hover:bg-teal-50 rounded-lg transition-all duration-200">
                    <Bell className="h-5 w-5" />
                    <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-500 rounded-full border-2 border-white"></span>
                </button>

                <div className="h-6 w-px bg-slate-200 mx-2"></div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleLogout}
                        className="text-sm font-medium text-slate-600 hover:text-red-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50 border border-transparent hover:border-red-100"
                    >
                        Logout
                    </button>
                </div>
            </div>
        </header>
    );
};

export default Header;
