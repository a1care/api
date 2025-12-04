import { useEffect, useState } from 'react';
import axios from 'axios';
import DataTable from '../components/DataTable';
import { Eye, Shield, User } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'https://api-esf1.onrender.com/api';

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await axios.get(`${API_URL}/admin/users`);
            if (response.data.success) {
                setUsers(response.data.users);
            }
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    const columns = [
        {
            key: 'name',
            label: 'User',
            sortable: true,
            render: (value, user) => (
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary-light text-primary flex items-center justify-center font-bold text-sm">
                        {value?.charAt(0) || <User className="h-5 w-5" />}
                    </div>
                    <div>
                        <div className="font-semibold text-dark-header">{value}</div>
                        <div className="text-xs text-gray-500">@{value?.toLowerCase().replace(/\s/g, '')}</div>
                    </div>
                </div>
            )
        },
        { key: 'mobile_number', label: 'Contact', sortable: true },
        { key: 'email', label: 'Email', sortable: true },
        {
            key: 'role',
            label: 'Role',
            render: (value) => (
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${value === 'Doctor' ? 'bg-info-light text-info' : 'bg-success-light text-success'
                    }`}>
                    {value === 'Doctor' ? <Shield className="w-3 h-3 mr-1" /> : <User className="w-3 h-3 mr-1" />}
                    {value}
                </span>
            )
        },
        {
            key: 'actions',
            label: 'Actions',
            render: (_, user) => (
                <div className="flex gap-2">
                    <button className="p-2 text-gray-500 hover:text-primary hover:bg-primary-light rounded-lg transition-all" title="View Details">
                        <Eye className="h-4 w-4" />
                    </button>
                </div>
            )
        }
    ];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold text-dark-header">User List</h1>
                    <p className="text-gray-500 mt-1 text-sm">Manage all registered users and their roles</p>
                </div>
                <div className="flex gap-3">
                    <div className="bg-white px-4 py-2 rounded-lg shadow-soft border border-gray-100 flex flex-col items-center">
                        <span className="text-xs text-gray-500 font-bold uppercase">Total Users</span>
                        <span className="text-lg font-bold text-primary">{users.length}</span>
                    </div>
                </div>
            </div>

            <DataTable
                columns={columns}
                data={users}
                isLoading={loading}
            />
        </div>
    );
};

export default UserManagement;
