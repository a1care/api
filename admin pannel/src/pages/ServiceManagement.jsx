import { useEffect, useState } from 'react';
import axios from 'axios';
import DataTable from '../components/DataTable';
import { Plus, Edit2, Trash2, X, BriefcaseMedical, ArrowRight } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'https://api-esf1.onrender.com/api';

const ServiceManagement = () => {
    const [services, setServices] = useState([]);
    const [selectedService, setSelectedService] = useState(null);
    const [serviceItems, setServiceItems] = useState([]);
    const [showItemModal, setShowItemModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchServices();
    }, []);

    const fetchServices = async () => {
        try {
            const response = await axios.get(`${API_URL}/booking/services`);
            setServices(response.data.services || []);
        } catch (error) {
            console.error('Error fetching services:', error);
            toast.error('Failed to load services');
        } finally {
            setLoading(false);
        }
    };

    const fetchServiceItems = async (serviceId) => {
        try {
            const response = await axios.get(`${API_URL}/booking/services/${serviceId}/`);
            setServiceItems(response.data.items || []);
            setSelectedService(serviceId);
        } catch (error) {
            console.error('Error fetching service items:', error);
            toast.error('Failed to load service items');
        }
    };

    const handleSaveServiceItem = async (itemData) => {
        try {
            if (editingItem) {
                await axios.put(`${API_URL}/service-items/${editingItem._id}`, itemData);
                toast.success('Service item updated');
            } else {
                await axios.post(`${API_URL}/service-items`, itemData);
                toast.success('Service item created');
            }
            fetchServiceItems(selectedService);
            setShowItemModal(false);
            setEditingItem(null);
        } catch (error) {
            console.error('Error saving service item:', error);
            toast.error('Error saving service item');
        }
    };

    const itemColumns = [
        { key: 'name', label: 'Procedure / Item Name', sortable: true, render: (val) => <span className="font-medium text-slate-900">{val}</span> },
        { key: 'price', label: 'Cost', render: (val) => <span className="font-mono text-slate-700">₹{val}</span>, sortable: true },
        {
            key: 'booking_type',
            label: 'Booking Type',
            render: (val) => (
                <span className={`px-2 py-1 rounded text-xs font-semibold border ${val === 'OnlineConsultancy'
                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                    : 'bg-blue-50 text-blue-700 border-blue-200'
                    }`}>
                    {val === 'OnlineConsultancy' ? 'Online Consult' : 'Direct Booking'}
                </span>
            )
        },
        {
            key: 'is_active',
            label: 'Status',
            render: (val) => (
                <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${val ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}>
                    {val ? 'Active' : 'Inactive'}
                </span>
            )
        },
        {
            key: 'actions',
            label: 'Actions',
            render: (_, item) => (
                <button
                    onClick={(e) => { e.stopPropagation(); setEditingItem(item); setShowItemModal(true); }}
                    className="p-1.5 text-medical-primary hover:bg-teal-50 rounded-lg transition-colors border border-transparent hover:border-teal-100"
                    title="Edit Item"
                >
                    <Edit2 className="h-4 w-4" />
                </button>
            )
        }
    ];

    return (
        <div className="space-y-8 font-sans">
            <Toaster position="top-right" />
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold text-medical-text">Service Catalog</h1>
                    <p className="text-medical-muted mt-1 text-sm">Configure medical services and pricing structures</p>
                </div>
            </div>

            {/* Services Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {services.map((service) => (
                    <div
                        key={service._id}
                        onClick={() => fetchServiceItems(service._id)}
                        className={`cursor-pointer rounded-xl p-6 border transition-all duration-200 group relative overflow-hidden ${selectedService === service._id
                            ? 'bg-teal-50/50 border-medical-primary shadow-medical ring-1 ring-medical-primary'
                            : 'bg-white border-slate-200 shadow-sm hover:shadow-medical hover:border-medical-primary/50'
                            }`}
                    >
                        <div className="flex justify-between items-start relative z-10">
                            <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-100 group-hover:border-teal-100 transition-colors">
                                <BriefcaseMedical className={`h-6 w-6 ${selectedService === service._id ? 'text-medical-primary' : 'text-slate-400 group-hover:text-medical-primary'}`} />
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${service.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                                }`}>
                                {service.is_active ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                        <h3 className={`text-lg font-bold mt-4 transition-colors ${selectedService === service._id ? 'text-medical-primary' : 'text-slate-900'}`}>{service.name}</h3>
                        <p className="text-sm text-slate-500 mt-1 line-clamp-2">{service.title}</p>

                        <div className={`mt-4 flex items-center text-sm font-medium transition-colors ${selectedService === service._id ? 'text-medical-primary' : 'text-slate-400 group-hover:text-medical-primary'}`}>
                            View Items <ArrowRight className="h-4 w-4 ml-1" />
                        </div>
                    </div>
                ))}
            </div>

            {/* Service Items Section */}
            {selectedService && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">Service Items</h2>
                            <p className="text-xs text-slate-500 mt-0.5">Manage individual items and prices for this service</p>
                        </div>
                        <button
                            onClick={() => { setEditingItem(null); setShowItemModal(true); }}
                            className="flex items-center gap-2 px-4 py-2 bg-medical-primary text-white rounded-lg hover:bg-teal-800 transition-all shadow-sm hover:shadow-md text-sm font-bold"
                        >
                            <Plus className="h-4 w-4" />
                            Add New Item
                        </button>
                    </div>

                    <DataTable
                        columns={itemColumns}
                        data={serviceItems}
                        isLoading={false}
                    />
                </div>
            )}

            {/* Modal */}
            {showItemModal && (
                <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm transition-opacity">
                    <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in duration-200 border border-slate-200">
                        <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                            <h3 className="text-xl font-bold text-slate-900">
                                {editingItem ? 'Edit Service Item' : 'New Service Item'}
                            </h3>
                            <button onClick={() => setShowItemModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-100 rounded-lg">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <ServiceItemForm
                            item={editingItem}
                            serviceId={selectedService}
                            onSave={handleSaveServiceItem}
                            onClose={() => setShowItemModal(false)}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

const ServiceItemForm = ({ item, serviceId, onSave, onClose }) => {
    const [formData, setFormData] = useState(item || {
        name: '',
        description: '',
        price: '',
        booking_type: 'DirectBooking',
        is_active: true,
        serviceId: serviceId
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Item Name</label>
                <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-medical-primary/20 focus:border-medical-primary transition-all text-sm"
                    placeholder="e.g., General Consultation"
                    required
                />
            </div>
            <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Description</label>
                <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-medical-primary/20 focus:border-medical-primary transition-all text-sm"
                    rows="3"
                    placeholder="Brief details about the service..."
                />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Price (₹)</label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">₹</span>
                        <input
                            type="number"
                            value={formData.price}
                            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                            className="w-full pl-7 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-medical-primary/20 focus:border-medical-primary transition-all text-sm font-mono"
                            placeholder="0.00"
                            required
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Booking Type</label>
                    <select
                        value={formData.booking_type}
                        onChange={(e) => setFormData({ ...formData, booking_type: e.target.value })}
                        className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-medical-primary/20 focus:border-medical-primary transition-all text-sm bg-white"
                    >
                        <option value="DirectBooking">Direct Booking</option>
                        <option value="OnlineConsultancy">Online Consult</option>
                    </select>
                </div>
            </div>
            <div className="flex items-center pt-2 p-3 bg-slate-50 rounded-lg border border-slate-100">
                <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="h-4 w-4 text-medical-primary focus:ring-medical-primary border-slate-300 rounded cursor-pointer"
                />
                <label htmlFor="is_active" className="ml-2 block text-sm font-medium text-slate-900 cursor-pointer select-none">
                    Available for Booking
                </label>
            </div>
            <div className="flex gap-3 pt-4 border-t border-slate-100 mt-6">
                <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-semibold text-sm transition-colors"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    className="flex-1 px-4 py-2.5 bg-medical-primary text-white rounded-lg hover:bg-teal-800 font-bold text-sm shadow-sm hover:shadow-md transition-all"
                >
                    Save Changes
                </button>
            </div>
        </form>
    );
};

export default ServiceManagement;
