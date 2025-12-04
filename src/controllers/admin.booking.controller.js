const Booking = require('../models/booking.model');
const User = require('../models/user.model');
const Doctor = require('../models/doctor.model');
const ServiceItem = require('../models/serviceItem.model');

/**
 * @route POST /api/admin/bookings
 * @description Create a new booking from admin (CRM booking)
 */
exports.createBooking = async (req, res) => {
    try {
        const {
            userId,
            doctorId,
            itemId,
            itemType,
            serviceId,
            booking_date,
            slot,
            consultation_fee,
            item_price,
            platform_fee,
            payment_mode,
            admin_notes
        } = req.body;

        // Calculate total amount
        const total_amount = (consultation_fee || item_price || 0) + (platform_fee || 0);

        const booking = await Booking.create({
            userId,
            doctorId,
            itemId,
            itemType,
            serviceId,
            booking_date,
            slot,
            consultation_fee,
            item_price,
            platform_fee,
            total_amount,
            payment_mode: payment_mode || 'COD',
            payment_status: payment_mode === 'COD' ? 'INITIATED' : 'INITIATED',
            status: 'New',
            created_by: 'Admin',
            admin_notes
        });

        await booking.populate([
            { path: 'userId', select: 'name email mobile_number' },
            { path: 'itemId' }
        ]);

        res.status(201).json({
            success: true,
            message: 'Booking created successfully',
            booking
        });
    } catch (error) {
        console.error('Create booking error:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating booking',
            error: error.message
        });
    }
};

/**
 * @route GET /api/admin/bookings
 * @description Get all bookings with optional status filter
 */
exports.getAllBookings = async (req, res) => {
    try {
        const { status, page = 1, limit = 50 } = req.query;

        const filter = {};
        if (status && status !== 'all') {
            filter.status = status;
        }

        const bookings = await Booking.find(filter)
            .populate('userId', 'name email mobile_number')
            .populate('doctorId', 'name')
            .populate('assigned_doctor')
            .populate('itemId')
            .sort({ created_at: -1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit));

        const total = await Booking.countDocuments(filter);

        // Get status counts
        const statusCounts = await Booking.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        res.status(200).json({
            success: true,
            bookings,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
            statusCounts: statusCounts.reduce((acc, item) => {
                acc[item._id] = item.count;
                return acc;
            }, {})
        });
    } catch (error) {
        console.error('Get bookings error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching bookings'
        });
    }
};

/**
 * @route GET /api/admin/bookings/:id
 * @description Get booking details
 */
exports.getBookingDetails = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id)
            .populate('userId', 'name email mobile_number')
            .populate('doctorId', 'name email mobile_number')
            .populate('assigned_doctor')
            .populate('itemId')
            .populate('serviceId');

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        res.status(200).json({
            success: true,
            booking
        });
    } catch (error) {
        console.error('Get booking details error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching booking details'
        });
    }
};

/**
 * @route PUT /api/admin/bookings/:id/accept
 * @description Accept a booking
 */
exports.acceptBooking = async (req, res) => {
    try {
        const booking = await Booking.findByIdAndUpdate(
            req.params.id,
            { status: 'Accepted' },
            { new: true }
        ).populate('userId', 'name email mobile_number');

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Booking accepted successfully',
            booking
        });
    } catch (error) {
        console.error('Accept booking error:', error);
        res.status(500).json({
            success: false,
            message: 'Error accepting booking'
        });
    }
};

/**
 * @route PUT /api/admin/bookings/:id/assign
 * @description Assign booking to a doctor
 */
exports.assignDoctor = async (req, res) => {
    try {
        const { doctorId } = req.body;

        if (!doctorId) {
            return res.status(400).json({
                success: false,
                message: 'Doctor ID is required'
            });
        }

        const booking = await Booking.findByIdAndUpdate(
            req.params.id,
            {
                assigned_doctor: doctorId,
                status: 'Assigned'
            },
            { new: true }
        ).populate('userId assigned_doctor');

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Doctor assigned successfully',
            booking
        });
    } catch (error) {
        console.error('Assign doctor error:', error);
        res.status(500).json({
            success: false,
            message: 'Error assigning doctor'
        });
    }
};

/**
 * @route PUT /api/admin/bookings/:id/confirm
 * @description Doctor confirms the booking
 */
exports.confirmBooking = async (req, res) => {
    try {
        const booking = await Booking.findByIdAndUpdate(
            req.params.id,
            {
                doctor_confirmation: true,
                status: 'Confirmed'
            },
            { new: true }
        ).populate('userId assigned_doctor');

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Booking confirmed successfully',
            booking
        });
    } catch (error) {
        console.error('Confirm booking error:', error);
        res.status(500).json({
            success: false,
            message: 'Error confirming booking'
        });
    }
};

/**
 * @route PUT /api/admin/bookings/:id/complete
 * @description Mark booking as completed
 */
exports.completeBooking = async (req, res) => {
    try {
        const { payment_status } = req.body;

        const updateData = {
            status: 'Completed'
        };

        // If payment mode is COD, allow updating payment status
        if (payment_status) {
            updateData.payment_status = payment_status;
        }

        const booking = await Booking.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        ).populate('userId assigned_doctor');

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Booking completed successfully',
            booking
        });
    } catch (error) {
        console.error('Complete booking error:', error);
        res.status(500).json({
            success: false,
            message: 'Error completing booking'
        });
    }
};

/**
 * @route PUT /api/admin/bookings/:id/cancel
 * @description Cancel a booking
 */
exports.cancelBooking = async (req, res) => {
    try {
        const { reason } = req.body;

        const booking = await Booking.findByIdAndUpdate(
            req.params.id,
            {
                status: 'Cancelled',
                admin_notes: reason
            },
            { new: true }
        ).populate('userId assigned_doctor');

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Booking cancelled successfully',
            booking
        });
    } catch (error) {
        console.error('Cancel booking error:', error);
        res.status(500).json({
            success: false,
            message: 'Error cancelling booking'
        });
    }
};

/**
 * @route PUT /api/admin/bookings/:id/payment
 * @description Update payment status for COD bookings
 */
exports.updatePaymentStatus = async (req, res) => {
    try {
        const { payment_status } = req.body;

        const booking = await Booking.findByIdAndUpdate(
            req.params.id,
            { payment_status },
            { new: true }
        ).populate('userId');

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Payment status updated successfully',
            booking
        });
    } catch (error) {
        console.error('Update payment error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating payment status'
        });
    }
};
