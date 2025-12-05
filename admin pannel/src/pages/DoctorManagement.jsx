import { useEffect, useState } from 'react';
import axios from 'axios';
import DataTable from '../components/DataTable';
import DoctorProfileModal from '../components/DoctorProfileModal';
import AddDoctorModal from '../components/AddDoctorModal';
import { Check, X, Eye, Stethoscope, MoreVertical } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const DoctorManagement = () => {
    const [doctors, setDoctors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDoctor, setSelectedDoctor] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);

    useEffect(() => {
        fetchDoctors();
    }, []);

    const fetchDoctors = async () => {
        try {
            const response = await axios.get(`${API_URL}/admin/doctors`);
            if (response.data.success) {
                // Transform doctors data to flatten userId fields
                const transformedDoctors = response.data.doctors.map(doctor => ({
                    ...doctor,
                    name: doctor.userId?.name || doctor.name || 'Unknown',
                    email: doctor.userId?.email || doctor.email,
                    mobile_number: doctor.userId?.mobile_number || doctor.mobile_number,
                    profile_image: doctor.userId?.profile_image || doctor.profile_image
                }));
                setDoctors(transformedDoctors);
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
            render: (doctor) => (
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary-light text-primary flex items-center justify-center font-bold text-sm overflow-hidden">
                        {doctor.profile_image ? (
                            <img
                                src={doctor.profile_image?.startsWith('http') ? doctor.profile_image : `${API_URL.replace('/api', '')}${doctor.profile_image}`}
                                alt={doctor.name}
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            doctor.name?.charAt(0) || 'Dr'
                        )}
                    </div>
                    <div>
                        <div className="font-semibold text-dark-header">{doctor.name}</div>
                        <div className="text-xs text-gray-500">General Physician</div>
                    </div>
                </div>
            )
        },
        {
            key: 'specializations',
            label: 'Specialization',
            render: (doctor) => (
                doctor.specializations && doctor.specializations.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                        {doctor.specializations.map((spec, i) => (
                            <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-medium">
                                {spec}
                            </span>
                        ))}
                    </div>
                ) : <span className="text-gray-400 italic">Not specified</span>
            )
        },
        { key: 'experience', label: 'Exp', sortable: true, render: (doctor) => <span className="font-bold text-dark-body">{doctor.experience || 0} Yrs</span> },
        { key: 'consultation_fee', label: 'Fee', render: (doctor) => <span className="font-medium text-primary">₹{doctor.consultation_fee}</span> },
        {
            key: 'status',
            label: 'Status',
            render: (doctor) => (
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${doctor.status === 'Active' ? 'bg-success-light text-success' :
                    doctor.status === 'Pending' ? 'bg-warning-light text-warning' :
                        'bg-danger-light text-danger'
                    }`}>
                    {doctor.status}
                </span>
            )
        },
        {
            key: 'actions',
            label: 'Actions',
            render: (doctor) => (
                <div className="flex gap-2">
                    {/* Show Approve button if not Active */}
                    {doctor.status !== 'Active' && (
                        <button
                            onClick={(e) => { e.stopPropagation(); handleStatusChange(doctor._id, 'approve'); }}
                            className="p-2 text-success hover:bg-success-light rounded-lg transition-colors"
                            title="Approve & Activate"
                        >
                            <Check className="h-4 w-4" />
                        </button>
                    )}

                    {/* Show Reject button if not Rejected */}
                    {doctor.status !== 'Rejected' && (
                        <button
                            onClick={(e) => { e.stopPropagation(); handleStatusChange(doctor._id, 'reject'); }}
                            className="p-2 text-danger hover:bg-danger-light rounded-lg transition-colors"
                            title="Reject"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}

                    {/* Always show View button */}
                    <button
                        className="p-2 text-gray-500 hover:text-primary hover:bg-primary-light rounded-lg transition-colors"
                        onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDoctor(doctor);
                        }}
                    >
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
                <button
                    onClick={() => setShowAddModal(true)}
                    className="px-5 py-2.5 bg-primary text-white rounded-lg shadow-lg shadow-primary/40 hover:bg-primary-hover transition-all font-medium flex items-center gap-2"
                >
                    <Stethoscope className="h-4 w-4" />
                    Add New Doctor
                </button>
            </div>

            <DataTable
                columns={columns}
                data={doctors}
                isLoading={loading}
            />

            {/* Doctor Profile Modal */}
            {selectedDoctor && (
                <DoctorProfileModal
                    doctor={selectedDoctor}
                    onClose={() => setSelectedDoctor(null)}
                    onUpdate={fetchDoctors}
                />
            )}

            {/* Add Doctor Modal */}
            {showAddModal && (
                <AddDoctorModal
                    onClose={() => setShowAddModal(false)}
                    onSuccess={() => {
                        setShowAddModal(false);
                        fetchDoctors();
                    }}
                />
            )}
        </div>
    );
};

export default DoctorManagement;
