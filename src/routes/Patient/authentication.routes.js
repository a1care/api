const express = require('express');
const {responseTestRoutes , sendOtp, verifyOtp , getProfile , updatePatientProfile} = require('../../controllers/Patient/patient.controller');
const { protect } = require('../../middleware/authenticate');
const { uploadDoctorDocuments, uploadProfile } = require('../../middleware/upload');

const router = express.Router();

//reaponse and error test routes 
router.get('/test-response', responseTestRoutes);
router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);
router.get('/profile', protect, getProfile);
router.put('/profile' , protect, uploadProfile , updatePatientProfile);

module.exports = router;