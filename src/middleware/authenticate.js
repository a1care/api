const jwt = require('jsonwebtoken');
const User = require('../models/user.model'); // Import User Model

/**
 * @function protect
 * @description Middleware to verify JWT token and attach essential user data (including location for services) to the request.
 */
exports.protect = async (req, res, next) => {
    let token;

    // 1. Check for token in the 'Authorization' header
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        // 401: Unauthorized - no credentials provided
        return res.status(401).json({ message: 'Not authorized, token missing.' });
    }

    try {
        // 2. Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // 3. Find user by ID and ONLY select the required fields:
        //    _id, role, mobile_number, latitude, longitude
        const user = await User.findById(decoded.id)
            .select('role mobile_number latitude longitude'); 
            // NOTE: We MUST include latitude/longitude for the "nearest doctor" logic in the booking controller.

        if (!user) {
            // 401: Unauthorized - credentials (token) are valid, but user no longer exists
            return res.status(401).json({ message: 'Not authorized, user not found.' });
        }

        // 4. Attach user data to the request object using req.userId (as requested)
        req.userId = {
            id: user._id,
            role: user.role,
            phone: user.mobile_number, 
            latitude: user.latitude,     
            longitude: user.longitude,   
        };

        // 5. Move to the next middleware/controller
        next();

    } catch (error) {
        // If the token is invalid (expired, wrong signature, etc.), we catch the error.
        console.error('Authentication Error:', error.message);
        
        // Check if the error is a JWT specific error (e.g., TokenExpiredError)
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
             // 403: Forbidden - token is invalid or expired
             return res.status(403).json({ message: 'Token is invalid or has expired. Please log in again.' });
        }
        
        // For any other unexpected errors, pass it to the general error handler (best practice)
        next(error); 
    }
};