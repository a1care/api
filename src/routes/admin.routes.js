const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/service.admin.controller');
const { uploadServiceImage } = require('../middleware/upload');
const { protect } = require('../middleware/authenticate');

// POST /api/admin/services - Create a new service with image upload
// The order is important: protect -> upload -> controller
router.post(
    '/services', 
    protect,
    uploadServiceImage, 
    serviceController.createService
);

module.exports = router;