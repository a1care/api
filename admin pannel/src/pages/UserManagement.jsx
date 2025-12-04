import { useEffect, useState } from 'react';
import axios from 'axios';
import DataTable from '../components/DataTable';
import { Eye, Shield } from 'lucide-react';

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
            label: 'Patient Name',
            sortable: true,
            render: (value) => (
                <div className="font-medium text-slate-900">{value}</div>
            )
        },
        { key: 'mobile_number', label: 'Mobile Number', sortable: true },
        { key: 'email', label: 'Email', sortable: true },
        {
            key: 'created_at',
            label: 'Registration Date',
            sortable: true,
            render: (value) => <span className="text-slate-500">{new Date(value).toLocaleDateString()}</span>
        },
        {
            key: 'role',
            label: 'Role',
            render: (value) => (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800 border border-teal-200">
                    <Shield className="w-3 h-3 mr-1" />
                    {value}
                </span>
            )
        },
        {
            key: 'actions',
            label: 'Actions',
            render: (_, user) => (
                <div className="flex gap-2">
                    <button className="p-1.5 text-slate-400 hover:text-medical-primary hover:bg-teal-50 rounded-lg transition-all" title="View Details">
                        <Eye className="h-4 w-4" />
                    </button>
                </div>
            )
        }
    ];

    return (
        <div className="space-y-6 font-sans">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold text-medical-text">Patient Directory</h1>
                    <p className="text-medical-muted mt-1 text-sm">Manage registered patient records and history</p>
                </div>
                <div className="text-sm text-medical-muted bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm">
                    Total Patients: <span className="font-bold text-medical-primary">{users.length}</span>
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
