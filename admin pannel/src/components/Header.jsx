import { useNavigate } from 'react-router-dom';
import { Bell, Search, Moon, Sun, Menu } from 'lucide-react';

const Header = () => {
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem('adminToken');
        navigate('/login');
    };

    return (
        <header className="bg-white/80 backdrop-blur-md h-16 flex items-center justify-between px-6 sticky top-0 z-10 m-4 rounded-xl shadow-card mb-6">
            {/* Search Bar */}
            <div className="flex items-center gap-4">
                <button className="md:hidden p-2 text-dark-body hover:bg-gray-100 rounded-lg">
                    <Menu className="h-5 w-5" />
                </button>
                <div className="relative hidden md:block group">
                    <Search className="absolute left-0 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 group-focus-within:text-primary transition-colors" />
                    <input
                        type="text"
                        placeholder="Search (Ctrl+/)"
                        className="w-64 pl-8 pr-4 py-2 bg-transparent border-none focus:outline-none text-dark-body placeholder-gray-400 text-sm"
                    />
                </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-2">
                <button className="p-2 text-dark-body hover:text-primary hover:bg-primary-light rounded-lg transition-all">
                    <Moon className="h-5 w-5" />
                </button>

                <button className="relative p-2 text-dark-body hover:text-primary hover:bg-primary-light rounded-lg transition-all">
                    <Bell className="h-5 w-5" />
                    <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-danger rounded-full ring-2 ring-white"></span>
                </button>

                <div className="h-8 w-px bg-gray-200 mx-2"></div>

                <div className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-1.5 rounded-lg transition-colors" onClick={handleLogout}>
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-bold text-dark-header leading-none">John Doe</p>
                        <p className="text-xs text-gray-500 mt-1">Admin</p>
                    </div>
                    <div className="h-9 w-9 rounded-full bg-primary text-white flex items-center justify-center font-bold shadow-lg shadow-primary/30">
                        JD
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
