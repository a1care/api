import express from 'express'
import { getPatientDetailsById, sentOtpForPatient, updateProfile, verifyOtpForPatient } from './patient.controller.js'
import { protect } from '../../middlewares/protect.js'
import { UploadProfileImage } from '../../middlewares/upload.js'
import { attachFileUrl } from '../../middlewares/attackFIle.js'

const router = express.Router()

router.get('/profile' , protect , getPatientDetailsById)
router.post('/send-otp' , sentOtpForPatient)
router.post('/verify-otp' , verifyOtpForPatient)
router.put('/profile', protect , UploadProfileImage,attachFileUrl, updateProfile)

export default router