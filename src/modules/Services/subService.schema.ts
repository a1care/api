import * as z from 'zod' ;

export const subServiceValidation = z.object({
    name:z.string() , 
    description:z.string() , 
    isActive:z.boolean().default(true) , 
    serviceId:z.string() , 
    imageUrl:z.string()
})
