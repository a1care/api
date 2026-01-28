import * as z from 'zod'

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/ , "Invalid object")

const serviceAcceptanceValidation = z.object({
    serviceRequestId:objectId , 
    providerId:objectId,   
    roleId:objectId , 
    status:z.enum(["ACCEPTED", "REJECTED", "EXPIRED" , 'COMPLETED']),
    patientId:objectId ,
    price:z.number() ,
})

export default serviceAcceptanceValidation
