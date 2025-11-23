const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { protect } = require('../middleware/authenticate'); // Import the protect middleware

// --- Public Routes ---

/**
 * @route POST /api/auth/login
 * @description Login/Signup after Firebase OTP verification.
 * @access Public
 */
router.post('/login', authController.login);


// --- Private Routes (Requires Token) ---

/**
 * @route POST /api/auth/coordinates
 * @description Update user's latitude and longitude on the home screen.
 * @access Private
 * @middleware protect - Uses the token to identify the user (req.userId)
 */
router.post('/coordinates', protect, authController.updateCoordinates);

module.exports = router;