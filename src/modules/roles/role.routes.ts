import express from 'express'
import { createRole, getRoles } from './role.controller.js'
const router = express.Router()

// roleid 6968b066a32d6eb67e8b7c74

router.post('/create' , createRole)
router.get('/' , getRoles)

export default router