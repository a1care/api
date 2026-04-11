import * as z from 'zod'

export const patientValidation = z.object({
    mobileNumber: z.preprocess((val) => (typeof val === 'string' ? parseInt(val, 10) : val), z.number()).optional(),
    name: z.string().optional(),
    email: z.string().email().optional().or(z.literal('')),
    location: z.object({
        latitude: z.preprocess((val) => (typeof val === 'string' ? parseFloat(val) : val), z.number()),
        longitude: z.preprocess((val) => (typeof val === 'string' ? parseFloat(val) : val), z.number())
    }).optional(),
    gender: z.enum(["Male", "Female", "Other"]).optional(),
    dateOfBirth: z.coerce.date().optional(),
    fcmToken: z.string().optional(),
    isRegistered: z.preprocess((val) => {
        if (typeof val === 'string') return val.toLowerCase().trim() === 'true';
        if (typeof val === 'boolean') return val;
        return false;
    }, z.boolean()).default(false)
})

export type patientType = z.infer<typeof patientValidation>
