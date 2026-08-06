import { Router } from 'express';
import { protectAdmin, requireAdminRole } from '../../middlewares/protectAdmin.js';
import {
  getPublicAreas,
  adminGetAllAreas,
  adminCreateArea,
  adminUpdateArea,
  adminDeleteArea,
  adminSeedAreas
} from './serviceableArea.controller.js';

const router = Router();

// Public route
router.get('/public', getPublicAreas);

// Admin routes
router.get('/admin', protectAdmin, requireAdminRole(['super_admin', 'admin']), adminGetAllAreas);
router.post('/admin/seed', protectAdmin, requireAdminRole(['super_admin', 'admin']), adminSeedAreas);
router.post('/admin', protectAdmin, requireAdminRole(['super_admin', 'admin']), adminCreateArea);
router.patch('/admin/:id', protectAdmin, requireAdminRole(['super_admin', 'admin']), adminUpdateArea);
router.delete('/admin/:id', protectAdmin, requireAdminRole(['super_admin', 'admin']), adminDeleteArea);

export default router;
