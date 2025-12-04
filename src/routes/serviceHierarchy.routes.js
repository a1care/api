const express = require('express');
const router = express.Router();
const serviceHierarchyController = require('../controllers/serviceHierarchy.controller');

// Get complete hierarchy
router.get('/hierarchy', serviceHierarchyController.getServiceHierarchy);

// Sub-Service routes
router.get('/:serviceId/sub-services', serviceHierarchyController.getSubServices);
router.post('/:serviceId/sub-services', serviceHierarchyController.createSubService);
router.put('/sub-services/:id', serviceHierarchyController.updateSubService);
router.delete('/sub-services/:id', serviceHierarchyController.deleteSubService);

// Child Service routes
router.get('/sub-services/:subServiceId/child-services', serviceHierarchyController.getChildServices);
router.post('/sub-services/:subServiceId/child-services', serviceHierarchyController.createChildService);
router.put('/child-services/:id', serviceHierarchyController.updateChildService);
router.delete('/child-services/:id', serviceHierarchyController.deleteChildService);

module.exports = router;
