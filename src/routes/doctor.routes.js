// src/routes/doctor.routes.js

const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/doctor.controller');
const { protect } = require('../middleware/authenticate');
// Import the new middleware
const { uploadDoctorDocuments } = require('../middleware/upload');

// ... existing routes ...

/**
 * @route POST /api/doctor/documents/upload
 * @description Endpoint for Doctor to upload all verification documents in one request.
 * @access Private
 */
router.put(
    '/documents/upload',
    protect, // Verify JWT
    uploadDoctorDocuments, // <--- NEW MULTI-FILE MIDDLEWARE
    doctorController.uploadDocument
);

// New Doctor App Routes
router.get('/appointments', protect, doctorController.getAppointments);
router.post('/slots', protect, doctorController.manageSlots);
router.put('/profile', protect, doctorController.updateProfile);

module.exports = router;