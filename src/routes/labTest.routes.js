const express = require('express');
const router = express.Router();
const labTestController = require('../controllers/labTest.controller');
const { protect } = require('../middleware/authenticate');

// Public
router.get('/', labTestController.getAllLabTests);
router.get('/:id', labTestController.getLabTestById);

// Admin (Protected) - In a real app, add 'admin' role check middleware
// router.post('/', protect, labTestController.createLabTest); 

module.exports = router;
