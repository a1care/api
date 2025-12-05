import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Edit2, Trash2, X } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import DataTable from '../components/DataTable';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const ChildServiceManagement = () => {
    const [childServices, setChildServices] = useState([]);
    const [subcategories, setSubcategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const hierarchy = await axios.get(`${API_URL}/services/hierarchy`);

            const allSubs = [];
            const allChildren = [];

            if (hierarchy.data.success) {
                hierarchy.data.services.forEach(service => {
                    service.subServices?.forEach(sub => {
                        allSubs.push({
                            _id: sub._id,
                            name: sub.name,
                            categoryName: service.name
                        });

                        sub.childServices?.forEach(child => {
                            allChildren.push({
                                ...child,
                                subcategoryName: sub.name,
                                categoryName: service.name
                            });
                        });
                    });
                });
            }

            setSubcategories(allSubs);
            setChildServices(allChildren);
        } catch (error) {
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this service?')) return;
        try {
            await axios.delete(`${API_URL}/services/child-services/${id}`);
            toast.success('Deleted successfully');
            fetchData();
        } catch (error) {
            toast.error('Failed to delete');
        }
    };

    const columns = [
        {
            key: 'image_url',
            label: 'Image',
            render: (item) => (
                <div className="h-10 w-10 rounded-lg bg-gray-100 overflow-hidden border border-gray-200">
                    {item.image_url ? (
                        <img
                            src={item.image_url?.startsWith('http') ? item.image_url : `${API_URL.replace('/api', '')}${item.image_url}`}
                            alt={item.name}
                            className="h-full w-full object-cover"
                        />
                    ) : (
                        <div className="h-full w-full flex items-center justify-center text-gray-400 text-xs">No Img</div>
                    )}
                </div>
            )
        },

        { key: 'categoryName', label: 'Category' },
        { key: 'subcategoryName', label: 'Subcategory' },
        { key: 'name', label: 'Service Name' },
        {
            key: 'service_type',
            label: 'Mode',
            render: (item) => (
                <span className="px-2 py-1 bg-info-light text-info rounded text-xs font-semibold">
                    {item.service_type}
                </span>
            )
        },
        {
            key: 'price',
            label: 'Price',
            render: (item) => `₹${item.price}`
        },
        {
            key: 'actions',
            label: 'Actions',
            render: (item) => (
                <div className="flex gap-2">
                    <button
                        onClick={() => { setEditingItem(item); setShowModal(true); }}
                        className="p-2 text-primary hover:bg-primary-light rounded-lg"
                    >
                        <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => handleDelete(item._id)}
                        className="p-2 text-danger hover:bg-danger-light rounded-lg"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>
            )
        }
    ];

    return (
        <div className="space-y-6">
            <Toaster position="top-right" />

            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-dark-header">Child Service Management</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage individual services with pricing and modes</p>
                </div>
                <button
                    onClick={() => { setEditingItem(null); setShowModal(true); }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-hover shadow-lg shadow-primary/30 font-medium"
                >
                    <Plus className="h-4 w-4" />
                    Add Service
                </button>
            </div>

            <DataTable columns={columns} data={childServices} isLoading={loading} />

            {showModal && (
                <ChildServiceModal
                    item={editingItem}
                    subcategories={subcategories}
                    onClose={() => setShowModal(false)}
                    onSuccess={() => {
                        setShowModal(false);
                        fetchData();
                    }}
                />
            )}
        </div>
    );
};

const ChildServiceModal = ({ item, subcategories, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        subServiceId: '',
        name: '',
        description: '',
        service_type: 'OPD',
        price: 0
    });

    useEffect(() => {
        if (item) {
            setFormData({
                subServiceId: item.subServiceId || '',
                name: item.name || '',
                description: item.description || '',
                service_type: item.service_type || 'OPD',
                price: item.price || 0,
                image_url: item.image_url || ''
            });
        } else {
            setFormData({
                subServiceId: '',
                name: '',
                description: '',
                service_type: 'OPD',
                price: 0,
                image_url: ''
            });
        }
    }, [item]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (item) {
                await axios.put(`${API_URL}/services/child-services/${item._id}`, formData);
            } else {
                await axios.post(`${API_URL}/services/sub-services/${formData.subServiceId}/child-services`, formData);
            }
            toast.success(`Service ${item ? 'updated' : 'created'} successfully`);
            onSuccess();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save');
        }
    };

    return (
        <div className="fixed inset-0 bg-dark/50 flex items-center justify-center z-50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-dark-header">
                        {item ? 'Edit' : 'Add'} Service
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-dark">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="flex justify-center mb-4">
                        <div className="relative h-24 w-24 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden group">
                            {formData.image_url ? (
                                <img
                                    src={formData.image_url?.startsWith('http') ? formData.image_url : `${API_URL.replace('/api', '')}${formData.image_url}`}
                                    alt="Service"
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <span className="text-gray-400 text-xs text-center px-2">Upload Image</span>
                            )}
                            <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                                <span className="text-white text-xs font-bold">Change</span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={async (e) => {
                                        const file = e.target.files[0];
                                        if (!file) return;

                                        const uploadData = new FormData();
                                        uploadData.append('image', file);

                                        try {
                                            const res = await axios.post(`${API_URL}/upload`, uploadData, {
                                                headers: { 'Content-Type': 'multipart/form-data' }
                                            });
                                            if (res.data.success) {
                                                setFormData({ ...formData, image_url: res.data.url });
                                                toast.success('Image uploaded');
                                            }
                                        } catch (err) {
                                            console.error(err);
                                            toast.error('Upload failed');
                                        }
                                    }}
                                />
                            </label>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-dark-body mb-1.5">Subcategory</label>
                        <select
                            value={formData.subServiceId}
                            onChange={(e) => setFormData({ ...formData, subServiceId: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm bg-white"
                            required
                            disabled={!!item}
                        >
                            <option value="">Select Subcategory</option>
                            {subcategories.map(sub => (
                                <option key={sub._id} value={sub._id}>
                                    {sub.categoryName} → {sub.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-dark-body mb-1.5">Service Name</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-dark-body mb-1.5">Mode</label>
                        <select
                            value={formData.service_type}
                            onChange={(e) => setFormData({ ...formData, service_type: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm bg-white"
                        >
                            <option value="OPD">OPD</option>
                            <option value="Emergency">Emergency</option>
                            <option value="Online">Online</option>
                            <option value="Home Visit">Home Visit</option>
                            <option value="Lab Test">Lab Test</option>
                            <option value="Pharmacy">Pharmacy</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-dark-body mb-1.5">Price (₹)</label>
                        <input
                            type="number"
                            value={formData.price}
                            onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm"
                            min="0"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-dark-body mb-1.5">Description</label>
                        <textarea
                            value={formData.description || ''}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm"
                            rows="3"
                        />
                    </div>

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
                            className="flex-1 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-hover font-bold text-sm shadow-lg shadow-primary/30"
                        >
                            {item ? 'Update' : 'Create'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ChildServiceManagement;
