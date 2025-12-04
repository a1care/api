const Service = require('../models/service.model');
const ServiceItem = require('../models/serviceItem.model');
const User = require('../models/user.model');
const Doctor = require('../models/doctor.model');
const DoctorDocument = require('../models/doctorDocument.model');

// ============================================
// SERVICE MANAGEMENT
// ============================================

/**
 * @route GET /api/admin/services
 * @description Get all services (including inactive)
 * @access Private (Admin only)
 */
exports.getAllServices = async (req, res) => {
    try {
        const { is_active } = req.query;
        let query = {};

        if (is_active !== undefined) {
            query.is_active = is_active === 'true';
        }

        const services = await Service.find(query).sort({ created_at: -1 });
        res.status(200).json({ success: true, services });
    } catch (error) {
        console.error('Get all services error:', error);
        res.status(500).json({ message: 'Server error fetching services.' });
    }
};

/**
 * @route PUT /api/admin/services/:serviceId
 * @description Update a service
 * @access Private (Admin only)
 */
exports.updateService = async (req, res) => {
    try {
        const { serviceId } = req.params;
        const updates = req.body;

        if (req.file) {
            updates.image_url = req.file.location;
        }

        const service = await Service.findByIdAndUpdate(
            serviceId,
            { $set: updates },
            { new: true, runValidators: true }
        );

        if (!service) {
            return res.status(404).json({ message: 'Service not found.' });
        }

        res.status(200).json({
            success: true,
            message: 'Service updated successfully.',
            service
        });
    } catch (error) {
        console.error('Update service error:', error);
        res.status(500).json({ message: 'Server error updating service.' });
    }
};

/**
 * @route DELETE /api/admin/services/:serviceId
 * @description Deactivate a service (soft delete)
 * @access Private (Admin only)
 */
exports.deleteService = async (req, res) => {
    try {
        const { serviceId } = req.params;

        const service = await Service.findByIdAndUpdate(
            serviceId,
            { $set: { is_active: false } },
            { new: true }
        );

        if (!service) {
            return res.status(404).json({ message: 'Service not found.' });
        }

        res.status(200).json({
            success: true,
            message: 'Service deactivated successfully.'
        });
    } catch (error) {
        console.error('Delete service error:', error);
        res.status(500).json({ message: 'Server error deleting service.' });
    }
};

// ============================================
// SERVICE ITEM MANAGEMENT
// ============================================

/**
 * @route GET /api/admin/service-items
 * @description Get all service items with filters
 * @access Private (Admin only)
 */
exports.getAllServiceItems = async (req, res) => {
    try {
        const { serviceId, is_active, level, booking_type } = req.query;
        let query = {};

        if (serviceId) query.serviceId = serviceId;
        if (is_active !== undefined) query.is_active = is_active === 'true';
        if (level) query.level = parseInt(level);
        if (booking_type) query.booking_type = booking_type;

        const items = await ServiceItem.find(query)
            .populate('serviceId', 'name type')
            .populate('parentItemId', 'name')
            .sort({ created_at: -1 });

        res.status(200).json({ success: true, items });
    } catch (error) {
        console.error('Get all service items error:', error);
        res.status(500).json({ message: 'Server error fetching service items.' });
    }
};

/**
 * @route POST /api/admin/service-items
 * @description Create a new service item
 * @access Private (Admin only)
 */
exports.createServiceItem = async (req, res) => {
    try {
        const {
            name, description, price, serviceId,
            price_unit, price_per_km,
            parentItemId, level, booking_type,
            vehicle_number, driver_name, driver_phone
        } = req.body;

        const image_url = req.file ? req.file.location : '';

        // Validate Service exists
        const service = await Service.findById(serviceId);
        if (!service) {
            return res.status(400).json({ message: 'Invalid Service ID.' });
        }

        // If parentItemId provided, validate it exists
        if (parentItemId) {
            const parentItem = await ServiceItem.findById(parentItemId);
            if (!parentItem) {
                return res.status(400).json({ message: 'Invalid Parent Item ID.' });
            }
        }

        const newItem = await ServiceItem.create({
            name,
            description,
            price,
            serviceId,
            image_url,
            price_unit,
            price_per_km,
            parentItemId: parentItemId || null,
            level: level || 1,
            booking_type: booking_type || 'none',
            vehicle_number,
            driver_name,
            driver_phone
        });

        res.status(201).json({
            success: true,
            message: 'Service item created successfully.',
            item: newItem
        });
    } catch (error) {
        console.error('Create service item error:', error);
        res.status(500).json({ message: 'Server error creating service item.' });
    }
};

/**
 * @route PUT /api/admin/service-items/:itemId
 * @description Update a service item (including booking_type)
 * @access Private (Admin only)
 */
exports.updateServiceItem = async (req, res) => {
    try {
        const { itemId } = req.params;
        const updates = req.body;

        if (req.file) {
            updates.image_url = req.file.location;
        }

        const item = await ServiceItem.findByIdAndUpdate(
            itemId,
            { $set: updates },
            { new: true, runValidators: true }
        );

        if (!item) {
            return res.status(404).json({ message: 'Service item not found.' });
        }

        res.status(200).json({
            success: true,
            message: 'Service item updated successfully.',
            item
        });
    } catch (error) {
        console.error('Update service item error:', error);
        res.status(500).json({ message: 'Server error updating service item.' });
    }
};

/**
 * @route DELETE /api/admin/service-items/:itemId
 * @description Deactivate a service item (soft delete)
 * @access Private (Admin only)
 */
exports.deleteServiceItem = async (req, res) => {
    try {
        const { itemId } = req.params;

        const item = await ServiceItem.findByIdAndUpdate(
            itemId,
            { $set: { is_active: false } },
            { new: true }
        );

        if (!item) {
            return res.status(404).json({ message: 'Service item not found.' });
        }

        res.status(200).json({
            success: true,
            message: 'Service item deactivated successfully.'
        });
    } catch (error) {
        console.error('Delete service item error:', error);
        res.status(500).json({ message: 'Server error deleting service item.' });
    }
};

// ============================================
// DOCTOR MANAGEMENT
// ============================================

/**
 * @route GET /api/admin/doctors
 * @description Get all doctors with optional status filter
 * @access Private (Admin only)
 */
exports.getAllDoctors = async (req, res) => {
    try {
        const { status } = req.query;
        let matchQuery = { role: 'Doctor' };

        const doctors = await User.aggregate([
            { $match: matchQuery },
            {
                $lookup: {
                    from: 'doctors',
                    localField: '_id',
                    foreignField: 'userId',
                    as: 'profile'
                }
            },
            { $unwind: '$profile' },
            ...(status ? [{ $match: { 'profile.status': status } }] : []),
            {
                $project: {
                    _id: 1,
                    name: 1,
                    email: 1,
                    mobile_number: 1,
                    created_at: 1,
                    status: '$profile.status',
                    experience: '$profile.experience',
                    specializations: '$profile.specializations',
                    consultation_fee: '$profile.consultation_fee',
                    is_available: '$profile.is_available'
                }
            }
        ]);

        res.status(200).json({ success: true, doctors });
    } catch (error) {
        console.error('Get all doctors error:', error);
        res.status(500).json({ message: 'Server error fetching doctors.' });
    }
};

/**
 * @route GET /api/admin/doctors/:doctorId
 * @description Get doctor details with documents
 * @access Private (Admin only)
 */
exports.getDoctorById = async (req, res) => {
    try {
        const { doctorId } = req.params;

        const doctor = await User.findById(doctorId).select('-password -fcm_token');
        if (!doctor || doctor.role !== 'Doctor') {
            return res.status(404).json({ message: 'Doctor not found.' });
        }

        const profile = await Doctor.findOne({ userId: doctorId });
        const documents = await DoctorDocument.find({ doctorId });

        res.status(200).json({
            success: true,
            doctor: {
                ...doctor.toObject(),
                profile,
                documents
            }
        });
    } catch (error) {
        console.error('Get doctor by ID error:', error);
        res.status(500).json({ message: 'Server error fetching doctor details.' });
    }
};

module.exports = exports;
