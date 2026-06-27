import express from 'express'
import rateLimit from 'express-rate-limit'
import { checkOtpStatus, createDoctor, getDoctorById, getStaffByRoleId, getStaffDetials, registerStaff, requestStaffDeletion, sendOtpForStaff, updateFcmToken, verifyOtp } from './doctor.controller.js'
import { availableSlotByDoctorId, blockTiming, createDoctorAvailability, getDoctorAvailabilitybyDoctorId } from './slots/doctorAvailability.controller.js'
import { protect } from '../../middlewares/protect.js'
import { protectAdmin, requireAdminRole } from '../../middlewares/protectAdmin.js'
import { uploadStaffDocument } from '../../middlewares/upload.js'
import { ApiError } from '../../utils/ApiError.js'
import { ApiResponse } from '../../utils/ApiResponse.js'

const router = express.Router()

// Limit OTP requests to prevent SMS-cost abuse
const otpLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 3,
    message: { success: false, message: "Too many OTP requests. Please wait 1 minute." },
    standardHeaders: true,
    legacyHeaders: false,
})

// Limit OTP verification to prevent brute-force of the 6-digit code
const otpVerifyLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 5,
    message: { success: false, message: "Too many verification attempts. Please request a new OTP." },
    standardHeaders: true,
    legacyHeaders: false,
})

// authentication routes
router.post("/auth/send-otp", otpLimiter, sendOtpForStaff)
router.post("/auth/verify-otp", otpVerifyLimiter, verifyOtp)
router.get("/auth/details", protect, getStaffDetials)
router.post("/auth/otp/status", checkOtpStatus)
router.put("/auth/register", protect, registerStaff)
router.put("/auth/fcm-token", protect, updateFcmToken)
router.post("/auth/request-deletion", protect, requestStaffDeletion)
router.post("/auth/upload-document", protect, uploadStaffDocument, (req, res) => {
    if (!req.file) throw new ApiError(400, "File upload failed");
    const file = req.file as any;
    const url = file.location || (file.path ? `/${file.path.replace(/\\/g, '/').split('/uploads/').pop()?.replace(/^/, 'uploads/')}` : undefined);
    const response = new ApiResponse(200, "Document uploaded", { url });
    return res.status(200).json({ ...response, success: true });
})

router.post('/create', protectAdmin, requireAdminRole(["admin", "super_admin"]), createDoctor)
router.get('/:doctorId', getDoctorById)


//create doctor slot 
router.post('/slot/create/', protect, createDoctorAvailability)
router.post('/slot/block/:doctorId', protect, blockTiming)

//available slots
router.get('/slots/:doctorId/:date', protect, availableSlotByDoctorId)

// a partner's own stored weekly availability
router.get('/slot/availability/:doctorId', protect, getDoctorAvailabilitybyDoctorId)
router.get('/staff/role/', protect, getStaffByRoleId)

export default router
