const express = require('express');
const mainRoutes = express.Router();

// Import Routes
const authRoutes = require('../routes/auth.routes');
const bookingRoutes = require('../routes/booking.routes');
const homescreen = require('../routes/admin.routes');
const doctorRoutes = require('./doctor.routes');
const serviceItemRoutes = require('./serviceItem.routes');

// Use Routes
mainRoutes.use('/auth', authRoutes);
mainRoutes.use('/booking', bookingRoutes);
mainRoutes.use('/homescreen', homescreen);
mainRoutes.use('/doctor', doctorRoutes);
mainRoutes.use('/service-items', serviceItemRoutes);

mainRoutes.get('/', (req, res) => console.log('main router loaded!'));

module.exports = mainRoutes;
