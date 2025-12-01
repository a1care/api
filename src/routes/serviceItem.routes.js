const express = require('express');
const router = express.Router();
const serviceItemController = require('../controllers/serviceItem.controller');
// const { protect } = require('../middleware/authenticate'); // Uncomment when needed

// Public
router.get('/', serviceItemController.getAllServiceItems);
router.get('/:id', serviceItemController.getServiceItemById);

// Admin (Protected)
// router.post('/', protect, serviceItemController.createServiceItem);
// router.put('/:id', protect, serviceItemController.updateServiceItem);
// router.delete('/:id', protect, serviceItemController.deleteServiceItem);

// For now, exposing create without protect for easy testing if needed, or keep commented out as per previous pattern
router.post('/', serviceItemController.createServiceItem);
router.put('/:id', serviceItemController.updateServiceItem);
router.delete('/:id', serviceItemController.deleteServiceItem);

module.exports = router;
