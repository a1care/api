import { useEffect, useState } from 'react';
import axios from 'axios';
import { Users, Stethoscope, Calendar, Activity, ArrowRight, Clock, CheckCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import StatCard from '../components/StatCard';

const API_URL = import.meta.env.VITE_API_URL || 'https://api-esf1.onrender.com/api';

const Dashboard = () => {
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalDoctors: 0,
        totalBookings: 0,
        totalServices: 0,
        pendingDoctors: 0,
        activeDoctors: 0
    });
    const [recentBookings, setRecentBookings] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const response = await axios.get(`${API_URL}/admin/dashboard/stats`);
            if (response.data.success) {
                setStats(response.data.stats);
                setRecentBookings(response.data.recentBookings || []);
            }
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Mock data for charts
    const chartData = [
        { name: 'Mon', bookings: 4, users: 2 },
        { name: 'Tue', bookings: 3, users: 5 },
        { name: 'Wed', bookings: 7, users: 8 },
        { name: 'Thu', bookings: 5, users: 4 },
        { name: 'Fri', bookings: 9, users: 7 },
        { name: 'Sat', bookings: 12, users: 10 },
        { name: 'Sun', bookings: 8, users: 6 },
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-medical-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 font-sans">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold text-medical-text">Hospital Overview</h1>
                    <p className="text-medical-muted mt-1 text-sm">Real-time administration dashboard</p>
                </div>
                <div className="text-sm text-medical-muted bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    System Operational
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Total Patients"
                    value={stats.totalUsers}
                    icon={Users}
                    color="medical-primary"
                    trend={{ value: 12, isPositive: true }}
                />
                <StatCard
                    title="Medical Staff"
                    value={stats.activeDoctors}
                    icon={Stethoscope}
                    color="green"
                    trend={{ value: 5, isPositive: true }}
                />
                <StatCard
                    title="Appointments"
                    value={stats.totalBookings}
                    icon={Calendar}
                    color="medical-accent"
                    trend={{ value: 8, isPositive: true }}
                />
                <StatCard
                    title="Active Services"
                    value={stats.totalServices}
                    icon={Activity}
                    color="orange"
                />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-medical-text">Appointment Trends</h3>
                        <select className="text-xs border-slate-200 rounded-lg text-slate-500 focus:ring-medical-primary">
                            <option>Last 7 Days</option>
                            <option>Last 30 Days</option>
                        </select>
                    </div>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorBookings" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#0F766E" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#0F766E" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(15 118 110 / 0.1)' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="bookings"
                                    stroke="#0F766E"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#colorBookings)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-medical-text">Patient Growth</h3>
                        <div className="flex gap-2">
                            <span className="flex items-center text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full font-medium">
                                <ArrowUp className="h-3 w-3 mr-1" /> +12%
                            </span>
                        </div>
                    </div>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(15 118 110 / 0.1)' }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="users"
                                    stroke="#06B6D4"
                                    strokeWidth={2}
                                    dot={{ r: 4, fill: '#06B6D4', strokeWidth: 2, stroke: '#fff' }}
                                    activeDot={{ r: 6, fill: '#0F766E' }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Recent Activity & Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Bookings Table */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                        <h3 className="text-lg font-bold text-medical-text">Recent Appointments</h3>
                        <button className="text-sm text-medical-primary hover:text-teal-800 font-medium flex items-center">
                            View All <ArrowRight className="h-4 w-4 ml-1" />
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Patient</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Service</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {recentBookings.length > 0 ? (
                                    recentBookings.map((booking) => (
                                        <tr key={booking._id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center">
                                                    <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs mr-3">
                                                        {booking.userId?.name?.charAt(0) || 'U'}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-medium text-slate-900">{booking.userId?.name || 'Unknown'}</div>
                                                        <div className="text-xs text-slate-500">{booking.userId?.mobile_number}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-600">{booking.itemDetails?.name || 'Service'}</td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${booking.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' :
                                                        booking.status === 'Cancelled' ? 'bg-red-100 text-red-800' :
                                                            'bg-blue-100 text-blue-800'
                                                    }`}>
                                                    {booking.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm font-medium text-slate-900">₹{booking.amount}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-12 text-center text-slate-500 text-sm">
                                            No recent appointments found
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                    <h3 className="text-lg font-bold text-medical-text mb-4">Quick Actions</h3>
                    <div className="space-y-3">
                        <button className="w-full flex items-center justify-between p-4 rounded-lg border border-slate-200 hover:border-medical-primary hover:bg-teal-50 transition-all group">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-teal-100 rounded-lg text-medical-primary group-hover:bg-white transition-colors">
                                    <Stethoscope className="h-5 w-5" />
                                </div>
                                <div className="text-left">
                                    <div className="text-sm font-medium text-slate-900">Verify Doctor</div>
                                    <div className="text-xs text-slate-500">Review pending applications</div>
                                </div>
                            </div>
                            <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-medical-primary" />
                        </button>

                        <button className="w-full flex items-center justify-between p-4 rounded-lg border border-slate-200 hover:border-medical-primary hover:bg-teal-50 transition-all group">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 rounded-lg text-blue-600 group-hover:bg-white transition-colors">
                                    <Activity className="h-5 w-5" />
                                </div>
                                <div className="text-left">
                                    <div className="text-sm font-medium text-slate-900">Add Service</div>
                                    <div className="text-xs text-slate-500">Create new medical service</div>
                                </div>
                            </div>
                            <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-medical-primary" />
                        </button>

                        <button className="w-full flex items-center justify-between p-4 rounded-lg border border-slate-200 hover:border-medical-primary hover:bg-teal-50 transition-all group">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-100 rounded-lg text-purple-600 group-hover:bg-white transition-colors">
                                    <Users className="h-5 w-5" />
                                </div>
                                <div className="text-left">
                                    <div className="text-sm font-medium text-slate-900">Patient Records</div>
                                    <div className="text-xs text-slate-500">Search patient database</div>
                                </div>
                            </div>
                            <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-medical-primary" />
                        </button>
                    </div>

                    <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-100">
                        <div className="flex items-start gap-3">
                            <Clock className="h-5 w-5 text-slate-400 mt-0.5" />
                            <div>
                                <div className="text-xs font-medium text-slate-900 uppercase tracking-wide">System Status</div>
                                <div className="text-xs text-slate-500 mt-1">Last backup completed 2 hours ago. All systems nominal.</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
