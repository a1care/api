import express from 'express'
import { createDoctor, getDoctorById, getStaffByRoleId, getStaffDetials, sendOtpForStaff, verifyOtp } from './doctor.controller.js'
import { availableSlotByDoctorId, blockTiming, createDoctorAvailability, getDoctorAvailabilitybyDoctorId } from './slots/doctorAvailability.controller.js'
import { GetObjectLegalHoldCommand } from '@aws-sdk/client-s3'
import { protect } from '../../middlewares/protect.js'

const router = express.Router() 

// authentication routes 
router.post("/auth/send-otp" , sendOtpForStaff)
router.post("/auth/verify-otp" , verifyOtp)
router.get("/auth/details" , protect ,  getStaffDetials)

router.post('/create' , createDoctor)
router.get('/:doctorId' , getDoctorById)


//create doctor slot 
router.post('/slot/create/:doctorId' , createDoctorAvailability)
router.post('/slot/block/:doctorId' , blockTiming)

//available slots
router.get('/slots/:doctorId/:date' , availableSlotByDoctorId)
router.get('/staff/role/' , getStaffByRoleId)

export default router