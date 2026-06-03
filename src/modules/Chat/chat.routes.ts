import express from 'express';
import { getChatHistory, sendChatMessage, markChatRead } from './chat.controller.js';
import { protect } from '../../middlewares/protect.js';

const router = express.Router();

router.get('/:bookingId', protect, getChatHistory);
router.post('/:bookingId', protect, sendChatMessage);
router.patch('/:bookingId/read', protect, markChatRead);

export default router;
