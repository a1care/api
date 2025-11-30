const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const Doctor = require('../models/doctor.model');
const Role = require('../models/role.model');

// --- Helper: Generate JWT Token ---
const generateToken = (userId, roleName) => {
    // Generate a minimal JWT payload: only ID and Role
    return jwt.sign(
        {
            id: userId,
            role: roleName
        },
        process.env.JWT_SECRET,
        { expiresIn: '365d' }
    );
};

/**
 * @route POST /api/auth/login
 * @description Handles user login/signup after successful Firebase OTP verification.
 * @access Public
 * @payload { mobile_number, role, fcm_token }
 */
exports.login = async (req, res) => {
    const { mobile_number, role, fcm_token } = req.body;

    // 1. Basic Input Validation
    if (!mobile_number || !role) {
        return res.status(400).json({ message: 'Mobile number and role are required.' });
    }

    // Dynamic Role Validation
    const validRoles = ['User', 'Doctor', 'Admin'];
    if (!validRoles.includes(role)) {
        // Check DB
        const dbRole = await Role.findOne({ name: role });
        if (!dbRole) {
            return res.status(400).json({ message: 'Invalid role specified.' });
        }
    }

    try {
        // 2. Find the user based on mobile number and role
        let user = await User.findOne({ mobile_number, role });

        if (!user) {
            // 3. User not found -> CREATE NEW USER (Signup)
            const newUser = await User.create({
                mobile_number,
                role,
                fcm_token, // Save the initial token
            });
            user = newUser;

            // If the new user is a Doctor, create a corresponding Doctor document
            // This links the Doctor profile details to the base User document
            if (role === 'Doctor') {
                await Doctor.create({
                    userId: newUser._id,
                    consultation_fee: 0,
                    experience: 0,
                    working_hours: []
                });
            }
        } else {
            // 4. User found -> UPDATE FCM TOKEN (Login/Device change)
            if (fcm_token) {
                await User.updateOne({ _id: user._id }, { $set: { fcm_token } });
            }
        }

        // 5. Generate JWT Token
        const token = generateToken(user._id, user.role);

        // 6. Return success response
        res.status(200).json({
            success: true,
            message: 'Login successful.',
            token: token,
            role: user.role,
        });

    } catch (error) {
        console.error('Login error:', error);
        // Handle MongoDB duplicate key error (mobile_number uniqueness)
        if (error.code === 11000) {
            return res.status(409).json({ message: 'Mobile number is already registered under a different role.' });
        }
        res.status(500).json({ message: 'Server error during authentication.' });
    }
};

/**
 * @route POST /api/auth/coordinates
 * @description Update user coordinates on home screen load
 * @access Private (Requires JWT via authenticate.js)
 * @payload { latitude, longitude }
 */
exports.updateCoordinates = async (req, res) => {
    // userId is pulled from the token via authenticate.js middleware
    const userId = req.userId.id;
    const { latitude, longitude } = req.body;

    if (latitude === undefined || longitude === undefined) {
        return res.status(400).json({ message: 'Latitude and longitude are required.' });
    }

    try {
        // 1. Update the user document with new coordinates
        const updateResult = await User.updateOne(
            { _id: userId },
            { $set: { latitude, longitude } }
        );

        if (updateResult.matchedCount === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }

        res.status(200).json({
            success: true,
            message: 'Coordinates updated successfully.'
        });

    } catch (error) {
        console.error('Coordinate update error:', error);
        res.status(500).json({ message: 'Server error during coordinate update.' });
    }
};

/**
 * @route PUT /api/auth/profile
 * @description Allows authenticated users to update their name and email.
 * @access Private (Requires JWT via authenticate.js)
 * @payload { name, email, [mobile_number] }
 */
exports.updateProfile = async (req, res) => {
    // 1. Get User ID from authenticated token
    const userId = req.userId.id;
    const { name, email } = req.body;

    // Object to hold fields we want to update
    const updateFields = {};

    // 2. Validate and prepare update object
    if (name) {
        updateFields.name = name;
    }
    if (email) {
        // You may want to add email validation here
        updateFields.email = email;
    }


    // Check if there's anything to update
    if (Object.keys(updateFields).length === 0) {
        return res.status(400).json({ message: 'No valid fields provided for update.' });
    }

    try {
        // 3. Perform the update in MongoDB
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: updateFields },
            { new: true, runValidators: true } // 'new: true' returns the updated document
        ).select('-fcm_token -__v'); // Exclude sensitive/unnecessary fields from response

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // 4. Return the updated profile data
        res.status(200).json({
            success: true,
            message: 'Profile updated successfully.',
            profile: {
                id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                mobile_number: updatedUser.mobile_number,
                role: updatedUser.role
            }
        });

    } catch (error) {
        console.error('Profile update error:', error);
        // Handle unique constraint violation (e.g., if new mobile_number is taken)
        if (error.code === 11000) {
            return res.status(409).json({ message: 'Mobile number or email already in use.' });
        }
        res.status(500).json({ message: 'Server error during profile update.' });
    }
};