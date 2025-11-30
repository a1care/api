const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/booking.controller');
const { protect } = require('../middleware/authenticate'); // Import the protect middleware

// --- Public/General Routes ---

/**
 * @route GET /api/booking/services
 * @description Fetch list of all main services for the home screen.
 * @access Public
 */
router.get('/services', bookingController.getServices);

/**
 * @route GET /api/booking/services/:serviceId/items
 * @description Fetch sub-items for a specific service (e.g., Lab Tests for "Lab Test" service).
 * @access Public
 */
router.get('/services/:serviceId/items', bookingController.getServiceItems);

/**
 * @route GET /api/booking/doctors/:doctorId
 * @description Fetch full details for a specific doctor.
 * @access Public
 */
router.get('/doctors/:doctorId', bookingController.getDoctorDetails);

/**
 * @route GET /api/booking/doctors/:doctorId/slots
 * @description Fetch available time slots for a doctor on a specific date.
 * @access Public
 */
router.get('/doctors/:doctorId/slots', bookingController.getAvailableSlots);


// --- Private Routes (Requires Token) ---

/**
 * @route GET /api/booking/doctors/opd
 * @description Fetch doctors near the user, ordered by distance and rating (Nearest Doctor Search).
 * @access Private
 * @middleware protect - Provides user location for the search query.
 */
router.get('/doctors/opd', protect, bookingController.getAvailableDoctors);


/**
 * @route POST /api/booking/create
 * @description Creates a new booking entry (initial status: PENDING_PAYMENT).
 * @access Private
 */
router.post('/create', protect, bookingController.createBooking);


/**
 * @route GET /api/booking/user
 * @description Fetches all bookings for the logged-in user, grouped by status.
 * @access Private
 */
router.get('/user', protect, bookingController.getUserBookings);


module.exports = router;