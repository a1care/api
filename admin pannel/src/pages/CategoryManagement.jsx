import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Edit2, Trash2, X } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import DataTable from '../components/DataTable';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const CategoryManagement = () => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_URL}/booking/services`);
            setCategories(response.data.services || []);
        } catch (error) {
            toast.error('Failed to load categories');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this category?')) return;
        try {
            await axios.delete(`${API_URL}/admin/services/${id}`);
            toast.success('Deleted successfully');
            fetchCategories();
        } catch (error) {
            toast.error('Failed to delete');
        }
    };

    const columns = [
        { key: 'name', label: 'Category Name' },
        { key: 'description', label: 'Description' },
        {
            key: 'actions',
            label: 'Actions',
            render: (category) => (
                <div className="flex gap-2">
                    <button
                        onClick={() => { setEditingCategory(category); setShowModal(true); }}
                        className="p-2 text-primary hover:bg-primary-light rounded-lg"
                    >
                        <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => handleDelete(category._id)}
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
                    <h1 className="text-2xl font-bold text-dark-header">Category Management</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage service categories</p>
                </div>
                <button
                    onClick={() => { setEditingCategory(null); setShowModal(true); }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-hover shadow-lg shadow-primary/30 font-medium"
                >
                    <Plus className="h-4 w-4" />
                    Add Category
                </button>
            </div>

            <DataTable columns={columns} data={categories} isLoading={loading} />

            {showModal && (
                <CategoryModal
                    category={editingCategory}
                    onClose={() => setShowModal(false)}
                    onSuccess={() => {
                        setShowModal(false);
                        fetchCategories();
                    }}
                />
            )}
        </div>
    );
};

const CategoryModal = ({ category, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({ name: '', description: '' });

    useEffect(() => {
        if (category) {
            setFormData({
                name: category.name,
                description: category.description || '',
                image_url: category.image_url || ''
            });
        } else {
            setFormData({ name: '', description: '', image_url: '' });
        }
    }, [category]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (category) {
                await axios.put(`${API_URL}/admin/services/${category._id}`, formData);
            } else {
                await axios.post(`${API_URL}/admin/services`, formData);
            }
            toast.success(`Category ${category ? 'updated' : 'created'} successfully`);
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
                        {category ? 'Edit' : 'Add'} Category
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
                                    src={`${API_URL.replace('/api', '')}${formData.image_url}`}
                                    alt="Category"
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
                            {category ? 'Update' : 'Create'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CategoryManagement;
