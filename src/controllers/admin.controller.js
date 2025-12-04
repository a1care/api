const User = require('../models/user.model');
const Doctor = require('../models/doctor.model');
const Booking = require('../models/booking.model');
const Service = require('../models/service.model');
const ServiceItem = require('../models/serviceItem.model');

/**
 * @route GET /api/admin/dashboard/stats
 * @description Get dashboard statistics
 */
exports.getDashboardStats = async (req, res) => {
    try {
        const [totalUsers, totalDoctors, totalBookings, totalServices] = await Promise.all([
            User.countDocuments({ role: 'User' }),
            User.countDocuments({ role: 'Doctor' }),
            Booking.countDocuments(),
            Service.countDocuments()
        ]);

        const pendingDoctors = await Doctor.countDocuments({ status: 'Pending' });
        const activeDoctors = await Doctor.countDocuments({ status: 'Active' });

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
                pendingDoctors,
                activeDoctors
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
        const users = await User.find({ role: 'User' })
            .select('-password -fcm_token')
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
 * @description Get all doctors with their profiles
 */
exports.getAllDoctors = async (req, res) => {
    try {
        const doctors = await User.aggregate([
            { $match: { role: 'Doctor' } },
            {
                $lookup: {
                    from: 'doctors',
                    localField: '_id',
                    foreignField: 'userId',
                    as: 'profile'
                }
            },
            { $unwind: { path: '$profile', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    name: 1,
                    mobile_number: 1,
                    email: 1,
                    created_at: 1,
                    status: '$profile.status',
                    experience: '$profile.experience',
                    specializations: '$profile.specializations',
                    consultation_fee: '$profile.consultation_fee',
                    satisfaction_rating: '$profile.satisfaction_rating'
                }
            },
            { $sort: { created_at: -1 } }
        ]);

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
 * @route PUT /api/admin/doctors/:id/approve
 * @description Approve a doctor
 */
exports.approveDoctor = async (req, res) => {
    try {
        const { id } = req.params;

        const doctor = await Doctor.findOneAndUpdate(
            { userId: id },
            { status: 'Active' },
            { new: true }
        );

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
        const { id } = req.params;

        const doctor = await Doctor.findOneAndUpdate(
            { userId: id },
            { status: 'Rejected' },
            { new: true }
        );

        if (!doctor) {
            return res.status(404).json({ message: 'Doctor not found' });
        }

        res.status(200).json({
            success: true,
            message: 'Doctor rejected',
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
        const { name, title, type, image_url } = req.body;

        const service = new Service({
            name,
            title,
            type,
            image_url,
            is_active: true
        });

        await service.save();

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
        const { id } = req.params;
        const updates = req.body;

        const service = await Service.findByIdAndUpdate(id, updates, { new: true });

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
        const { id } = req.params;

        const service = await Service.findByIdAndDelete(id);

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
