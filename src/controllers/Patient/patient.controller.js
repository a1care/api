const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const ApiError = require('../../utils/ApiError');
const twilioSendOtp = require('../../config/TwilioService');
const User = require('../../models/user.model');
const jwt = require('jsonwebtoken');

const responseTestRoutes = asyncHandler(async (req, res) => {
    // Simulate a successful response
    if (req.query.success === 'true') {
        return res.json(new ApiResponse(200, 'Test successful response'));
    }
    // Simulate an error response
    throw new ApiError(400, 'Test error response');
});

// send Otp 
const sendOtp = asyncHandler(async (req, res) => {
    // Implementation for sending OTP 
    const { mobileNumber } = req.body;
    console.log('Sending OTP to mobile number:', mobileNumber);
    // Call Twilio service to send OTP
    // await twilioSendOtp.twilioSendOtp(mobileNumber);
    return res.json(new ApiResponse(200, 'OTP sent successfully'));
    
});

// verify otp 
const verifyOtp = asyncHandler(async (req, res) => {
    const { mobileNumber, code } = req.body;
    // Call Twilio service to verify OTP
    // const verificationStatus = await twilioSendOtp.verifyTwofaOtp(mobileNumber, code);
    if(code === '123123') {
        let isRegistered = true
        let isUserExits  = await User.findOne({ mobile_number: mobileNumber });
        if(!isUserExits) {
            const newUser = new User({ mobile_number: mobileNumber });
            await newUser.save();
            isUserExits = newUser;
            isRegistered = false;
        }

        console.log('User found/created:', isUserExits);

        const token = jwt.sign({ id: isUserExits._id }, process.env.JWT_SECRET, { expiresIn: '1d' });

        return res.json(new ApiResponse(200, 'OTP verified successfully', { token , isRegistered }));
    } else {
        throw new ApiError(400, 'Invalid OTP');
    }
});

// patient registration
const updateProfile = asyncHandler(async (req, res) => {
    const userId = req.userId.id;
    const { name, email, profile_image, latitude, longitude, fcm_token } = req.body;
    const user = await User.findById(userId);
    if (!user) {
        throw new ApiError(404, 'User not found');
    }
    user.name = name || user.name;
    user.email = email || user.email;
    user.profile_image = profile_image || user.profile_image;
    user.latitude = latitude || user.latitude;
    user.longitude = longitude || user.longitude;
    user.fcm_token = fcm_token || user.fcm_token;
    user.isRegistered = true;
    await user.save();
    return res.json(new ApiResponse(200, 'Profile updated successfully', user));
});

// get patient profile 
const getProfile = asyncHandler(async (req, res) => {
    const userId = req.userId.id;
    const user = await User.findById(userId);
    if (!user) {
        throw new ApiError(404, 'User not found');
    }
    return res.json(new ApiResponse(200, 'Profile fetched successfully', user));
});

// update patient profile  
const updatePatientProfile = asyncHandler(async (req, res) => {
    const userId = req.userId.id;
    const uploadedFiles = req.file;

    console.log("upload profile" , req.file)
    const { name, email, profileImage, latitude, longitude, fcm_token , dob   } = req.body;
    console.log(req.body)
    const user = await User.findById(userId);
    if (!user) {
        throw new ApiError(404, 'User not found');
    }
    user.name = name || user.name;
    user.email = email || user.email;
    user.profile_image = uploadedFiles.filename || user.profile_image;
    user.latitude = latitude || user.latitude;
    user.longitude = longitude || user.longitude;
    user.fcm_token = fcm_token || user.fcm_token;
    user.date_of_birth = dob || user.date_of_birth
    user.isRegistered = true;
    await user.save();
    return res.json(new ApiResponse(200, 'Profile updated successfully', user));
});

module.exports = { responseTestRoutes, sendOtp, verifyOtp, getProfile, updatePatientProfile };