import express from 'express'
import { createRole, getRoles } from './role.controller.js'
import { protectAdmin, requireAdminRole } from '../../middlewares/protectAdmin.js'
const router = express.Router()

// roleid 6968b066a32d6eb67e8b7c74

router.post('/create', protectAdmin, requireAdminRole(["super_admin"]), createRole)
router.get('/' , getRoles)

export default router