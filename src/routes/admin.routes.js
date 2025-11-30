const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/service.admin.controller');
const labTestController = require('../controllers/labTest.controller');
const equipmentController = require('../controllers/medicalEquipment.controller');
const ambulanceController = require('../controllers/ambulance.controller');
const adminController = require('../controllers/admin.controller');

const { uploadServiceImage } = require('../middleware/upload');
const { protect } = require('../middleware/authenticate');

// --- Public/Shared Routes (if any) ---

// --- Protected Admin Routes ---

// Service Management
router.post('/services', protect, uploadServiceImage, serviceController.createService);
router.get('/services', protect, serviceController.getAllServices);

router.post('/lab-tests', protect, uploadServiceImage, labTestController.createLabTest);
router.post('/medical-equipment', protect, uploadServiceImage, equipmentController.createEquipment);
router.post('/ambulance', protect, ambulanceController.createAmbulance);

// Doctor Management
router.put('/doctors/:doctorId/approve', protect, adminController.approveDoctor);
router.put('/doctors/:doctorId/reject', protect, adminController.rejectDoctor);

// Booking Management
router.get('/bookings', protect, adminController.getAllBookings);
router.put('/bookings/:bookingId/status', protect, adminController.updateBookingStatus);

// Analytics
router.get('/analytics', protect, adminController.getAnalytics);

module.exports = router;