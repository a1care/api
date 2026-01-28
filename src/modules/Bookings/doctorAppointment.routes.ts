import express from 'express'
import { createDoctorAppointment, getAppointmentsByPatientId } from './doctorAppointment.controller.js'
import { protect } from '../../middlewares/protect.js'

const router = express.Router()

router.post('/booking/:doctorId' , protect , createDoctorAppointment)
router.get('/patient/appointments' , protect , getAppointmentsByPatientId)
export default router