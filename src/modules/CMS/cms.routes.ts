import { Router } from 'express';
import { protectAdmin, requireAdminRole } from '../../middlewares/protectAdmin.js';
import { 
  upsertCMSContent, 
  getAdminPrivacy,
  getAdminTerms,
  getAdminFaq,
  getPublicCMSContent 
} from './cms.controller.js';

const router = Router();

// Public routes (for Customer & Partner mobile apps)
router.get('/public/:targetApp/:type', getPublicCMSContent);

// Admin routes (for Super Admin panel)
router.get('/admin/privacy', protectAdmin, requireAdminRole(['super_admin', 'admin']), getAdminPrivacy);
router.get('/admin/terms', protectAdmin, requireAdminRole(['super_admin', 'admin']), getAdminTerms);
router.get('/admin/faq', protectAdmin, requireAdminRole(['super_admin', 'admin']), getAdminFaq);
router.post('/admin', protectAdmin, requireAdminRole(['super_admin']), upsertCMSContent);

export default router;
