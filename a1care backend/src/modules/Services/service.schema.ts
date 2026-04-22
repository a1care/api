import * as  z from 'zod'

const serviceValidation = z.object({
    name: z.string(),
    title: z.string(),
    type: z.enum(["SELECT", "ASSIGN", "doctor", "nurse", "lab", "ambulance", "rental", "service"]),
    imageUrl: z.string().optional(),
    isActive: z.boolean().default(true)
})

export default serviceValidation