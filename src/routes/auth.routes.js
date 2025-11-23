const express = require('express');
const AuthRouter = express.Router();
const authController = require('../controllers/auth.controller');
const { protect } = require('../middleware/authenticate'); // Import the protect middleware

// --- Public Routes ---

/**
 * @route POST /api/auth/login
 * @description Login/Signup after Firebase OTP verification.
 * @access Public
 */
AuthRouter.post('/login', authController.login);


// --- Private Routes (Requires Token) ---

/**
 * @route POST /api/auth/coordinates
 * @description Update user's latitude and longitude on the home screen.
 * @access Private
 * @middleware protect - Uses the token to identify the user (req.userId)
 */
AuthRouter.post('/coordinates', protect, authController.updateCoordinates);
AuthRouter.put('/profile', protect, authController.updateProfile);

module.exports = AuthRouter;