const router = require('express').Router()

const { getPatientAddress } = require('../../controllers/Patient/Address.controller')


router.get("/" , getPatientAddress)

module.exports = router