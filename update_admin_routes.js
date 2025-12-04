const fs = require('fs');

const filePath = 'src/routes/admin.routes.js';
let content = fs.readFileSync(filePath, 'utf8');

// Find where to insert new routes (before module.exports)
const newRoutes = `
// ============================================
// SERVICE MANAGEMENT ROUTES
// ============================================
AdminRouter.get('/services', adminController.getAllServices);
AdminRouter.put('/services/:serviceId', adminController.updateService);
AdminRouter.delete('/services/:serviceId', adminController.deleteService);

// ============================================
// SERVICE ITEM MANAGEMENT ROUTES
// ============================================
AdminRouter.get('/service-items', adminController.getAllServiceItems);
AdminRouter.post('/service-items', adminController.createServiceItem);
AdminRouter.put('/service-items/:itemId', adminController.updateServiceItem);
AdminRouter.delete('/service-items/:itemId', adminController.deleteServiceItem);

// ============================================
// DOCTOR MANAGEMENT ROUTES
// ============================================
AdminRouter.get('/doctors', adminController.getAllDoctors);
AdminRouter.get('/doctors/:doctorId/details', adminController.getDoctorById);

`;

// Insert before module.exports
content = content.replace('module.exports = AdminRouter;', newRoutes + 'module.exports = AdminRouter;');

fs.writeFileSync(filePath, content, 'utf8');
console.log('✓ Updated admin.routes.js - Added routes for services, service items, and doctor management');
