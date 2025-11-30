const express = require('express');
const router = express.Router();
const ambulanceController = require('../controllers/ambulance.controller');
const { protect } = require('../middleware/authenticate');

// Public
router.get('/', ambulanceController.getAllAmbulances);
router.get('/:id', ambulanceController.getAmbulanceById);

// Admin (Protected)
// router.post('/', protect, ambulanceController.createAmbulance);

module.exports = router;
