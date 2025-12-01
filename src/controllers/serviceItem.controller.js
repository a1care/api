const ServiceItem = require('../models/serviceItem.model');
const Service = require('../models/service.model');

// --- Public ---

exports.getAllServiceItems = async (req, res) => {
    try {
        const { serviceId, sort, filter } = req.query;
        let query = { is_active: true };

        if (serviceId) {
            query.serviceId = serviceId;
        }

        let sortOption = {};
        if (sort === 'price_low_high') {
            sortOption.price = 1;
        } else if (sort === 'price_high_low') {
            sortOption.price = -1;
        }

        const items = await ServiceItem.find(query).populate('serviceId', 'name type').sort(sortOption);
        res.status(200).json({ success: true, items });
    } catch (error) {
        console.error('Get all service items error:', error);
        res.status(500).json({ message: 'Server error fetching service items.' });
    }
};

exports.getServiceItemById = async (req, res) => {
    try {
        const item = await ServiceItem.findById(req.params.id).populate('serviceId', 'name type');
        if (!item) return res.status(404).json({ message: 'Service item not found.' });
        res.status(200).json({ success: true, item });
    } catch (error) {
        console.error('Get service item by id error:', error);
        res.status(500).json({ message: 'Server error fetching service item details.' });
    }
};

// --- Admin ---

exports.createServiceItem = async (req, res) => {
    try {
        const {
            name, description, price, serviceId,
            price_unit, price_per_km,
            vehicle_number, driver_name, driver_phone
        } = req.body;

        const image_url = req.file ? req.file.location : '';

        // Validate Service exists
        const service = await Service.findById(serviceId);
        if (!service) {
            return res.status(400).json({ message: 'Invalid Service ID.' });
        }

        const newItem = await ServiceItem.create({
            name,
            description,
            price,
            serviceId,
            image_url,
            price_unit,
            price_per_km,
            vehicle_number,
            driver_name,
            driver_phone
        });

        res.status(201).json({ success: true, message: 'Service item created.', item: newItem });
    } catch (error) {
        console.error('Create service item error:', error);
        res.status(500).json({ message: 'Server error creating service item.' });
    }
};

exports.updateServiceItem = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        if (req.file) {
            updates.image_url = req.file.location;
        }

        const updatedItem = await ServiceItem.findByIdAndUpdate(id, updates, { new: true });
        if (!updatedItem) {
            return res.status(404).json({ message: 'Service item not found.' });
        }

        res.status(200).json({ success: true, message: 'Service item updated.', item: updatedItem });
    } catch (error) {
        console.error('Update service item error:', error);
        res.status(500).json({ message: 'Server error updating service item.' });
    }
};

exports.deleteServiceItem = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedItem = await ServiceItem.findByIdAndUpdate(id, { is_active: false }, { new: true }); // Soft delete

        if (!deletedItem) {
            return res.status(404).json({ message: 'Service item not found.' });
        }

        res.status(200).json({ success: true, message: 'Service item deleted (soft).' });
    } catch (error) {
        console.error('Delete service item error:', error);
        res.status(500).json({ message: 'Server error deleting service item.' });
    }
};
