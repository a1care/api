const Service = require('../models/service.model');
const SubService = require('../models/subService.model');
const ChildService = require('../models/childService.model');

/**
 * @route GET /api/services/hierarchy
 * @description Get complete service hierarchy (all levels)
 */
exports.getServiceHierarchy = async (req, res) => {
    try {
        const services = await Service.find().sort({ created_at: -1 });

        const hierarchy = await Promise.all(services.map(async (service) => {
            const subServices = await SubService.find({ serviceId: service._id });

            const subServicesWithChildren = await Promise.all(subServices.map(async (subService) => {
                const childServices = await ChildService.find({ subServiceId: subService._id });
                return {
                    ...subService.toObject(),
                    childServices
                };
            }));

            return {
                ...service.toObject(),
                subServices: subServicesWithChildren
            };
        }));

        res.status(200).json({
            success: true,
            services: hierarchy
        });
    } catch (error) {
        console.error('Get service hierarchy error:', error);
        res.status(500).json({ success: false, message: 'Error fetching service hierarchy' });
    }
};

/**
 * @route GET /api/services/:serviceId/sub-services
 * @description Get all sub-services for a service
 */
exports.getSubServices = async (req, res) => {
    try {
        const subServices = await SubService.find({ serviceId: req.params.serviceId })
            .populate('serviceId', 'name')
            .sort({ created_at: -1 });

        res.status(200).json({
            success: true,
            subServices
        });
    } catch (error) {
        console.error('Get sub-services error:', error);
        res.status(500).json({ success: false, message: 'Error fetching sub-services' });
    }
};

/**
 * @route POST /api/services/:serviceId/sub-services
 * @description Create a new sub-service
 */
exports.createSubService = async (req, res) => {
    try {
        const subService = await SubService.create({
            serviceId: req.params.serviceId,
            ...req.body
        });

        res.status(201).json({
            success: true,
            message: 'Sub-service created successfully',
            subService
        });
    } catch (error) {
        console.error('Create sub-service error:', error);
        res.status(500).json({ success: false, message: 'Error creating sub-service' });
    }
};

/**
 * @route PUT /api/services/sub-services/:id
 * @description Update a sub-service
 */
exports.updateSubService = async (req, res) => {
    try {
        const subService = await SubService.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!subService) {
            return res.status(404).json({ success: false, message: 'Sub-service not found' });
        }

        res.status(200).json({
            success: true,
            message: 'Sub-service updated successfully',
            subService
        });
    } catch (error) {
        console.error('Update sub-service error:', error);
        res.status(500).json({ success: false, message: 'Error updating sub-service' });
    }
};

/**
 * @route DELETE /api/services/sub-services/:id
 * @description Delete a sub-service
 */
exports.deleteSubService = async (req, res) => {
    try {
        // Delete all child services first
        await ChildService.deleteMany({ subServiceId: req.params.id });

        const subService = await SubService.findByIdAndDelete(req.params.id);

        if (!subService) {
            return res.status(404).json({ success: false, message: 'Sub-service not found' });
        }

        res.status(200).json({
            success: true,
            message: 'Sub-service deleted successfully'
        });
    } catch (error) {
        console.error('Delete sub-service error:', error);
        res.status(500).json({ success: false, message: 'Error deleting sub-service' });
    }
};

/**
 * @route GET /api/services/sub-services/:subServiceId/child-services
 * @description Get all child services for a sub-service
 */
exports.getChildServices = async (req, res) => {
    try {
        const childServices = await ChildService.find({ subServiceId: req.params.subServiceId })
            .populate('subServiceId', 'name')
            .sort({ created_at: -1 });

        res.status(200).json({
            success: true,
            childServices
        });
    } catch (error) {
        console.error('Get child services error:', error);
        res.status(500).json({ success: false, message: 'Error fetching child services' });
    }
};

/**
 * @route POST /api/services/sub-services/:subServiceId/child-services
 * @description Create a new child service
 */
exports.createChildService = async (req, res) => {
    try {
        const childService = await ChildService.create({
            subServiceId: req.params.subServiceId,
            ...req.body
        });

        res.status(201).json({
            success: true,
            message: 'Child service created successfully',
            childService
        });
    } catch (error) {
        console.error('Create child service error:', error);
        res.status(500).json({ success: false, message: 'Error creating child service' });
    }
};

/**
 * @route PUT /api/services/child-services/:id
 * @description Update a child service
 */
exports.updateChildService = async (req, res) => {
    try {
        const childService = await ChildService.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!childService) {
            return res.status(404).json({ success: false, message: 'Child service not found' });
        }

        res.status(200).json({
            success: true,
            message: 'Child service updated successfully',
            childService
        });
    } catch (error) {
        console.error('Update child service error:', error);
        res.status(500).json({ success: false, message: 'Error updating child service' });
    }
};

/**
 * @route DELETE /api/services/child-services/:id
 * @description Delete a child service
 */
exports.deleteChildService = async (req, res) => {
    try {
        const childService = await ChildService.findByIdAndDelete(req.params.id);

        if (!childService) {
            return res.status(404).json({ success: false, message: 'Child service not found' });
        }

        res.status(200).json({
            success: true,
            message: 'Child service deleted successfully'
        });
    } catch (error) {
        console.error('Delete child service error:', error);
        res.status(500).json({ success: false, message: 'Error deleting child service' });
    }
};
