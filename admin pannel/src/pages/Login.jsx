import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-react';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        // Simulate API delay for professional feel
        await new Promise(resolve => setTimeout(resolve, 800));

        // Temporary hardcoded credentials
        if (email === 'admin@a1care.com' && password === 'Admin@123') {
            localStorage.setItem('adminToken', 'temp-admin-token-12345');
            navigate('/dashboard');
        } else {
            setError('Invalid credentials. Please check your email and password.');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-medical-background flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="flex justify-center">
                    <div className="bg-medical-primary p-4 rounded-2xl shadow-medical-lg">
                        <Activity className="h-12 w-12 text-white" />
                    </div>
                </div>
                <h2 className="mt-6 text-center text-3xl font-extrabold text-medical-text tracking-tight">
                    A1CARE 24/7
                </h2>
                <p className="mt-2 text-center text-sm text-medical-muted">
                    Hospital Administration Portal
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow-xl shadow-slate-200 sm:rounded-xl sm:px-10 border border-slate-100">
                    <div className="mb-6 flex items-center justify-center space-x-2 text-medical-primary bg-teal-50 py-2 rounded-lg">
                        <ShieldCheck className="h-5 w-5" />
                        <span className="text-sm font-medium">Authorized Personnel Only</span>
                    </div>

                    <form className="space-y-6" onSubmit={handleLogin}>
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-medical-text">
                                Email address
                            </label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="focus:ring-medical-primary focus:border-medical-primary block w-full pl-10 sm:text-sm border-gray-300 rounded-lg py-3 transition-colors"
                                    placeholder="admin@a1care.com"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-medical-text">
                                Password
                            </label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="current-password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="focus:ring-medical-primary focus:border-medical-primary block w-full pl-10 sm:text-sm border-gray-300 rounded-lg py-3 transition-colors"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="rounded-md bg-red-50 p-4 border border-red-100 animate-in fade-in slide-in-from-top-2">
                                <div className="flex">
                                    <div className="ml-3">
                                        <h3 className="text-sm font-medium text-red-800">{error}</h3>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div>
                            <button
                                type="submit"
                                disabled={loading}
                                className={`w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-medical-primary hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-medical-primary transition-all duration-200 ${loading ? 'opacity-75 cursor-not-allowed' : 'hover:shadow-medical'
                                    }`}
                            >
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        Sign in to Dashboard
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </>
                                )}
                            </button>
                        </div>
                    </form>

                    <div className="mt-8">
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-200" />
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-white text-gray-500">
                                    System Access
                                </span>
                            </div>
                        </div>

                        <div className="mt-6 grid grid-cols-1 gap-3">
                            <div className="flex items-center justify-between px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-600 hover:bg-gray-100 transition-colors cursor-help group">
                                <span className="font-medium group-hover:text-medical-primary transition-colors">Demo Email:</span>
                                <span className="font-mono bg-white px-2 py-0.5 rounded border border-gray-200">admin@a1care.com</span>
                            </div>
                            <div className="flex items-center justify-between px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-600 hover:bg-gray-100 transition-colors cursor-help group">
                                <span className="font-medium group-hover:text-medical-primary transition-colors">Demo Pass:</span>
                                <span className="font-mono bg-white px-2 py-0.5 rounded border border-gray-200">Admin@123</span>
                            </div>
                        </div>
                    </div>
                </div>
                <p className="mt-4 text-center text-xs text-gray-400">
                    &copy; 2024 A1Care Hospital Management System. All rights reserved.
                </p>
            </div>
        </div>
    );
};

export default Login;
