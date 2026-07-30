import { Router } from 'express';
import { protectAdmin, requireAdminRole } from '../../middlewares/protectAdmin.js';
import { 
  upsertCMSContent, 
  getAllCMSContent, 
  getPublicCMSContent 
} from './cms.controller.js';

const router = Router();

// Public routes (for Customer & Partner mobile apps)
router.get('/public/:targetApp/:type', getPublicCMSContent);

// Admin routes (for Super Admin panel)
router.get('/admin', protectAdmin, requireAdminRole(['super_admin', 'admin']), getAllCMSContent);
router.post('/admin', protectAdmin, requireAdminRole(['super_admin']), upsertCMSContent);

export default router;
