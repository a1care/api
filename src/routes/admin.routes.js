const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/service.admin.controller');
const serviceItemController = require('../controllers/serviceItem.controller');
const adminController = require('../controllers/admin.controller');

const { uploadServiceImage } = require('../middleware/upload');
const { protect } = require('../middleware/authenticate');

// --- Public/Shared Routes (if any) ---

// --- Protected Admin Routes ---

// Service Management
router.post('/services', protect, uploadServiceImage, serviceController.createService);
router.get('/services', protect, serviceController.getAllServices);

// Service Item Management (Generic Replacement for LabTest, Equipment, Ambulance)
router.post('/service-items', protect, uploadServiceImage, serviceItemController.createServiceItem);
router.put('/service-items/:id', protect, uploadServiceImage, serviceItemController.updateServiceItem);
router.delete('/service-items/:id', protect, serviceItemController.deleteServiceItem);

// Doctor Management
router.put('/doctors/:doctorId/approve', protect, adminController.approveDoctor);
router.put('/doctors/:doctorId/reject', protect, adminController.rejectDoctor);

// Booking Management
router.get('/bookings', protect, adminController.getAllBookings);
router.put('/bookings/:bookingId/status', protect, adminController.updateBookingStatus);

// Analytics
router.get('/analytics', protect, adminController.getAnalytics);

// User Management
router.get('/users', protect, adminController.getAllUsers);
router.put('/users/:userId/status', protect, adminController.toggleUserStatus);

module.exports = router;