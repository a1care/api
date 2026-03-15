import * as z from 'zod'

const doctorAppoinmentValidations = z.object({
    doctorId:z.string() , 
    patientId:z.string() , 
    startingTime:z.string() , 
    endingTime:z.string() ,
    isConfirmed:z.boolean().default(false) ,
    date:z.coerce.date() , 
    weekDay:z.number().optional() , 
    paymentMode:z.enum(['ONLINE' , 'OFFLINE']).optional() , 
    paymentStatus:z.enum(['PENDING' , 'COMPLETED' , 'FAILED']) ,
    totalAmount:z.number().optional() ,
})

export default doctorAppoinmentValidations