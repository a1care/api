import { useEffect, useState } from 'react';
import axios from 'axios';
import { Users, Stethoscope, Calendar, Activity, TrendingUp, DollarSign } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import StatCard from '../components/StatCard';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

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
        const fetchDashboardData = async () => {
            try {
                const response = await axios.get(`${API_URL}/admin/dashboard/stats`);
                if (response.data.success) {
                    setStats(response.data.stats);
                    setRecentBookings(response.data.recentBookings || []);
                }
            } catch (error) {
                console.error('Error fetching dashboard stats:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    // Mock data for charts
    const chartData = [
        { name: 'Mon', bookings: 4, revenue: 2400 },
        { name: 'Tue', bookings: 3, revenue: 1398 },
        { name: 'Wed', bookings: 9, revenue: 9800 },
        { name: 'Thu', bookings: 2, revenue: 3908 },
        { name: 'Fri', bookings: 6, revenue: 4800 },
        { name: 'Sat', bookings: 8, revenue: 3800 },
        { name: 'Sun', bookings: 5, revenue: 4300 },
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Total Patients"
                    value={stats.totalUsers}
                    icon={Users}
                    trend="up"
                    trendValue="12%"
                    color="primary"
                />
                <StatCard
                    title="Active Doctors"
                    value={stats.activeDoctors}
                    icon={Stethoscope}
                    trend="up"
                    trendValue="5%"
                    color="success"
                />
                <StatCard
                    title="Total Bookings"
                    value={stats.totalBookings}
                    icon={Calendar}
                    trend="up"
                    trendValue="18%"
                    color="warning"
                />
                <StatCard
                    title="Revenue"
                    value="₹45k"
                    icon={DollarSign}
                    trend="down"
                    trendValue="2%"
                    color="danger"
                />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Chart */}
                <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-card">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-dark-header">Revenue Analytics</h3>
                            <p className="text-sm text-gray-500">Weekly earnings overview</p>
                        </div>
                        <div className="flex gap-2">
                            <button className="px-3 py-1 text-xs font-medium bg-primary/10 text-primary rounded-md">Weekly</button>
                            <button className="px-3 py-1 text-xs font-medium text-gray-500 hover:bg-gray-50 rounded-md">Monthly</button>
                        </div>
                    </div>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#7367F0" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#7367F0" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EBE9F1" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6E6B7B', fontSize: 12 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6E6B7B', fontSize: 12 }} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 4px 24px 0 rgba(34, 41, 47, 0.1)', border: 'none' }}
                                    itemStyle={{ color: '#7367F0' }}
                                />
                                <Area type="monotone" dataKey="revenue" stroke="#7367F0" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Side Chart / Activity */}
                <div className="bg-white p-6 rounded-xl shadow-card">
                    <h3 className="text-lg font-bold text-dark-header mb-1">Bookings</h3>
                    <p className="text-sm text-gray-500 mb-6">This week's activity</p>

                    <div className="h-48 mb-6">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}>
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 4px 24px 0 rgba(34, 41, 47, 0.1)', border: 'none' }}
                                />
                                <Line type="monotone" dataKey="bookings" stroke="#FF9F43" strokeWidth={3} dot={{ r: 4, fill: '#FF9F43', strokeWidth: 2, stroke: '#fff' }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                    <Activity className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-dark-header">Completed</p>
                                    <p className="text-xs text-gray-500">145 bookings</p>
                                </div>
                            </div>
                            <span className="text-success font-bold text-sm">+12%</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-warning/10 rounded-lg text-warning">
                                    <Calendar className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-dark-header">Pending</p>
                                    <p className="text-xs text-gray-500">24 bookings</p>
                                </div>
                            </div>
                            <span className="text-warning font-bold text-sm">5%</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Bookings Table */}
            <div className="bg-white rounded-xl shadow-card overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-dark-header">Recent Bookings</h3>
                    <button className="text-primary text-sm font-medium hover:underline">View All</button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Patient</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {recentBookings.length > 0 ? (
                                recentBookings.map((booking) => (
                                    <tr key={booking._id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="h-8 w-8 rounded-full bg-primary-light text-primary flex items-center justify-center font-bold text-xs mr-3">
                                                    {booking.userId?.name?.charAt(0) || 'U'}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-medium text-dark-header">{booking.userId?.name || 'Unknown'}</div>
                                                    <div className="text-xs text-gray-500">{booking.userId?.mobile_number}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(booking.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-success-light text-success">
                                                Confirmed
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-dark-header">
                                            ₹500
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                                        No recent bookings found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
