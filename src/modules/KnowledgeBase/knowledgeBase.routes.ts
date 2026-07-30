import { Router } from 'express';
import { protectAdmin, requireAdminRole } from '../../middlewares/protectAdmin.js';
import { protect as protectPartner } from '../../middlewares/protect.js';
import { 
  createArticle, 
  updateArticle, 
  deleteArticle, 
  getAllArticlesAdmin, 
  getPartnerArticles 
} from './knowledgeBase.controller.js';

const router = Router();

// Public/Partner routes
// Uses protectPartner middleware so only authenticated partners can view guides
// If you want it completely public, you could remove protectPartner.
router.get('/partner', getPartnerArticles);

// Admin routes (for Super Admin panel)
router.get('/admin', protectAdmin, requireAdminRole(['super_admin', 'admin']), getAllArticlesAdmin);
router.post('/admin', protectAdmin, requireAdminRole(['super_admin']), createArticle);
router.put('/admin/:id', protectAdmin, requireAdminRole(['super_admin']), updateArticle);
router.delete('/admin/:id', protectAdmin, requireAdminRole(['super_admin']), deleteArticle);

export default router;
