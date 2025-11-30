const User = require('../models/user.model');
const Doctor = require('../models/doctor.model');
const Booking = require('../models/booking.model');
const mongoose = require('mongoose');

/**
 * @route PUT /api/admin/doctors/:doctorId/approve
 * @description Approve a doctor account
 * @access Private (Admin only)
 */
exports.approveDoctor = async (req, res) => {
    const { doctorId } = req.params;

    try {
        const doctor = await Doctor.findOne({ userId: doctorId });
        if (!doctor) {
            return res.status(404).json({ message: 'Doctor profile not found.' });
        }

        doctor.status = 'Approved';
        doctor.is_available = true; // Make them available upon approval
        await doctor.save();

        res.status(200).json({ success: true, message: 'Doctor approved successfully.' });
    } catch (error) {
        console.error('Approve doctor error:', error);
        res.status(500).json({ message: 'Server error approving doctor.' });
    }
};

/**
 * @route PUT /api/admin/doctors/:doctorId/reject
 * @description Reject a doctor account
 * @access Private (Admin only)
 */
exports.rejectDoctor = async (req, res) => {
    const { doctorId } = req.params;

    try {
        const doctor = await Doctor.findOne({ userId: doctorId });
        if (!doctor) {
            return res.status(404).json({ message: 'Doctor profile not found.' });
        }

        doctor.status = 'Rejected';
        doctor.is_available = false;
        await doctor.save();

        res.status(200).json({ success: true, message: 'Doctor rejected.' });
    } catch (error) {
        console.error('Reject doctor error:', error);
        res.status(500).json({ message: 'Server error rejecting doctor.' });
    }
};

/**
 * @route GET /api/admin/bookings
 * @description Get all bookings with filters
 * @access Private (Admin only)
 */
exports.getAllBookings = async (req, res) => {
    try {
        const { status, date, type } = req.query;
        let query = {};

        if (status) query.status = status;
        if (date) query.booking_date = date;
        if (type) query.itemType = type;

        const bookings = await Booking.find(query)
            .populate('userId', 'name mobile_number')
            .populate('itemId')
            .sort({ booking_date: -1 });

        res.status(200).json({ success: true, bookings });
    } catch (error) {
        console.error('Get all bookings error:', error);
        res.status(500).json({ message: 'Server error fetching bookings.' });
    }
};

/**
 * @route GET /api/admin/analytics
 * @description Get app analytics (counts, revenue)
 * @access Private (Admin only)
 */
exports.getAnalytics = async (req, res) => {
    try {
        const userCount = await User.countDocuments({ role: 'User' });
        const doctorCount = await Doctor.countDocuments();
        const bookingCount = await Booking.countDocuments();

        // Calculate total revenue (sum of total_amount from completed bookings)
        const revenueAgg = await Booking.aggregate([
            { $match: { status: 'Completed' } },
            { $group: { _id: null, total: { $sum: '$total_amount' } } }
        ]);
        const totalRevenue = revenueAgg.length > 0 ? revenueAgg[0].total : 0;

        res.status(200).json({
            success: true,
            analytics: {
                users: userCount,
                doctors: doctorCount,
                bookings: bookingCount,
                revenue: totalRevenue
            }
        });
    } catch (error) {
        console.error('Get analytics error:', error);
        res.status(500).json({ message: 'Server error fetching analytics.' });
    }
};

/**
 * @route PUT /api/admin/bookings/:bookingId/status
 * @description Update booking status (e.g., to Completed, Cancelled)
 * @access Private (Admin only)
 */
exports.updateBookingStatus = async (req, res) => {
    const { bookingId } = req.params;
    const { status } = req.body;

    const validStatuses = ['Upcoming', 'Completed', 'Cancelled', 'Pending Payment', 'Approved', 'Rejected'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: 'Invalid status.' });
    }

    try {
        const booking = await Booking.findById(bookingId);
        if (!booking) {
            return res.status(404).json({ message: 'Booking not found.' });
        }

        booking.status = status;
        // If completed, ensure payment status is PAID (optional logic)
        if (status === 'Completed') {
            booking.payment_status = 'PAID';
        }

        await booking.save();

        res.status(200).json({ success: true, message: 'Booking status updated.', booking });
    } catch (error) {
        console.error('Update booking status error:', error);
        res.status(500).json({ message: 'Server error updating booking status.' });
    }
};
