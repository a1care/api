import express from 'express';
import { protect } from '../../middlewares/protect.js';
import { getAgoraToken } from './agora.controller.js';

const router = express.Router();

// Only protected users can request tokens
router.get('/token', protect, getAgoraToken);

export default router;
