import * as z from 'zod'

export const patientValidation = z.object({
    mobileNumber:z.number().optional() , 
    name:z.string() ,
    email:z.email().optional() ,
    // profileImage:z.string() ,
    location:z.object({
        latitude:z.number() , 
        longitude:z.number() 
    }).optional() , 
    gender:z.enum(["Male", "Gender" , "Other"]) , 
    dateOfBirth:z.coerce.date()  ,
    fcmToken:z.string().optional() ,
    isRegistered:z.boolean().default(false)
})

export type patientType = z.infer<typeof patientValidation>
