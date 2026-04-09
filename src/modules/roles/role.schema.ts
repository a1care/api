import * as z from 'zod'

const roleValidation = z.object({
    name:z.string() , 
    code:z.string().toUpperCase().min(2) ,
    description:z.string().optional(),
    capabilities:z.array(z.enum(["HOME_VISIT", "HOSPITAL_VISIT", "VIRTUAL"])).min(1, "Must have on capability"), 
    requiredLicense:z.boolean().default(false) , 
    licenseType:z.string().optional() , 
    isActive:z.boolean().default(true)
}).superRefine((data ,ctx)=>{
    if(data.requiredLicense && !data.licenseType){
        ctx.addIssue({
            path:['License Type'] , 
            message:"License type is required" , 
            code:z.ZodIssueCode.custom
        })
    }
})

export default roleValidation

