import { useEffect, useState } from 'react';
import axios from 'axios';
import DataTable from '../components/DataTable';
import { Check, X, Eye } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'https://api-esf1.onrender.com/api';

const DoctorManagement = () => {
    const [doctors, setDoctors] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDoctors();
    }, []);

    const fetchDoctors = async () => {
        try {
            const response = await axios.get(`${API_URL}/admin/doctors`);
            if (response.data.success) {
                setDoctors(response.data.doctors);
            }
        } catch (error) {
            console.error('Error fetching doctors:', error);
            toast.error('Failed to load doctors');
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (doctorId, action) => {
        try {
            const endpoint = action === 'approve' ? 'approve' : 'reject';
            await axios.put(`${API_URL}/admin/doctors/${doctorId}/${endpoint}`);

            toast.success(`Doctor ${action}d successfully`);
            fetchDoctors();
        } catch (error) {
            console.error('Error updating status:', error);
            toast.error(`Failed to ${action} doctor`);
        }
    };

    const columns = [
        { key: 'name', label: 'Doctor Name', sortable: true },
        { key: 'specializations', label: 'Specialization', render: (val) => val?.join(', ') || '-' },
        { key: 'experience', label: 'Exp (Yrs)', sortable: true },
        { key: 'consultation_fee', label: 'Fee', render: (val) => `₹${val}` },
        {
            key: 'status',
            label: 'Status',
            render: (status) => (
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${status === 'Active' ? 'bg-green-100 text-green-800' :
                    status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                    }`}>
                    {status}
                </span>
            )
        },
        {
            key: 'actions',
            label: 'Actions',
            render: (_, doctor) => (
                <div className="flex gap-2">
                    {doctor.status === 'Pending' && (
                        <>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleStatusChange(doctor._id, 'approve'); }}
                                className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                                title="Approve"
                            >
                                <Check className="h-4 w-4" />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleStatusChange(doctor._id, 'reject'); }}
                                className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="Reject"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </>
                    )}
                    <button className="p-1 text-gray-500 hover:text-blue-600 transition-colors">
                        <Eye className="h-4 w-4" />
                    </button>
                </div>
            )
        }
    ];

    return (
        <div className="space-y-6">
            <Toaster position="top-right" />
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Doctor Management</h1>
                <p className="text-gray-500 mt-1">Review applications and manage doctor profiles</p>
            </div>

            <DataTable
                columns={columns}
                data={doctors}
                isLoading={loading}
            />
        </div>
    );
};

export default DoctorManagement;
