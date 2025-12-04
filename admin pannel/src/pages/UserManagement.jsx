import { useEffect, useState } from 'react';
import axios from 'axios';
import DataTable from '../components/DataTable';
import { Eye, Trash2 } from 'lucide-react';

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
        { key: 'name', label: 'Name', sortable: true },
        { key: 'mobile_number', label: 'Mobile Number', sortable: true },
        { key: 'email', label: 'Email', sortable: true },
        {
            key: 'created_at',
            label: 'Joined Date',
            sortable: true,
            render: (value) => new Date(value).toLocaleDateString()
        },
        {
            key: 'role',
            label: 'Role',
            render: (value) => (
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                    {value}
                </span>
            )
        },
        {
            key: 'actions',
            label: 'Actions',
            render: (_, user) => (
                <div className="flex gap-2">
                    <button className="p-1 text-gray-500 hover:text-blue-600 transition-colors">
                        <Eye className="h-4 w-4" />
                    </button>
                </div>
            )
        }
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Patient Management</h1>
                <p className="text-gray-500 mt-1">View and manage registered patients</p>
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
