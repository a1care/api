import { useEffect, useState } from 'react';
import axios from 'axios';
import { Plus, Filter, Calendar, DollarSign, User, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import DataTable from '../components/DataTable';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const BOOKING_STATUSES = [
    { key: 'all', label: 'All Bookings', color: 'gray' },
    { key: 'New', label: 'New', color: 'blue' },
    { key: 'Accepted', label: 'Accepted', color: 'green' },
    { key: 'Assigned', label: 'Assigned', color: 'purple' },
    { key: 'Confirmed', label: 'Confirmed', color: 'teal' },
    { key: 'Completed', label: 'Completed', color: 'success' },
    { key: 'Cancelled', label: 'Cancelled', color: 'danger' }
];

const BookingManagement = () => {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all');
    const [statusCounts, setStatusCounts] = useState({});
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);

    useEffect(() => {
        fetchBookings();
    }, [activeTab]);

    const fetchBookings = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_URL}/admin/bookings`, {
                params: { status: activeTab }
            });
            if (response.data.success) {
                setBookings(response.data.bookings);
                setStatusCounts(response.data.statusCounts || {});
            }
        } catch (error) {
            console.error('Error fetching bookings:', error);
            toast.error('Failed to load bookings');
        } finally {
            setLoading(false);
        }
    };

    const handleStatusAction = async (bookingId, action, data = {}) => {
        try {
            await axios.put(`${API_URL}/admin/bookings/${bookingId}/${action}`, data);
            toast.success(`Booking ${action}ed successfully`);
            fetchBookings();
        } catch (error) {
            console.error(`Error ${action}ing booking:`, error);
            toast.error(`Failed to ${action} booking`);
        }
    };

    const getStatusBadge = (status) => {
        const colors = {
            'New': 'bg-blue-100 text-blue-700',
            'Accepted': 'bg-green-100 text-green-700',
            'Assigned': 'bg-purple-100 text-purple-700',
            'Confirmed': 'bg-teal-100 text-teal-700',
            'Completed': 'bg-success-light text-success',
            'Cancelled': 'bg-danger-light text-danger'
        };
        return colors[status] || 'bg-gray-100 text-gray-700';
    };

    const getPaymentBadge = (mode, status) => {
        if (mode === 'COD') {
            return status === 'PAID' ?
                'bg-success-light text-success' :
                'bg-warning-light text-warning';
        }
        return status === 'PAID' ?
            'bg-success-light text-success' :
            'bg-gray-100 text-gray-600';
    };

    const columns = [
        {
            key: 'bookingId',
            label: 'Booking ID',
            render: (booking) => (
                <span className="font-mono text-sm font-bold text-primary">
                    #{booking._id?.slice(-8).toUpperCase()}
                </span>
            )
        },
        {
            key: 'user',
            label: 'Patient',
            render: (booking) => (
                <div>
                    <div className="font-semibold text-dark-header">{booking.userId?.name}</div>
                    <div className="text-xs text-gray-500">{booking.userId?.mobile_number}</div>
                </div>
            )
        },
        {
            key: 'booking_date',
            label: 'Date',
            render: (booking) => (
                <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">
                        {new Date(booking.booking_date).toLocaleDateString('en-IN')}
                    </span>
                </div>
            )
        },
        {
            key: 'assigned_doctor',
            label: 'Assigned To',
            render: (booking) => booking.assigned_doctor ? (
                <span className="text-sm font-medium text-gray-700">
                    Dr. {booking.assigned_doctor.userId?.name}
                </span>
            ) : (
                <span className="text-sm text-gray-400 italic">Not assigned</span>
            )
        },
        {
            key: 'amount',
            label: 'Amount',
            render: (booking) => (
                <div className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4 text-gray-400" />
                    <span className="font-bold text-dark-body">₹{booking.total_amount}</span>
                </div>
            )
        },
        {
            key: 'payment',
            label: 'Payment',
            render: (booking) => (
                <div>
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${getPaymentBadge(booking.payment_mode, booking.payment_status)}`}>
                        {booking.payment_mode}
                    </span>
                    <div className="text-xs text-gray-500 mt-1">{booking.payment_status}</div>
                </div>
            )
        },
        {
            key: 'status',
            label: 'Status',
            render: (booking) => (
                <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold uppercase ${getStatusBadge(booking.status)}`}>
                    {booking.status}
                </span>
            )
        },
        {
            key: 'actions',
            label: 'Actions',
            render: (booking) => (
                <div className="flex gap-2">
                    {booking.status === 'New' && (
                        <button
                            onClick={() => handleStatusAction(booking._id, 'accept')}
                            className="px-3 py-1 bg-success text-white rounded text-xs font-semibold hover:bg-success/90"
                        >
                            Accept
                        </button>
                    )}
                    {booking.status === 'Accepted' && (
                        <button
                            onClick={() => setSelectedBooking(booking)}
                            className="px-3 py-1 bg-purple-600 text-white rounded text-xs font-semibold hover:bg-purple-700"
                        >
                            Assign
                        </button>
                    )}
                    {booking.status === 'Assigned' && (
                        <button
                            onClick={() => handleStatusAction(booking._id, 'confirm')}
                            className="px-3 py-1 bg-teal-600 text-white rounded text-xs font-semibold hover:bg-teal-700"
                        >
                            Confirm
                        </button>
                    )}
                    {booking.status === 'Confirmed' && (
                        <button
                            onClick={() => handleStatusAction(booking._id, 'complete', { payment_status: 'PAID' })}
                            className="px-3 py-1 bg-primary text-white rounded text-xs font-semibold hover:bg-primary-hover"
                        >
                            Complete
                        </button>
                    )}
                    {!['Completed', 'Cancelled'].includes(booking.status) && (
                        <button
                            onClick={() => handleStatusAction(booking._id, 'cancel', { reason: 'Cancelled by admin' })}
                            className="px-3 py-1 bg-danger text-white rounded text-xs font-semibold hover:bg-danger/90"
                        >
                            Cancel
                        </button>
                    )}
                </div>
            )
        }
    ];

    return (
        <div className="space-y-6">
            <Toaster position="top-right" />

            {/* Header */}
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold text-dark-header">Booking Management</h1>
                    <p className="text-gray-500 mt-1 text-sm">Manage patient bookings and appointments</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="px-5 py-2.5 bg-primary text-white rounded-lg shadow-lg shadow-primary/40 hover:bg-primary-hover transition-all font-medium flex items-center gap-2"
                >
                    <Plus className="h-4 w-4" />
                    Add CRM Booking
                </button>
            </div>

            {/* Status Tabs */}
            <div className="bg-white rounded-lg shadow-soft p-2 flex gap-2 overflow-x-auto">
                {BOOKING_STATUSES.map(status => (
                    <button
                        key={status.key}
                        onClick={() => setActiveTab(status.key)}
                        className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all whitespace-nowrap ${activeTab === status.key
                            ? 'bg-primary text-white shadow-lg shadow-primary/30'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        {status.label}
                        {statusCounts[status.key] > 0 && (
                            <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                                {statusCounts[status.key]}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Bookings Table */}
            <DataTable
                columns={columns}
                data={bookings}
                isLoading={loading}
            />

            {/* Modals would go here */}
            {selectedBooking && (
                <AssignDoctorModal
                    booking={selectedBooking}
                    onClose={() => setSelectedBooking(null)}
                    onSuccess={() => {
                        setSelectedBooking(null);
                        fetchBookings();
                    }}
                />
            )}
        </div>
    );
};

// Assign Doctor Modal Component
const AssignDoctorModal = ({ booking, onClose, onSuccess }) => {
    const [doctors, setDoctors] = useState([]);
    const [selectedDoctor, setSelectedDoctor] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchDoctors();
    }, []);

    const fetchDoctors = async () => {
        try {
            const response = await axios.get(`${API_URL}/admin/doctors`);
            if (response.data.success) {
                // Only show active doctors
                const activeDoctors = response.data.doctors.filter(d => d.status === 'Active');
                setDoctors(activeDoctors);
            }
        } catch (error) {
            console.error('Error fetching doctors:', error);
            toast.error('Failed to load doctors');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedDoctor) {
            toast.error('Please select a doctor');
            return;
        }

        setSubmitting(true);
        try {
            await axios.put(`${API_URL}/admin/bookings/${booking._id}/assign`, {
                doctorId: selectedDoctor
            });
            toast.success('Doctor assigned successfully');
            onSuccess();
        } catch (error) {
            console.error('Error assigning doctor:', error);
            toast.error('Failed to assign doctor');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-dark/50 flex items-center justify-center z-50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
                <h3 className="text-xl font-bold text-dark-header mb-4">Assign Doctor</h3>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-dark-body mb-2">
                            Select Doctor
                        </label>
                        <select
                            value={selectedDoctor}
                            onChange={(e) => setSelectedDoctor(e.target.value)}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary"
                            required
                        >
                            <option value="">Choose a doctor...</option>
                            {doctors.map(doctor => (
                                <option key={doctor._id} value={doctor._id}>
                                    Dr. {doctor.userId?.name} - {doctor.specializations?.join(', ')}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 bg-gray-100 text-dark-body rounded-lg hover:bg-gray-200 font-semibold"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="flex-1 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-hover font-bold shadow-lg shadow-primary/30 disabled:opacity-50"
                        >
                            {submitting ? 'Assigning...' : 'Assign Doctor'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default BookingManagement;
