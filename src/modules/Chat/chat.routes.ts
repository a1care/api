import express from 'express';
import { getChatHistory, sendChatMessage, markChatRead, getUnreadChatCount } from './chat.controller.js';
import { protect } from '../../middlewares/protect.js';

const router = express.Router();

// Static route must precede the '/:bookingId' param route.
router.get('/unread/count', protect, getUnreadChatCount);
router.get('/:bookingId', protect, getChatHistory);
router.post('/:bookingId', protect, sendChatMessage);
router.patch('/:bookingId/read', protect, markChatRead);

export default router;
