import * as z from 'zod'

const doctorValidation = z.object({
    name:z.string() , 
    gender:z.enum(["Male" , "Female" , "Other"]),
    startExperience:z.coerce.date() , 
    specialization:z.array(z.string()),
    consultationFee:z.number() , 
    about:z.string(), 
    workingHours:z.string() , 
    completed:z.number() , 
    roleId:z.string(), 
    mobileNumber:z.string()
}) 

export default doctorValidation