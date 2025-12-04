import { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Search, Calendar, DollarSign, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const AddBookingModal = ({ onClose, onSuccess }) => {
    const [step, setStep] = useState(1); // 1: User Selection, 2: Service Selection, 3: Details
    const [users, setUsers] = useState([]);
    const [services, setServices] = useState([]);
    const [doctors, setDoctors] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        userId: '',
        userName: '',
        userMobile: '',
        userEmail: '',
        createNewUser: false,
        serviceType: 'Doctor', // Doctor, LabTest, Equipment, Ambulance
        doctorId: '',
        itemId: '',
        serviceId: '',
        booking_date: '',
        slot_start: '',
        slot_end: '',
        consultation_fee: 0,
        item_price: 0,
        platform_fee: 50,
        payment_mode: 'COD',
        admin_notes: ''
    });

    useEffect(() => {
        fetchUsers();
        fetchDoctors();
        fetchServices();
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await axios.get(`${API_URL}/admin/users`);
            if (response.data.success) {
                setUsers(response.data.users);
            }
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    };

    const fetchDoctors = async () => {
        try {
            const response = await axios.get(`${API_URL}/admin/doctors`);
            if (response.data.success) {
                setDoctors(response.data.doctors.filter(d => d.status === 'Active'));
            }
        } catch (error) {
            console.error('Error fetching doctors:', error);
        }
    };

    const fetchServices = async () => {
        try {
            const response = await axios.get(`${API_URL}/booking/services`);
            if (response.data.success) {
                setServices(response.data.services || []);
            }
        } catch (error) {
            console.error('Error fetching services:', error);
        }
    };

    const handleUserSelect = (user) => {
        setFormData(prev => ({
            ...prev,
            userId: user._id,
            userName: user.name,
            userMobile: user.mobile_number,
            userEmail: user.email,
            createNewUser: false
        }));
        setStep(2);
    };

    const handleCreateNewUser = () => {
        setFormData(prev => ({ ...prev, createNewUser: true }));
        setStep(2);
    };

    const handleDoctorSelect = (doctor) => {
        setFormData(prev => ({
            ...prev,
            doctorId: doctor._id,
            itemId: doctor.userId._id,
            itemType: 'User',
            consultation_fee: doctor.consultation_fee || 500
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            // If creating new user, create user first
            let userId = formData.userId;
            if (formData.createNewUser) {
                const userResponse = await axios.post(`${API_URL}/auth/register`, {
                    name: formData.userName,
                    mobile_number: formData.userMobile,
                    email: formData.userEmail,
                    role: 'User'
                });
                userId = userResponse.data.user._id;
            }

            // Create booking
            const bookingData = {
                userId,
                doctorId: formData.doctorId,
                itemId: formData.itemId,
                itemType: formData.itemType || 'User',
                serviceId: formData.serviceId,
                booking_date: formData.booking_date,
                slot: formData.slot_start ? {
                    start_time: new Date(`${formData.booking_date}T${formData.slot_start}`),
                    end_time: new Date(`${formData.booking_date}T${formData.slot_end}`)
                } : undefined,
                consultation_fee: formData.consultation_fee,
                item_price: formData.item_price,
                platform_fee: formData.platform_fee,
                payment_mode: formData.payment_mode,
                admin_notes: formData.admin_notes
            };

            await axios.post(`${API_URL}/admin/bookings`, bookingData);
            toast.success('Booking created successfully!');
            onSuccess();
        } catch (error) {
            console.error('Error creating booking:', error);
            toast.error(error.response?.data?.message || 'Failed to create booking');
        } finally {
            setSubmitting(false);
        }
    };

    const filteredUsers = users.filter(user =>
        user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.mobile_number?.includes(searchQuery) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="fixed inset-0 bg-dark/50 flex items-center justify-center z-50 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white rounded-xl max-w-2xl w-full my-8 shadow-2xl">
                {/* Header */}
                <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                    <div>
                        <h3 className="text-2xl font-bold text-dark-header">Create CRM Booking</h3>
                        <p className="text-sm text-gray-500 mt-1">
                            Step {step} of 3: {step === 1 ? 'Select Patient' : step === 2 ? 'Choose Service' : 'Booking Details'}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-dark">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Step 1: User Selection */}
                {step === 1 && (
                    <div className="p-6 space-y-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search by name, mobile, or email..."
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/50"
                            />
                        </div>

                        <div className="max-h-96 overflow-y-auto space-y-2">
                            {filteredUsers.slice(0, 10).map(user => (
                                <button
                                    key={user._id}
                                    onClick={() => handleUserSelect(user)}
                                    className="w-full p-4 border border-gray-200 rounded-lg hover:border-primary hover:bg-primary-light/10 transition-all text-left"
                                >
                                    <div className="font-semibold text-dark-header">{user.name}</div>
                                    <div className="text-sm text-gray-600">{user.mobile_number} • {user.email}</div>
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={handleCreateNewUser}
                            className="w-full py-3 border-2 border-dashed border-primary text-primary rounded-lg hover:bg-primary-light/20 font-semibold"
                        >
                            + Create New Patient
                        </button>
                    </div>
                )}

                {/* Step 2: Service Selection */}
                {step === 2 && (
                    <div className="p-6 space-y-4">
                        {formData.createNewUser && (
                            <div className="space-y-3 p-4 bg-blue-50 rounded-lg">
                                <h4 className="font-semibold text-dark-header">New Patient Details</h4>
                                <input
                                    type="text"
                                    placeholder="Full Name *"
                                    value={formData.userName}
                                    onChange={(e) => setFormData(prev => ({ ...prev, userName: e.target.value }))}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg"
                                    required
                                />
                                <input
                                    type="tel"
                                    placeholder="Mobile Number *"
                                    value={formData.userMobile}
                                    onChange={(e) => setFormData(prev => ({ ...prev, userMobile: e.target.value }))}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg"
                                    required
                                />
                                <input
                                    type="email"
                                    placeholder="Email"
                                    value={formData.userEmail}
                                    onChange={(e) => setFormData(prev => ({ ...prev, userEmail: e.target.value }))}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg"
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-semibold text-dark-body mb-2">Service Type</label>
                            <select
                                value={formData.serviceType}
                                onChange={(e) => setFormData(prev => ({ ...prev, serviceType: e.target.value }))}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg"
                            >
                                <option value="Doctor">Doctor Consultation</option>
                                <option value="LabTest">Lab Test</option>
                                <option value="Equipment">Medical Equipment</option>
                                <option value="Ambulance">Ambulance</option>
                            </select>
                        </div>

                        {formData.serviceType === 'Doctor' && (
                            <div>
                                <label className="block text-sm font-semibold text-dark-body mb-2">Select Doctor</label>
                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                    {doctors.map(doctor => (
                                        <button
                                            key={doctor._id}
                                            onClick={() => handleDoctorSelect(doctor)}
                                            className={`w-full p-3 border rounded-lg text-left transition-all ${formData.doctorId === doctor._id
                                                ? 'border-primary bg-primary-light/20'
                                                : 'border-gray-200 hover:border-primary'
                                                }`}
                                        >
                                            <div className="font-semibold text-dark-header">Dr. {doctor.userId?.name}</div>
                                            <div className="text-sm text-gray-600">{doctor.specializations?.join(', ')}</div>
                                            <div className="text-sm font-semibold text-primary">₹{doctor.consultation_fee}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex gap-3 pt-4">
                            <button
                                onClick={() => setStep(1)}
                                className="px-4 py-2.5 bg-gray-100 text-dark-body rounded-lg hover:bg-gray-200 font-semibold"
                            >
                                Back
                            </button>
                            <button
                                onClick={() => setStep(3)}
                                disabled={formData.serviceType === 'Doctor' && !formData.doctorId}
                                className="flex-1 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-hover font-bold disabled:opacity-50"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 3: Booking Details */}
                {step === 3 && (
                    <form onSubmit={handleSubmit} className="p-6 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-dark-body mb-2">
                                    <Calendar className="inline h-4 w-4 mr-1" />
                                    Booking Date *
                                </label>
                                <input
                                    type="date"
                                    value={formData.booking_date}
                                    onChange={(e) => setFormData(prev => ({ ...prev, booking_date: e.target.value }))}
                                    min={new Date().toISOString().split('T')[0]}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-dark-body mb-2">
                                    <DollarSign className="inline h-4 w-4 mr-1" />
                                    Payment Mode
                                </label>
                                <select
                                    value={formData.payment_mode}
                                    onChange={(e) => setFormData(prev => ({ ...prev, payment_mode: e.target.value }))}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg"
                                >
                                    <option value="COD">Cash on Delivery (COD)</option>
                                    <option value="Online">Online Payment</option>
                                    <option value="Insurance">Insurance</option>
                                </select>
                            </div>
                        </div>

                        {formData.serviceType === 'Doctor' && (
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-dark-body mb-2">Start Time</label>
                                    <input
                                        type="time"
                                        value={formData.slot_start}
                                        onChange={(e) => setFormData(prev => ({ ...prev, slot_start: e.target.value }))}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-dark-body mb-2">End Time</label>
                                    <input
                                        type="time"
                                        value={formData.slot_end}
                                        onChange={(e) => setFormData(prev => ({ ...prev, slot_end: e.target.value }))}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg"
                                    />
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-semibold text-dark-body mb-2">
                                <FileText className="inline h-4 w-4 mr-1" />
                                Admin Notes
                            </label>
                            <textarea
                                value={formData.admin_notes}
                                onChange={(e) => setFormData(prev => ({ ...prev, admin_notes: e.target.value }))}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg"
                                rows="3"
                                placeholder="Any special instructions or notes..."
                            />
                        </div>

                        <div className="bg-gray-50 p-4 rounded-lg">
                            <div className="flex justify-between text-sm mb-2">
                                <span>Consultation Fee:</span>
                                <span className="font-semibold">₹{formData.consultation_fee || formData.item_price}</span>
                            </div>
                            <div className="flex justify-between text-sm mb-2">
                                <span>Platform Fee:</span>
                                <span className="font-semibold">₹{formData.platform_fee}</span>
                            </div>
                            <div className="flex justify-between text-lg font-bold border-t pt-2">
                                <span>Total Amount:</span>
                                <span className="text-primary">₹{(formData.consultation_fee || formData.item_price) + formData.platform_fee}</span>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button
                                type="button"
                                onClick={() => setStep(2)}
                                className="px-4 py-2.5 bg-gray-100 text-dark-body rounded-lg hover:bg-gray-200 font-semibold"
                            >
                                Back
                            </button>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="flex-1 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-hover font-bold shadow-lg shadow-primary/30 disabled:opacity-50"
                            >
                                {submitting ? 'Creating Booking...' : 'Create Booking'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default AddBookingModal;
