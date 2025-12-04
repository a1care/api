const express = require('express');
const mainRoutes = express.Router();

const authRoutes = require('../routes/auth.routes');
const bookingRoutes = require('../routes/booking.routes');
const adminRoutes = require('../routes/admin.routes');
const doctorRoutes = require('./doctor.routes');
const serviceItemRoutes = require('./serviceItem.routes');
const serviceHierarchyRoutes = require('./serviceHierarchy.routes');

// Use Routes
mainRoutes.use('/auth', authRoutes);
mainRoutes.use('/booking', bookingRoutes);
mainRoutes.use('/admin', adminRoutes);
mainRoutes.use('/doctor', doctorRoutes);
mainRoutes.use('/service-items', serviceItemRoutes);
mainRoutes.use('/services', serviceHierarchyRoutes);

mainRoutes.get('/', (req, res) => console.log('main router loaded!'));

module.exports = mainRoutes;
