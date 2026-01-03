const ApiResponse = require('../../utils/ApiResponse')
const asyncHandler = require('../../utils/asyncHandler')


const getPatientAddress = asyncHandler((req , res )=>{
    res.json(new ApiResponse(200 , "address routee in initilaised", {}))
})






module.exports = {getPatientAddress}