import * as  z from 'zod'

const serviceValidation = z.object({
    name: z.string(),
    title: z.string(),
    type: z.enum(["SELECT", "ASSIGN", "doctor", "nurse", "lab", "ambulance", "rental"]),
    imageUrl: z.string(),
    isActive: z.boolean().default(true)
})

export default serviceValidation