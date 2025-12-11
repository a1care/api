import { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const DAYS_OF_WEEK = [
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
];

const COMMON_SPECIALIZATIONS = [
    'General Physician', 'Cardiologist', 'Pediatrician', 'Dermatologist',
    'Orthopedic', 'Gynecologist', 'Neurologist', 'Psychiatrist',
    'ENT Specialist', 'Ophthalmologist', 'Dentist', 'Radiologist'
];

const AddDoctorModal = ({ onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        mobile_number: '',
        specializations: [],
        offered_services: [],
        experience: '',
        consultation_fee: '',
        about: '',
        working_hours: []
    });

    const [newSpecialization, setNewSpecialization] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Initialize with all days, unchecked by default
    useEffect(() => {
        const initialHours = DAYS_OF_WEEK.map(day => ({
            day,
            enabled: false,
            start: '09:00',
            end: '17:00'
        }));
        setFormData(prev => ({ ...prev, working_hours: initialHours }));
    }, []);

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const addSpecialization = (spec) => {
        if (spec && !formData.specializations.includes(spec)) {
            setFormData(prev => ({
                ...prev,
                specializations: [...prev.specializations, spec]
            }));
        }
        setNewSpecialization('');
    };

    const removeSpecialization = (spec) => {
        setFormData(prev => ({
            ...prev,
            specializations: prev.specializations.filter(s => s !== spec)
        }));
    };

    // --- New: Custom Service Pricing Handlers ---
    const [newService, setNewService] = useState({
        serviceType: 'OPD',
        price: 500
    });

    const addOfferedService = () => {
        // Prevent duplicates
        if (formData.offered_services?.some(s => s.serviceType === newService.serviceType)) {
            toast.error('Service type already added');
            return;
        }

        setFormData(prev => ({
            ...prev,
            offered_services: [
                ...(prev.offered_services || []),
                { ...newService, is_active: true }
            ]
        }));
    };

    const removeOfferedService = (type) => {
        setFormData(prev => ({
            ...prev,
            offered_services: prev.offered_services.filter(s => s.serviceType !== type)
        }));
    };


    const toggleDay = (dayIndex) => {
        setFormData(prev => {
            const updated = [...prev.working_hours];
            updated[dayIndex].enabled = !updated[dayIndex].enabled;
            return { ...prev, working_hours: updated };
        });
    };

    const updateDayTime = (dayIndex, field, value) => {
        setFormData(prev => {
            const updated = [...prev.working_hours];
            updated[dayIndex][field] = value;
            return { ...prev, working_hours: updated };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation
        if (!formData.name || !formData.email || !formData.mobile_number) {
            toast.error('Please fill all required fields');
            return;
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            toast.error('Please enter a valid email address');
            return;
        }

        // Mobile number validation (10 digits)
        const mobileRegex = /^[0-9]{10}$/;
        if (!mobileRegex.test(formData.mobile_number)) {
            toast.error('Mobile number must be 10 digits');
            return;
        }

        setSubmitting(true);

        try {
            // Prepare data - only send enabled working hours
            const enabledHours = formData.working_hours
                .filter(wh => wh.enabled)
                .map(({ day, start, end }) => ({ day, start, end }));

            const payload = {
                ...formData,
                experience: parseInt(formData.experience) || 0,
                consultation_fee: parseInt(formData.consultation_fee) || 0,
                working_hours: enabledHours
            };

            await axios.post(`${API_URL}/admin/doctors`, payload);

            toast.success('Doctor added successfully!');
            onSuccess();
        } catch (error) {
            console.error('Error creating doctor:', error);
            toast.error(error.response?.data?.message || 'Failed to create doctor');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-dark/50 z-[100] backdrop-blur-sm overflow-y-auto" onClick={onClose}>
            <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
                <div
                    className="relative transform overflow-hidden bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-3xl rounded-xl p-6"
                    onClick={e => e.stopPropagation()}
                >
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-2xl font-bold text-dark-header">Add New Doctor</h3>
                        <button onClick={onClose} className="text-gray-400 hover:text-dark transition-colors">
                            <X className="h-6 w-6" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Basic Information */}
                        <div className="space-y-4">
                            <h4 className="text-lg font-bold text-dark-header border-b pb-2">Basic Information</h4>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-dark-body mb-1.5">
                                        Full Name <span className="text-danger">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => handleChange('name', e.target.value)}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm"
                                        placeholder="Dr. John Doe"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-dark-body mb-1.5">
                                        Email <span className="text-danger">*</span>
                                    </label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => handleChange('email', e.target.value)}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm"
                                        placeholder="doctor@example.com"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-dark-body mb-1.5">
                                        Mobile Number <span className="text-danger">*</span>
                                    </label>
                                    <input
                                        type="tel"
                                        value={formData.mobile_number}
                                        onChange={(e) => handleChange('mobile_number', e.target.value)}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm"
                                        placeholder="9876543210"
                                        maxLength="10"
                                        required
                                    />
                                    <p className="text-xs text-gray-500 mt-1">No OTP verification required</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-dark-body mb-1.5">
                                        Experience (Years)
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.experience}
                                        onChange={(e) => handleChange('experience', e.target.value)}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm"
                                        placeholder="5"
                                        min="0"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-dark-body mb-1.5">
                                        Consultation Fee (₹)
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.consultation_fee}
                                        onChange={(e) => handleChange('consultation_fee', e.target.value)}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm"
                                        placeholder="500"
                                        min="0"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Specializations */}
                        <div className="space-y-4">
                            <h4 className="text-lg font-bold text-dark-header border-b pb-2">Specializations</h4>

                            <div className="flex flex-wrap gap-2 mb-3">
                                {formData.specializations.map((spec, index) => (
                                    <span key={index} className="inline-flex items-center gap-2 px-3 py-1 bg-primary-light text-primary rounded-full text-sm font-medium">
                                        {spec}
                                        <button
                                            type="button"
                                            onClick={() => removeSpecialization(spec)}
                                            className="hover:text-danger"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </span>
                                ))}
                            </div>

                            <div className="flex gap-2">
                                <select
                                    value={newSpecialization}
                                    onChange={(e) => setNewSpecialization(e.target.value)}
                                    className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm"
                                >
                                    <option value="">Select specialization...</option>
                                    {COMMON_SPECIALIZATIONS.map(spec => (
                                        <option key={spec} value={spec}>{spec}</option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    onClick={() => addSpecialization(newSpecialization)}
                                    disabled={!newSpecialization}
                                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Plus className="h-5 w-5" />
                                </button>
                            </div>
                        </div>

                        {/* Custom Service Pricing */}
                        <div className="space-y-4">
                            <h4 className="text-lg font-bold text-dark-header border-b pb-2">Service Pricing</h4>

                            <div className="flex flex-wrap gap-2 mb-3">
                                {formData.offered_services?.map((svc, index) => (
                                    <span key={index} className="inline-flex items-center gap-2 px-3 py-1 bg-info-light text-info rounded-full text-sm font-medium border border-info/20">
                                        {svc.serviceType}: ₹{svc.price}
                                        <button
                                            type="button"
                                            onClick={() => removeOfferedService(svc.serviceType)}
                                            className="hover:text-danger"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </span>
                                ))}
                            </div>

                            <div className="flex gap-2">
                                <select
                                    value={newService.serviceType}
                                    onChange={(e) => setNewService({ ...newService, serviceType: e.target.value })}
                                    className="px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm bg-white"
                                >
                                    <option value="OPD">OPD</option>
                                    <option value="Home Visit">Home Visit</option>
                                    <option value="Online">Online</option>
                                    <option value="Emergency">Emergency</option>
                                </select>
                                <input
                                    type="number"
                                    value={newService.price}
                                    onChange={(e) => setNewService({ ...newService, price: Number(e.target.value) })}
                                    className="w-24 px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm"
                                    placeholder="Price"
                                    min="0"
                                />
                                <button
                                    type="button"
                                    onClick={addOfferedService}
                                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover shadow-md text-sm font-medium"
                                >
                                    Add
                                </button>
                            </div>
                        </div>

                        {/* About */}
                        <div>
                            <label className="block text-sm font-semibold text-dark-body mb-1.5">About Doctor</label>
                            <textarea
                                value={formData.about}
                                onChange={(e) => handleChange('about', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm"
                                rows="3"
                                placeholder="Brief description about the doctor..."
                            />
                        </div>

                        {/* Day-wise Slots */}
                        <div className="space-y-4">
                            <h4 className="text-lg font-bold text-dark-header border-b pb-2">Working Hours (Day-wise Slots)</h4>

                            <div className="space-y-2 max-h-80 overflow-y-auto">
                                {formData.working_hours.map((slot, index) => (
                                    <div key={slot.day} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                        <input
                                            type="checkbox"
                                            checked={slot.enabled}
                                            onChange={() => toggleDay(index)}
                                            className="w-5 h-5 text-primary rounded focus:ring-primary"
                                        />
                                        <div className="w-28 font-medium text-dark-body">{slot.day}</div>

                                        {slot.enabled && (
                                            <>
                                                <input
                                                    type="time"
                                                    value={slot.start}
                                                    onChange={(e) => updateDayTime(index, 'start', e.target.value)}
                                                    className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm"
                                                />
                                                <span className="text-gray-500">to</span>
                                                <input
                                                    type="time"
                                                    value={slot.end}
                                                    onChange={(e) => updateDayTime(index, 'end', e.target.value)}
                                                    className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm"
                                                />
                                            </>
                                        )}
                                        {!slot.enabled && (
                                            <span className="text-gray-400 italic text-sm">Not available</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Submit */}
                        <div className="flex gap-3 pt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-4 py-2.5 bg-gray-100 text-dark-body rounded-lg hover:bg-gray-200 font-semibold text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="flex-1 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-hover font-bold text-sm shadow-lg shadow-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {submitting ? 'Creating...' : 'Create Doctor'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AddDoctorModal;
