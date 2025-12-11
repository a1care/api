const User = require('../models/user.model');
const Doctor = require('../models/doctor.model');
const Booking = require('../models/booking.model');
const Service = require('../models/service.model');
const ServiceItem = require('../models/serviceItem.model');
const SubService = require('../models/subService.model');
const ChildService = require('../models/childService.model');

/**
 * @route GET /api/admin/dashboard/stats
 * @description Get dashboard statistics
 */
exports.getDashboardStats = async (req, res) => {
    try {
        const [totalUsers, totalDoctors, totalBookings, totalServices, totalSubServices, totalChildServices] = await Promise.all([
            User.countDocuments({ role: 'User' }),
            User.countDocuments({ role: 'Doctor' }),
            Booking.countDocuments(),
            Service.countDocuments(),
            SubService.countDocuments(),
            ChildService.countDocuments()
        ]);

        const pendingDoctors = await Doctor.countDocuments({ status: 'Pending' });
        const activeDoctors = await Doctor.countDocuments({ status: 'Active' });

        // Get service type breakdown
        const serviceTypeBreakdown = await ChildService.aggregate([
            {
                $group: {
                    _id: '$service_type',
                    count: { $sum: 1 }
                }
            }
        ]);

        // Get active/inactive counts
        const activeCategories = await Service.countDocuments({ is_active: true });
        const inactiveCategories = await Service.countDocuments({ is_active: false });

        const recentBookings = await Booking.find()
            .populate('userId', 'name mobile_number')
            .sort({ created_at: -1 })
            .limit(5);

        res.status(200).json({
            success: true,
            stats: {
                totalUsers,
                totalDoctors,
                totalBookings,
                totalServices,
                totalCategories: totalServices,
                totalSubcategories: totalSubServices,
                totalChildServices,
                pendingDoctors,
                activeDoctors,
                activeCategories,
                inactiveCategories,
                serviceTypeBreakdown: serviceTypeBreakdown.reduce((acc, item) => {
                    acc[item._id] = item.count;
                    return acc;
                }, {})
            },
            recentBookings
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ message: 'Error fetching dashboard stats' });
    }
};

/**
 * @route GET /api/admin/users
 * @description Get all users with pagination
 */
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find({ role: { $in: ['User', 'Doctor'] } })
            .select('-__v')
            .sort({ created_at: -1 });

        res.status(200).json({
            success: true,
            users
        });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ message: 'Error fetching users' });
    }
};

/**
 * @route GET /api/admin/doctors
 * @description Get all doctors with their details
 */
exports.getAllDoctors = async (req, res) => {
    try {
        const doctors = await Doctor.find()
            .populate('userId', 'name email mobile_number')
            .sort({ created_at: -1 });

        res.status(200).json({
            success: true,
            doctors
        });
    } catch (error) {
        console.error('Get doctors error:', error);
        res.status(500).json({ message: 'Error fetching doctors' });
    }
};

/**
 * @route POST /api/admin/doctors
 * @description Create a new doctor (admin only, skips OTP)
 */
exports.createDoctor = async (req, res) => {
    try {
        const {
            name,
            email,
            mobile_number,
            specializations,
            experience,
            consultation_fee,
            about,
            working_hours
        } = req.body;

        // Validate required fields
        if (!name || !email || !mobile_number) {
            return res.status(400).json({
                success: false,
                message: 'Name, email, and mobile number are required'
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({
            $or: [{ email }, { mobile_number }]
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User with this email or mobile number already exists'
            });
        }

        // Create user account with Doctor role (skip OTP verification)
        const user = await User.create({
            name,
            email,
            mobile_number,
            role: 'Doctor',
            is_verified: true // Admin-created doctors are auto-verified
        });

        // Create doctor profile with all details
        const doctor = await Doctor.create({
            userId: user._id,
            specializations: specializations || [],
            experience: experience || 0,
            consultation_fee: consultation_fee || 0,
            about: about || '',
            working_hours: working_hours || [],
            status: 'Active', // Admin-created doctors are immediately active
            is_available: true
        });

        // Populate user details for response
        await doctor.populate('userId', 'name email mobile_number');

        res.status(201).json({
            success: true,
            message: 'Doctor created successfully',
            doctor
        });
    } catch (error) {
        console.error('Create doctor error:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating doctor',
            error: error.message
        });
    }
};

/**
 * @route PUT /api/admin/doctors/:id/approve
 * @description Approve a doctor
 */
exports.approveDoctor = async (req, res) => {
    try {
        const doctor = await Doctor.findByIdAndUpdate(
            req.params.id,
            { status: 'Active' },
            { new: true }
        ).populate('userId', 'name email mobile_number');

        if (!doctor) {
            return res.status(404).json({ message: 'Doctor not found' });
        }

        res.status(200).json({
            success: true,
            message: 'Doctor approved successfully',
            doctor
        });
    } catch (error) {
        console.error('Approve doctor error:', error);
        res.status(500).json({ message: 'Error approving doctor' });
    }
};

/**
 * @route PUT /api/admin/doctors/:id/reject
 * @description Reject a doctor
 */
exports.rejectDoctor = async (req, res) => {
    try {
        const doctor = await Doctor.findByIdAndUpdate(
            req.params.id,
            { status: 'Rejected' },
            { new: true }
        ).populate('userId', 'name email mobile_number');

        if (!doctor) {
            return res.status(404).json({ message: 'Doctor not found' });
        }

        res.status(200).json({
            success: true,
            message: 'Doctor rejected successfully',
            doctor
        });
    } catch (error) {
        console.error('Reject doctor error:', error);
        res.status(500).json({ message: 'Error rejecting doctor' });
    }
};

/**
 * @route POST /api/admin/services
 * @description Create a new service
 */
exports.createService = async (req, res) => {
    try {
        const service = await Service.create(req.body);

        res.status(201).json({
            success: true,
            message: 'Service created successfully',
            service
        });
    } catch (error) {
        console.error('Create service error:', error);
        res.status(500).json({ message: 'Error creating service' });
    }
};

/**
 * @route PUT /api/admin/services/:id
 * @description Update a service
 */
exports.updateService = async (req, res) => {
    try {
        const service = await Service.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!service) {
            return res.status(404).json({ message: 'Service not found' });
        }

        res.status(200).json({
            success: true,
            message: 'Service updated successfully',
            service
        });
    } catch (error) {
        console.error('Update service error:', error);
        res.status(500).json({ message: 'Error updating service' });
    }
};

/**
 * @route DELETE /api/admin/services/:id
 * @description Delete a service
 */
exports.deleteService = async (req, res) => {
    try {
        const service = await Service.findByIdAndDelete(req.params.id);

        if (!service) {
            return res.status(404).json({ message: 'Service not found' });
        }

        res.status(200).json({
            success: true,
            message: 'Service deleted successfully'
        });
    } catch (error) {
        console.error('Delete service error:', error);
        res.status(500).json({ message: 'Error deleting service' });
    }
};

/**
 * @route POST /api/admin/services/:id/sub-services
 * @description Create a new SubService
 */
exports.createSubService = async (req, res) => {
    try {
        const { id } = req.params; // Service ID
        const { name, description, image_url } = req.body;

        const subService = await SubService.create({
            serviceId: id,
            name,
            description,
            image_url,
            is_active: true
        });

        res.status(201).json({
            success: true,
            message: 'SubService created successfully',
            subService
        });
    } catch (error) {
        console.error('Create sub-service error:', error);
        res.status(500).json({ message: 'Error creating sub-service' });
    }
};

/**
 * @route PUT /api/admin/sub-services/:id
 * @description Update a SubService
 */
exports.updateSubService = async (req, res) => {
    try {
        const subService = await SubService.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );

        if (!subService) {
            return res.status(404).json({ message: 'SubService not found' });
        }

        res.status(200).json({
            success: true,
            message: 'SubService updated successfully',
            subService
        });
    } catch (error) {
        console.error('Update sub-service error:', error);
        res.status(500).json({ message: 'Error updating sub-service' });
    }
};

/**
 * @route DELETE /api/admin/sub-services/:id
 * @description Delete a SubService
 */
exports.deleteSubService = async (req, res) => {
    try {
        const subService = await SubService.findByIdAndDelete(req.params.id);

        if (!subService) {
            return res.status(404).json({ message: 'SubService not found' });
        }

        res.status(200).json({
            success: true,
            message: 'SubService deleted successfully'
        });
    } catch (error) {
        console.error('Delete sub-service error:', error);
        res.status(500).json({ message: 'Error deleting sub-service' });
    }
};

/**
 * @route POST /api/admin/sub-services/:id/child-services
 * @description Create a new ChildService
 */
exports.createChildService = async (req, res) => {
    try {
        const { id } = req.params; // SubService ID
        const { name, description, image_url, price, service_type } = req.body;

        const childService = await ChildService.create({
            subServiceId: id,
            name,
            description,
            image_url,
            price: price || 0,
            service_type: service_type || 'OPD',
            is_active: true
        });

        res.status(201).json({
            success: true,
            message: 'ChildService created successfully',
            childService
        });
    } catch (error) {
        console.error('Create child-service error:', error);
        res.status(500).json({ message: 'Error creating child-service' });
    }
};

/**
 * @route PUT /api/admin/child-services/:id
 * @description Update a ChildService
 */
exports.updateChildService = async (req, res) => {
    try {
        const childService = await ChildService.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );

        if (!childService) {
            return res.status(404).json({ message: 'ChildService not found' });
        }

        res.status(200).json({
            success: true,
            message: 'ChildService updated successfully',
            childService
        });
    } catch (error) {
        console.error('Update child-service error:', error);
        res.status(500).json({ message: 'Error updating child-service' });
    }
};

/**
 * @route DELETE /api/admin/child-services/:id
 * @description Delete a ChildService
 */
exports.deleteChildService = async (req, res) => {
    try {
        const childService = await ChildService.findByIdAndDelete(req.params.id);

        if (!childService) {
            return res.status(404).json({ message: 'ChildService not found' });
        }

        res.status(200).json({
            success: true,
            message: 'ChildService deleted successfully'
        });
    } catch (error) {
        console.error('Delete child-service error:', error);
        res.status(500).json({ message: 'Error deleting child-service' });
    }
};

/**
 * @route GET /api/admin/services/hierarchy
 * @description Get full service hierarchy (Service -> SubService -> ChildService)
 */
exports.getServiceHierarchy = async (req, res) => {
    try {
        // Fetch all services
        const services = await Service.find({}).lean();

        // Fetch all sub-services
        const subServices = await SubService.find({}).lean();

        // Fetch all child-services
        const childServices = await ChildService.find({}).lean();

        // Build Hierarchy in Memory (More efficient than aggressive population loop)
        const hierarchy = services.map(service => {
            // Find subs for this service
            const serviceSubs = subServices.filter(sub =>
                sub.serviceId.toString() === service._id.toString()
            ).map(sub => {
                // Find children for this sub
                const subChildren = childServices.filter(child =>
                    child.subServiceId.toString() === sub._id.toString()
                );
                return { ...sub, childServices: subChildren };
            });

            return { ...service, subServices: serviceSubs };
        });

        res.status(200).json({
            success: true,
            services: hierarchy
        });

    } catch (error) {
        console.error('Get hierarchy error:', error);
        res.status(500).json({ message: 'Error fetching hierarchy' });
    }
};

/**
 * @route GET /api/admin/doctors/:id/profile
 * @description Get complete doctor profile with documents
 */
exports.getDoctorProfile = async (req, res) => {
    try {
        const doctor = await Doctor.findById(req.params.id)
            .populate('userId', 'name email mobile_number created_at');

        if (!doctor) {
            return res.status(404).json({ message: 'Doctor not found' });
        }

        // Mock documents - in real implementation, these would come from a documents collection
        const documents = [
            {
                id: '1',
                type: 'Medical License',
                url: 'https://via.placeholder.com/600x400/7367F0/FFFFFF?text=Medical+License',
                status: 'pending',
                uploadedAt: new Date()
            },
            {
                id: '2',
                type: 'Degree Certificate',
                url: 'https://via.placeholder.com/600x400/28C76F/FFFFFF?text=Degree+Certificate',
                status: 'verified',
                uploadedAt: new Date()
            },
            {
                id: '3',
                type: 'ID Proof',
                url: 'https://via.placeholder.com/600x400/FF9F43/FFFFFF?text=ID+Proof',
                status: 'pending',
                uploadedAt: new Date()
            }
        ];

        res.status(200).json({
            success: true,
            doctor: {
                ...doctor.toObject(),
                documents
            }
        });
    } catch (error) {
        console.error('Get doctor profile error:', error);
        res.status(500).json({ message: 'Error fetching doctor profile' });
    }
};

/**
 * @route PUT /api/admin/doctors/:id/verify-document
 * @description Verify or reject a doctor's document
 */
exports.verifyDoctorDocument = async (req, res) => {
    try {
        const { documentId, status, reason } = req.body;

        // In real implementation, update the document status in database
        // For now, just return success
        res.status(200).json({
            success: true,
            message: `Document ${status === 'verified' ? 'verified' : 'rejected'} successfully`,
            documentId,
            status,
            reason
        });
    } catch (error) {
        console.error('Verify document error:', error);
        res.status(500).json({ message: 'Error verifying document' });
    }
};
