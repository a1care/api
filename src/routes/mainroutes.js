const express = require('express');
const mainRoutes = express.Router();

// Import Routes
const authRoutes = require('../routes/auth.routes');
const bookingRoutes = require('../routes/booking.routes');

// Use Routes
mainRoutes.use('/auth', authRoutes);
mainRoutes.use('/booking', bookingRoutes);
mainRoutes.get('/', (req, res) => console.log('main router loaded!'));
// Then try hitting: localhost:3000/api/auth/test
module.exports = mainRoutes;




