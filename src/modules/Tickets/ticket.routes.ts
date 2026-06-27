import express from 'express';
import { protect } from '../../middlewares/protect.js';
import { protectAdmin } from '../../middlewares/protectAdmin.js';
import { createTicket, getAllTickets, getMyTickets, updateTicketStatus, createPatientTicket, getMyPatientTickets } from './ticket.controller.js';
import { getMessagesByTicket, sendMessage } from './message.controller.js';

const router = express.Router();

// partner routes
router.post('/create', protect, createTicket);
router.get('/my', protect, getMyTickets);

// patient routes
router.post('/patient/create', protect, createPatientTicket);
router.get('/patient/my', protect, getMyPatientTickets);

// chat routes
router.get('/messages/:ticketId', protect, getMessagesByTicket);
router.post('/messages/send', protect, sendMessage);
router.post('/messages/admin/send', protectAdmin, sendMessage);

// admin routes
router.get('/all', protectAdmin, getAllTickets);
router.put('/status/:id', protectAdmin, updateTicketStatus);
router.get('/messages/admin/:ticketId', protectAdmin, getMessagesByTicket);

export default router;
