import * as z from 'zod'

export const childServiceValidation = z.object({
    name: z.string(),
    description: z.string(),
    serviceId: z.string(),
    subServiceId: z.string(),
    price: z.number(),
    selectionType: z.enum(["SELECT", "ASSIGN"]),
    isActive: z.boolean().default(true),
    allowedRoleIds: z.array(z.string()).optional(),
    imageUrl: z.string().optional(),
    fulfillmentMode: z.enum(["HOME_VISIT", "HOSPITAL_VISIT", "VIRTUAL"])
})