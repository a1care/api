const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const adminBookingController = require('../controllers/admin.booking.controller');

// Dashboard
router.get('/dashboard/stats', adminController.getDashboardStats);

// User Management
router.get('/users', adminController.getAllUsers);

// Doctor Management
router.get('/doctors', adminController.getAllDoctors);
router.post('/doctors', adminController.createDoctor);
router.put('/doctors/:id/approve', adminController.approveDoctor);
router.put('/doctors/:id/reject', adminController.rejectDoctor);

// Service Management
router.post('/services', adminController.createService);
router.put('/services/:id', adminController.updateService);
router.delete('/services/:id', adminController.deleteService);

// Doctor Profile & Document Verification
router.get('/doctors/:id/profile', adminController.getDoctorProfile);
router.put('/doctors/:id/verify-document', adminController.verifyDoctorDocument);

// Booking Management
router.get('/bookings', adminBookingController.getAllBookings);
router.post('/bookings', adminBookingController.createBooking);
router.get('/bookings/:id', adminBookingController.getBookingDetails);
router.put('/bookings/:id/accept', adminBookingController.acceptBooking);
router.put('/bookings/:id/assign', adminBookingController.assignDoctor);
router.put('/bookings/:id/confirm', adminBookingController.confirmBooking);
router.put('/bookings/:id/complete', adminBookingController.completeBooking);
router.put('/bookings/:id/cancel', adminBookingController.cancelBooking);
router.put('/bookings/:id/payment', adminBookingController.updatePaymentStatus);

module.exports = router;