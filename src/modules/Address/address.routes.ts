import express from 'express'
import { protect } from '../../middlewares/protect.js'
import { addAddress, getUserAddresses, makePrimaryAddress, softDeleteAddress } from './address.controller.js'

const router = express.Router()

router.post('/add' , protect , addAddress)
router.get('/' ,protect ,  getUserAddresses)
router.patch('/:addressId' , protect , softDeleteAddress)
router.put('/primary/:addressId' , protect , makePrimaryAddress)

export default router