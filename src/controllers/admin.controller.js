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
