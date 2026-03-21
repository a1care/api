import express from 'express'
import { createDoctorAppointment, getAppointmentsByPatientId, getPendingAppointmentbyProviderId, updateDoctorAppointmentStatus, getConsultationCredentials } from './doctorAppointment.controller.js'
import { getProviderUnifiedFeed } from './unifiedBooking.controller.js'
import { protect } from '../../middlewares/protect.js'
import { updateLocation, getLocation } from './location.controller.js';
import { getMessagesByTarget, sendMessage } from '../Tickets/message.controller.js';

const router = express.Router()

router.get('/provider/feed', protect, getProviderUnifiedFeed)
router.post('/booking/:doctorId', protect, createDoctorAppointment)
router.patch('/status/:id', protect, updateDoctorAppointmentStatus)
router.get('/patient/appointments', protect, getAppointmentsByPatientId)
router.get('/provider/appointments', protect, getPendingAppointmentbyProviderId)
router.get('/consultation/:id/token', protect, getConsultationCredentials)

// Live Tracking
router.post('/location/update', protect, updateLocation);
router.get('/location/:userId', protect, getLocation);

// Booking Chat
router.get('/messages', protect, getMessagesByTarget);
router.post('/messages/send', protect, sendMessage);

export default router