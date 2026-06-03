import express from 'express';
import { getChatHistory, sendChatMessage } from './chat.controller.js';
import { protect } from '../../middlewares/protect.js';

const router = express.Router();

router.get('/:bookingId', protect, getChatHistory);
router.post('/:bookingId', protect, sendChatMessage);

export default router;
