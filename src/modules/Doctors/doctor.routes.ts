import express from 'express'
import { checkOtpStatus, createDoctor, getDoctorById, getStaffByRoleId, getStaffDetials, registerStaff, sendOtpForStaff, updateFcmToken, verifyOtp } from './doctor.controller.js'
import { availableSlotByDoctorId, blockTiming, createDoctorAvailability, getDoctorAvailabilitybyDoctorId } from './slots/doctorAvailability.controller.js'
import { GetObjectLegalHoldCommand } from '@aws-sdk/client-s3'
import { protect } from '../../middlewares/protect.js'
import { uploadStaffDocument } from '../../middlewares/upload.js'
import { ApiError } from '../../utils/ApiError.js'
import { ApiResponse } from '../../utils/ApiResponse.js'

const router = express.Router()

// authentication routes 
router.post("/auth/send-otp", sendOtpForStaff)
router.post("/auth/verify-otp", verifyOtp)
router.get("/auth/details", protect, getStaffDetials)
router.post("/auth/otp/status", checkOtpStatus)
router.put("/auth/register", protect, registerStaff)
router.put("/auth/fcm-token", protect, updateFcmToken)
router.post("/auth/upload-document", protect, uploadStaffDocument, (req, res) => {
    if (!req.file) throw new ApiError(400, "File upload failed");
    const file = req.file as any;
    const url = file.location || (file.path ? `/${file.path.replace(/\\/g, '/').split('/uploads/').pop()?.replace(/^/, 'uploads/')}` : undefined);
    const response = new ApiResponse(200, "Document uploaded", { url });
    return res.status(200).json({ ...response, success: true });
})

router.post('/create', createDoctor)
router.get('/:doctorId', getDoctorById)


//create doctor slot 
router.post('/slot/create/', protect, createDoctorAvailability)
router.post('/slot/block/:doctorId', blockTiming)

//available slots
router.get('/slots/:doctorId/:date', protect, availableSlotByDoctorId)
router.get('/staff/role/', getStaffByRoleId)

export default router
