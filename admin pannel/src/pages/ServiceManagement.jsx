import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, ChevronDown, ChevronRight, Edit2, Trash2, X } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const ServiceManagement = () => {
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedServices, setExpandedServices] = useState({});
    const [expandedSubServices, setExpandedSubServices] = useState({});
    const [showModal, setShowModal] = useState(false);
    const [modalConfig, setModalConfig] = useState({ type: '', item: null, parentId: null });

    useEffect(() => {
        fetchHierarchy();
    }, []);

    const fetchHierarchy = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_URL}/services/hierarchy`);
            if (response.data.success) {
                setServices(response.data.services);
            }
        } catch (error) {
            console.error('Error:', error);
            toast.error('Failed to load services');
        } finally {
            setLoading(false);
        }
    };

    const toggleService = (id) => {
        setExpandedServices(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const toggleSubService = (id) => {
        setExpandedSubServices(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const openModal = (type, item = null, parentId = null) => {
        setModalConfig({ type, item, parentId });
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setModalConfig({ type: '', item: null, parentId: null });
    };

    const handleDelete = async (type, id) => {
        if (!confirm('Delete this item?')) return;

        try {
            const endpoints = {
                service: `/booking/services/${id}`,
                subService: `/services/sub-services/${id}`,
                childService: `/services/child-services/${id}`
            };
            await axios.delete(`${API_URL}${endpoints[type]}`);
            toast.success('Deleted successfully');
            fetchHierarchy();
        } catch (error) {
            toast.error('Failed to delete');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Toaster position="top-right" />

            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-dark-header">Service Management</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage categories, subcategories, and services</p>
                </div>
                <button
                    onClick={() => openModal('service')}
                    className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-hover shadow-lg shadow-primary/30 font-medium"
                >
                    <Plus className="h-4 w-4" />
                    Add Category
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-card p-6">
                {services.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        <p>No categories found. Click "Add Category" to start.</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {services.map(service => (
                            <CategoryNode
                                key={service._id}
                                category={service}
                                expanded={expandedServices[service._id]}
                                onToggle={() => toggleService(service._id)}
                                onEdit={() => openModal('service', service)}
                                onDelete={() => handleDelete('service', service._id)}
                                onAddSub={() => openModal('subService', null, service._id)}
                                expandedSubs={expandedSubServices}
                                toggleSub={toggleSubService}
                                onEditSub={(sub) => openModal('subService', sub)}
                                onDeleteSub={(id) => handleDelete('subService', id)}
                                onAddChild={(subId) => openModal('childService', null, subId)}
                                onEditChild={(child) => openModal('childService', child)}
                                onDeleteChild={(id) => handleDelete('childService', id)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {showModal && (
                <ServiceModal
                    config={modalConfig}
                    onClose={closeModal}
                    onSuccess={() => {
                        closeModal();
                        fetchHierarchy();
                    }}
                />
            )}
        </div>
    );
};

const CategoryNode = ({ category, expanded, onToggle, onEdit, onDelete, onAddSub, expandedSubs, toggleSub, onEditSub, onDeleteSub, onAddChild, onEditChild, onDeleteChild }) => (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between p-3 bg-primary-light/20 hover:bg-primary-light/30">
            <div className="flex items-center gap-2 flex-1">
                <button onClick={onToggle} className="p-1 hover:bg-white/50 rounded">
                    {expanded ? <ChevronDown className="h-4 w-4 text-primary" /> : <ChevronRight className="h-4 w-4 text-primary" />}
                </button>
                <span className="font-bold text-dark-header">{category.name}</span>
            </div>
            <div className="flex items-center gap-1">
                <button onClick={onAddSub} className="p-1.5 text-primary hover:bg-primary-light rounded" title="Add Subcategory">
                    <Plus className="h-4 w-4" />
                </button>
                <button onClick={onEdit} className="p-1.5 text-gray-600 hover:bg-gray-100 rounded">
                    <Edit2 className="h-4 w-4" />
                </button>
                <button onClick={onDelete} className="p-1.5 text-danger hover:bg-danger-light rounded">
                    <Trash2 className="h-4 w-4" />
                </button>
            </div>
        </div>
        {expanded && category.subServices?.length > 0 && (
            <div className="pl-8 bg-gray-50/50">
                {category.subServices.map(sub => (
                    <SubCategoryNode
                        key={sub._id}
                        subCategory={sub}
                        expanded={expandedSubs[sub._id]}
                        onToggle={() => toggleSub(sub._id)}
                        onEdit={() => onEditSub(sub)}
                        onDelete={() => onDeleteSub(sub._id)}
                        onAddChild={() => onAddChild(sub._id)}
                        onEditChild={onEditChild}
                        onDeleteChild={onDeleteChild}
                    />
                ))}
            </div>
        )}
    </div>
);

const SubCategoryNode = ({ subCategory, expanded, onToggle, onEdit, onDelete, onAddChild, onEditChild, onDeleteChild }) => (
    <div className="border-l-2 border-primary/30 ml-4 my-2">
        <div className="flex items-center justify-between p-2.5 bg-white hover:bg-gray-50 rounded-r-lg">
            <div className="flex items-center gap-2 flex-1">
                <button onClick={onToggle} className="p-1 hover:bg-gray-100 rounded">
                    {expanded ? <ChevronDown className="h-3.5 w-3.5 text-gray-600" /> : <ChevronRight className="h-3.5 w-3.5 text-gray-600" />}
                </button>
                <span className="font-semibold text-sm text-dark-body">{subCategory.name}</span>
            </div>
            <div className="flex items-center gap-1">
                <button onClick={onAddChild} className="p-1 text-primary hover:bg-primary-light rounded" title="Add Service">
                    <Plus className="h-3.5 w-3.5" />
                </button>
                <button onClick={onEdit} className="p-1 text-gray-600 hover:bg-gray-100 rounded">
                    <Edit2 className="h-3.5 w-3.5" />
                </button>
                <button onClick={onDelete} className="p-1 text-danger hover:bg-danger-light rounded">
                    <Trash2 className="h-3.5 w-3.5" />
                </button>
            </div>
        </div>
        {expanded && subCategory.childServices?.length > 0 && (
            <div className="pl-6 py-1 space-y-1">
                {subCategory.childServices.map(child => (
                    <ChildServiceNode
                        key={child._id}
                        service={child}
                        onEdit={() => onEditChild(child)}
                        onDelete={() => onDeleteChild(child._id)}
                    />
                ))}
            </div>
        )}
    </div>
);

const ChildServiceNode = ({ service, onEdit, onDelete }) => (
    <div className="flex items-center justify-between p-2 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200">
        <div className="flex items-center gap-2">
            <div className="w-1 h-4 bg-warning rounded"></div>
            <span className="text-sm text-dark-body">{service.name}</span>
            <span className="px-2 py-0.5 bg-info-light text-info rounded text-xs font-semibold">
                {service.service_type}
            </span>
            <span className="text-xs text-gray-500">₹{service.price}</span>
        </div>
        <div className="flex items-center gap-1">
            <button onClick={onEdit} className="p-1 text-gray-600 hover:bg-gray-200 rounded">
                <Edit2 className="h-3 w-3" />
            </button>
            <button onClick={onDelete} className="p-1 text-danger hover:bg-danger-light rounded">
                <Trash2 className="h-3 w-3" />
            </button>
        </div>
    </div>
);

const ServiceModal = ({ config, onClose, onSuccess }) => {
    const { type, item, parentId } = config;
    const [formData, setFormData] = useState(item || {
        name: '',
        description: '',
        service_type: 'OPD',
        price: 0,
        is_active: true
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const endpoints = {
                service: item ? `/booking/services/${item._id}` : '/booking/services',
                subService: item ? `/services/sub-services/${item._id}` : `/services/${parentId}/sub-services`,
                childService: item ? `/services/child-services/${item._id}` : `/services/sub-services/${parentId}/child-services`
            };

            const method = item ? 'put' : 'post';
            await axios[method](`${API_URL}${endpoints[type]}`, formData);
            toast.success(`${item ? 'Updated' : 'Created'} successfully`);
            onSuccess();
        } catch (error) {
            console.error('Save error:', error);
            toast.error(error.response?.data?.message || 'Failed to save');
        }
    };

    const titles = {
        service: 'Category',
        subService: 'Subcategory',
        childService: 'Service'
    };

    return (
        <div className="fixed inset-0 bg-dark/50 flex items-center justify-center z-50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-dark-header">
                        {item ? 'Edit' : 'Add'} {titles[type]}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-dark">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
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

                    {type === 'childService' && (
                        <>
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
                        </>
                    )}

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

export default ServiceManagement;
