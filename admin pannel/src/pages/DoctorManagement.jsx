import { useEffect, useState } from 'react';
import axios from 'axios';
import DataTable from '../components/DataTable';
import { Check, X, Eye, Stethoscope, MoreVertical } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

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
        {
            key: 'name',
            label: 'Doctor',
            sortable: true,
            render: (value) => (
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-info-light text-info flex items-center justify-center font-bold">
                        Dr
                    </div>
                    <div>
                        <div className="font-semibold text-dark-header">{value}</div>
                        <div className="text-xs text-gray-500">General Physician</div>
                    </div>
                </div>
            )
        },
        {
            key: 'specializations',
            label: 'Specialization',
            render: (val) => (
                val && val.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                        {val.map((spec, i) => (
                            <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-medium">
                                {spec}
                            </span>
                        ))}
                    </div>
                ) : <span className="text-gray-400 italic">Not specified</span>
            )
        },
        { key: 'experience', label: 'Exp', sortable: true, render: (val) => <span className="font-bold text-dark-body">{val || 0} Yrs</span> },
        { key: 'consultation_fee', label: 'Fee', render: (val) => <span className="font-medium text-primary">₹{val}</span> },
        {
            key: 'status',
            label: 'Status',
            render: (status) => (
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${status === 'Active' ? 'bg-success-light text-success' :
                    status === 'Pending' ? 'bg-warning-light text-warning' :
                        'bg-danger-light text-danger'
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
                                className="p-2 text-success hover:bg-success-light rounded-lg transition-colors"
                                title="Approve"
                            >
                                <Check className="h-4 w-4" />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleStatusChange(doctor._id, 'reject'); }}
                                className="p-2 text-danger hover:bg-danger-light rounded-lg transition-colors"
                                title="Reject"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </>
                    )}
                    <button className="p-2 text-gray-500 hover:text-primary hover:bg-primary-light rounded-lg transition-colors">
                        <Eye className="h-4 w-4" />
                    </button>
                </div>
            )
        }
    ];

    return (
        <div className="space-y-6">
            <Toaster position="top-right" />
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold text-dark-header">Doctors</h1>
                    <p className="text-gray-500 mt-1 text-sm">Manage doctor profiles and verification requests</p>
                </div>
                <button className="px-5 py-2.5 bg-primary text-white rounded-lg shadow-lg shadow-primary/40 hover:bg-primary-hover transition-all font-medium flex items-center gap-2">
                    <Stethoscope className="h-4 w-4" />
                    Add New Doctor
                </button>
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
