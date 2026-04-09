import express from 'express';
import { getChatHistory } from './chat.controller.js';
import { protect } from '../../middlewares/protect.js';

const router = express.Router();

router.get('/:bookingId', protect, getChatHistory);

export default router;
