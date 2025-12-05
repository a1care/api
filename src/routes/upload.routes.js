const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/upload.controller');

router.post('/', uploadController.uploadImage, uploadController.handleUpload);

module.exports = router;
