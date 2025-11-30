const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/service.admin.controller');
const labTestController = require('../controllers/labTest.controller');
const equipmentController = require('../controllers/medicalEquipment.controller');
const ambulanceController = require('../controllers/ambulance.controller');

const { uploadServiceImage } = require('../middleware/upload'); // You might need specific uploaders for these
const { protect } = require('../middleware/authenticate');

// POST /api/homescreen/services - Create a new service with image upload
router.post('/services', protect, uploadServiceImage, serviceController.createService);
router.get('/services', protect, serviceController.getAllServices);

// --- New Admin Routes ---
// Note: You might want to create specific upload middleware for these if they go to different S3 folders
router.post('/lab-tests', protect, uploadServiceImage, labTestController.createLabTest);
router.post('/medical-equipment', protect, uploadServiceImage, equipmentController.createEquipment);
router.post('/ambulance', protect, ambulanceController.createAmbulance);

module.exports = router;