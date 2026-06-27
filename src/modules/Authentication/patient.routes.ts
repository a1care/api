import express from 'express'
import rateLimit from 'express-rate-limit'
import { getPatientDetailsById, sentOtpForPatient, updateProfile, verifyOtpForPatient, updatePatientFcmToken, requestPatientDeletion } from './patient.controller.js'
import { protect } from '../../middlewares/protect.js'
import { UploadProfileImage } from '../../middlewares/upload.js'
import { attachFileUrl } from '../../middlewares/attackFIle.js'

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
  windowMs: 10 * 60 * 1000, // 10 minutes (matches OTP expiry)
  max: 5,
  message: { success: false, message: "Too many verification attempts. Please request a new OTP." },
  standardHeaders: true,
  legacyHeaders: false,
})

router.get('/profile' , protect , getPatientDetailsById)
router.post('/send-otp' , otpLimiter, sentOtpForPatient)
router.post('/verify-otp' , otpVerifyLimiter, verifyOtpForPatient)
router.put('/profile', protect , UploadProfileImage,attachFileUrl, updateProfile)
router.patch('/fcm-token', protect, updatePatientFcmToken)
router.post('/request-deletion', protect, requestPatientDeletion)

export default router