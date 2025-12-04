import { useEffect, useState } from 'react';
import axios from 'axios';
import DataTable from '../components/DataTable';
import { Check, X, Eye, Stethoscope } from 'lucide-react';
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
        {
            key: 'name',
            label: 'Medical Professional',
            sortable: true,
            render: (value) => (
                <div className="flex items-center">
                    <div className="h-8 w-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-xs mr-3 border border-teal-200">
                        Dr
                    </div>
                    <span className="font-medium text-slate-900">{value}</span>
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
                            <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs border border-slate-200">
                                {spec}
                            </span>
                        ))}
                    </div>
                ) : <span className="text-slate-400 italic">Not specified</span>
            )
        },
        { key: 'experience', label: 'Exp (Yrs)', sortable: true, render: (val) => <span className="font-mono text-slate-600">{val || 0}</span> },
        { key: 'consultation_fee', label: 'Fee', render: (val) => <span className="font-medium text-slate-900">₹{val}</span> },
        {
            key: 'status',
            label: 'Status',
            render: (status) => (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        status === 'Pending' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            'bg-red-50 text-red-700 border-red-200'
                    }`}>
                    <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${status === 'Active' ? 'bg-emerald-500' :
                            status === 'Pending' ? 'bg-amber-500' :
                                'bg-red-500'
                        }`}></span>
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
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors border border-transparent hover:border-emerald-200"
                                title="Approve Application"
                            >
                                <Check className="h-4 w-4" />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleStatusChange(doctor._id, 'reject'); }}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200"
                                title="Reject Application"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </>
                    )}
                    <button className="p-1.5 text-slate-400 hover:text-medical-primary hover:bg-teal-50 rounded-lg transition-colors" title="View Profile">
                        <Eye className="h-4 w-4" />
                    </button>
                </div>
            )
        }
    ];

    return (
        <div className="space-y-6 font-sans">
            <Toaster position="top-right" />
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold text-medical-text">Medical Staff</h1>
                    <p className="text-medical-muted mt-1 text-sm">Manage doctor profiles and verification requests</p>
                </div>
                <div className="flex gap-3">
                    <div className="text-sm text-medical-muted bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                        Pending: <span className="font-bold text-slate-900">{doctors.filter(d => d.status === 'Pending').length}</span>
                    </div>
                </div>
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
