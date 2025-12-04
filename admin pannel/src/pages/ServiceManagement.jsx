import { useEffect, useState } from 'react';
import axios from 'axios';
import DataTable from '../components/DataTable';
import { Plus, Edit2, Trash2, X } from 'lucide-react';
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
        { key: 'name', label: 'Item Name', sortable: true },
        { key: 'price', label: 'Price', render: (val) => `₹${val}`, sortable: true },
        {
            key: 'booking_type',
            label: 'Booking Type',
            render: (val) => (
                <span className={`px-2 py-1 rounded text-xs font-semibold ${val === 'OnlineConsultancy'
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-blue-100 text-blue-800'
                    }`}>
                    {val === 'OnlineConsultancy' ? 'Online Consult' : 'Direct Booking'}
                </span>
            )
        },
        {
            key: 'is_active',
            label: 'Status',
            render: (val) => (
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${val ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
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
                    className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                >
                    <Edit2 className="h-4 w-4" />
                </button>
            )
        }
    ];

    return (
        <div className="space-y-6">
            <Toaster position="top-right" />
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Service Management</h1>
                    <p className="text-gray-500 mt-1">Manage medical services and booking types</p>
                </div>
            </div>

            {/* Services Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {services.map((service) => (
                    <div
                        key={service._id}
                        onClick={() => fetchServiceItems(service._id)}
                        className={`cursor-pointer rounded-xl p-6 border transition-all duration-200 ${selectedService === service._id
                            ? 'bg-blue-50 border-blue-200 shadow-md ring-1 ring-blue-500'
                            : 'bg-white border-gray-100 shadow-sm hover:shadow-md hover:border-blue-100'
                            }`}
                    >
                        <div className="flex justify-between items-start">
                            <h3 className="text-lg font-bold text-gray-900">{service.name}</h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${service.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                                }`}>
                                {service.is_active ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                        <p className="text-sm text-gray-500 mt-2">{service.title}</p>
                    </div>
                ))}
            </div>

            {/* Service Items Section */}
            {selectedService && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                        <h2 className="text-lg font-bold text-gray-900">Service Items</h2>
                        <button
                            onClick={() => { setEditingItem(null); setShowItemModal(true); }}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
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
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-gray-900">
                                {editingItem ? 'Edit Service Item' : 'New Service Item'}
                            </h3>
                            <button onClick={() => setShowItemModal(false)} className="text-gray-400 hover:text-gray-600">
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
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows="2"
                />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹)</label>
                    <input
                        type="number"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Booking Type</label>
                    <select
                        value={formData.booking_type}
                        onChange={(e) => setFormData({ ...formData, booking_type: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="DirectBooking">Direct Booking</option>
                        <option value="OnlineConsultancy">Online Consult</option>
                    </select>
                </div>
            </div>
            <div className="flex items-center pt-2">
                <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                    Active Status
                </label>
            </div>
            <div className="flex gap-3 pt-4">
                <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                    Save Item
                </button>
            </div>
        </form>
    );
};

export default ServiceManagement;
