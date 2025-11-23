const express = require('express');
const mainRoutes = express.Router();

// Import Routes
const authRoutes = require('../routes/auth.routes');
const bookingRoutes = require('../routes/booking.routes');

// Use Routes
mainRoutes.use('/auth', authRoutes);
mainRoutes.use('/booking', bookingRoutes);

module.exports = mainRoutes;




