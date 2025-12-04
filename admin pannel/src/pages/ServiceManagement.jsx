import { useEffect, useState } from 'react';
import axios from 'axios';
import DataTable from '../components/DataTable';
import { Plus, Edit2, Trash2, X, Activity, ArrowRight } from 'lucide-react';
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
        { key: 'name', label: 'Item Name', sortable: true, render: (val) => <span className="font-semibold text-dark-header">{val}</span> },
        { key: 'price', label: 'Price', render: (val) => <span className="font-bold text-primary">₹{val}</span>, sortable: true },
        {
            key: 'booking_type',
            label: 'Type',
            render: (val) => (
                <span className={`px-2 py-1 rounded text-xs font-semibold ${val === 'OnlineConsultancy'
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-blue-100 text-blue-700'
                    }`}>
                    {val === 'OnlineConsultancy' ? 'Online' : 'Direct'}
                </span>
            )
        },
        {
            key: 'is_active',
            label: 'Status',
            render: (val) => (
                <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${val ? 'bg-success-light text-success' : 'bg-secondary-light text-secondary'
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
                    className="p-2 text-primary hover:bg-primary-light rounded-lg transition-colors"
                >
                    <Edit2 className="h-4 w-4" />
                </button>
            )
        }
    ];

    return (
        <div className="space-y-8">
            <Toaster position="top-right" />
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold text-dark-header">Services</h1>
                    <p className="text-gray-500 mt-1 text-sm">Manage medical services and pricing</p>
                </div>
            </div>

            {/* Services Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {services.map((service) => (
                    <div
                        key={service._id}
                        onClick={() => fetchServiceItems(service._id)}
                        className={`cursor-pointer rounded-xl p-6 border transition-all duration-300 group relative overflow-hidden ${selectedService === service._id
                            ? 'bg-white border-primary shadow-lg shadow-primary/20 ring-1 ring-primary'
                            : 'bg-white border-transparent shadow-card hover:shadow-card-hover hover:-translate-y-1'
                            }`}
                    >
                        <div className="flex justify-between items-start relative z-10">
                            <div className={`p-3 rounded-lg transition-colors ${selectedService === service._id ? 'bg-primary text-white' : 'bg-primary-light text-primary'}`}>
                                <Activity className="h-6 w-6" />
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${service.is_active ? 'bg-success-light text-success' : 'bg-secondary-light text-secondary'
                                }`}>
                                {service.is_active ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                        <h3 className="text-lg font-bold mt-4 text-dark-header group-hover:text-primary transition-colors">{service.name}</h3>
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{service.title}</p>

                        <div className="mt-4 flex items-center text-sm font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0">
                            Manage Items <ArrowRight className="h-4 w-4 ml-1" />
                        </div>
                    </div>
                ))}
            </div>

            {/* Service Items Section */}
            {selectedService && (
                <div className="bg-white rounded-xl shadow-card overflow-hidden animate-in fade-in slide-in-from-bottom-4">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                        <div>
                            <h2 className="text-lg font-bold text-dark-header">Service Items</h2>
                            <p className="text-xs text-gray-500 mt-0.5">Manage items for selected service</p>
                        </div>
                        <button
                            onClick={() => { setEditingItem(null); setShowItemModal(true); }}
                            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-hover transition-all shadow-lg shadow-primary/30 font-medium text-sm"
                        >
                            <Plus className="h-4 w-4" />
                            Add Item
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
                <div className="fixed inset-0 bg-dark/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm transition-opacity">
                    <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-dark-header">
                                {editingItem ? 'Edit Item' : 'New Item'}
                            </h3>
                            <button onClick={() => setShowItemModal(false)} className="text-gray-400 hover:text-danger transition-colors">
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
                <label className="block text-sm font-semibold text-dark-body mb-1.5">Item Name</label>
                <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-sm"
                    placeholder="e.g., General Consultation"
                    required
                />
            </div>
            <div>
                <label className="block text-sm font-semibold text-dark-body mb-1.5">Description</label>
                <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-sm"
                    rows="3"
                    placeholder="Brief details..."
                />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-semibold text-dark-body mb-1.5">Price (₹)</label>
                    <input
                        type="number"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-sm font-bold text-dark-header"
                        placeholder="0.00"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-semibold text-dark-body mb-1.5">Type</label>
                    <select
                        value={formData.booking_type}
                        onChange={(e) => setFormData({ ...formData, booking_type: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-sm bg-white"
                    >
                        <option value="DirectBooking">Direct</option>
                        <option value="OnlineConsultancy">Online</option>
                    </select>
                </div>
            </div>
            <div className="flex items-center pt-2">
                <label className="flex items-center cursor-pointer">
                    <div className="relative">
                        <input
                            type="checkbox"
                            className="sr-only"
                            checked={formData.is_active}
                            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        />
                        <div className={`block w-10 h-6 rounded-full transition-colors ${formData.is_active ? 'bg-success' : 'bg-gray-300'}`}></div>
                        <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${formData.is_active ? 'transform translate-x-4' : ''}`}></div>
                    </div>
                    <div className="ml-3 text-sm font-medium text-dark-body">
                        Active Status
                    </div>
                </label>
            </div>
            <div className="flex gap-3 pt-4 mt-6">
                <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-4 py-2.5 bg-gray-100 text-dark-body rounded-lg hover:bg-gray-200 font-semibold text-sm transition-colors"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    className="flex-1 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-hover font-bold text-sm shadow-lg shadow-primary/30 transition-all"
                >
                    Save Changes
                </button>
            </div>
        </form>
    );
};

export default ServiceManagement;
