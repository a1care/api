const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');

// Dashboard
router.get('/dashboard/stats', adminController.getDashboardStats);

// User Management
router.get('/users', adminController.getAllUsers);

// Doctor Management
router.get('/doctors', adminController.getAllDoctors);
router.post('/doctors', adminController.createDoctor);
router.put('/doctors/:id/approve', adminController.approveDoctor);
router.put('/doctors/:id/reject', adminController.rejectDoctor);

// Service Management
router.post('/services', adminController.createService);
router.put('/services/:id', adminController.updateService);
router.delete('/services/:id', adminController.deleteService);

// Doctor Profile & Document Verification
router.get('/doctors/:id/profile', adminController.getDoctorProfile);
router.put('/doctors/:id/verify-document', adminController.verifyDoctorDocument);

module.exports = router;