const express = require('express');
const mainRoutes = express.Router();

// Import Routes
const authRoutes = require('../routes/auth.routes');
const bookingRoutes = require('../routes/booking.routes');
const homescreen = require('../routes/admin.routes');
const doctorRoutes = require('./doctor.routes');
const labTestRoutes = require('./labTest.routes');
const equipmentRoutes = require('./medicalEquipment.routes');
const ambulanceRoutes = require('./ambulance.routes');

// Use Routes
mainRoutes.use('/auth', authRoutes);
mainRoutes.use('/booking', bookingRoutes);
mainRoutes.use('/homescreen', homescreen);
mainRoutes.use('/doctor', doctorRoutes);
mainRoutes.use('/lab-tests', labTestRoutes);
mainRoutes.use('/medical-equipment', equipmentRoutes);
mainRoutes.use('/ambulance', ambulanceRoutes);
mainRoutes.get('/', (req, res) => console.log('main router loaded!'));

// Then try hitting: localhost:3000/api/auth/test
module.exports = mainRoutes;




