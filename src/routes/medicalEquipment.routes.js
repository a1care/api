const express = require('express');
const router = express.Router();
const equipmentController = require('../controllers/medicalEquipment.controller');
const { protect } = require('../middleware/authenticate');

// Public
router.get('/', equipmentController.getAllEquipment);
router.get('/:id', equipmentController.getEquipmentById);

// Admin (Protected)
// router.post('/', protect, equipmentController.createEquipment);

module.exports = router;
