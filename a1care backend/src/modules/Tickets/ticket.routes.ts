import express from 'express';
import { protect } from '../../middlewares/protect.js';
import { createTicket, getAllTickets, getMyTickets, updateTicketStatus, createPatientTicket, getMyPatientTickets } from './ticket.controller.js';

const router = express.Router();

// partner routes
router.post('/create', protect, createTicket);
router.get('/my', protect, getMyTickets);

// patient routes
router.post('/patient/create', protect, createPatientTicket);
router.get('/patient/my', protect, getMyPatientTickets);

// admin routes
router.get('/all', getAllTickets); // would ideally protect admin 
router.put('/status/:id', updateTicketStatus); // would ideally protect admin

export default router;
