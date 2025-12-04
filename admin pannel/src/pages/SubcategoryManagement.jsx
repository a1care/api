import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Edit2, Trash2, X } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import DataTable from '../components/DataTable';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const SubcategoryManagement = () => {
    const [subcategories, setSubcategories] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [catRes, hierarchy] = await Promise.all([
                axios.get(`${API_URL}/booking/services`),
                axios.get(`${API_URL}/services/hierarchy`)
            ]);

            setCategories(catRes.data.services || []);

            // Flatten subcategories from hierarchy
            const allSubs = [];
            if (hierarchy.data.success) {
                hierarchy.data.services.forEach(service => {
                    service.subServices?.forEach(sub => {
                        allSubs.push({
                            ...sub,
                            categoryName: service.name
                        });
                    });
                });
            }
            setSubcategories(allSubs);
        } catch (error) {
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this subcategory?')) return;
        try {
            await axios.delete(`${API_URL}/services/sub-services/${id}`);
            toast.success('Deleted successfully');
            fetchData();
        } catch (error) {
            toast.error('Failed to delete');
        }
    };

    const columns = [
        { key: 'categoryName', label: 'Category' },
        { key: 'name', label: 'Subcategory Name' },
        { key: 'description', label: 'Description' },
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
                    <h1 className="text-2xl font-bold text-dark-header">Subcategory Management</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage service subcategories</p>
                </div>
                <button
                    onClick={() => { setEditingItem(null); setShowModal(true); }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-hover shadow-lg shadow-primary/30 font-medium"
                >
                    <Plus className="h-4 w-4" />
                    Add Subcategory
                </button>
            </div>

            <DataTable columns={columns} data={subcategories} isLoading={loading} />

            {showModal && (
                <SubcategoryModal
                    item={editingItem}
                    categories={categories}
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

const SubcategoryModal = ({ item, categories, onClose, onSuccess }) => {
    const [formData, setFormData] = useState(item || { serviceId: '', name: '', description: '' });

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (item) {
                await axios.put(`${API_URL}/services/sub-services/${item._id}`, formData);
            } else {
                await axios.post(`${API_URL}/services/${formData.serviceId}/sub-services`, formData);
            }
            toast.success(`Subcategory ${item ? 'updated' : 'created'} successfully`);
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
                        {item ? 'Edit' : 'Add'} Subcategory
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-dark">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-dark-body mb-1.5">Category</label>
                        <select
                            value={formData.serviceId}
                            onChange={(e) => setFormData({ ...formData, serviceId: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm bg-white"
                            required
                            disabled={!!item}
                        >
                            <option value="">Select Category</option>
                            {categories.map(cat => (
                                <option key={cat._id} value={cat._id}>{cat.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-dark-body mb-1.5">Name</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm"
                            required
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

export default SubcategoryManagement;
