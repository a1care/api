import express from 'express'
import { createDoctorAppointment, getAppointmentsByPatientId, getPendingAppointmentbyProviderId, updateDoctorAppointmentStatus, getConsultationCredentials } from './doctorAppointment.controller.js'
import { protect } from '../../middlewares/protect.js'

const router = express.Router()

router.post('/booking/:doctorId', protect, createDoctorAppointment)
router.patch('/status/:id', protect, updateDoctorAppointmentStatus)
router.get('/patient/appointments', protect, getAppointmentsByPatientId)
router.get('/provider/appointments', protect, getPendingAppointmentbyProviderId)
router.get('/consultation/:id/token', protect, getConsultationCredentials)

export default router