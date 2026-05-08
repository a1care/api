import * as  z from 'zod'

const serviceTypeSchema = z.preprocess((value) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    if (!trimmed) return trimmed;
    const lower = trimmed.toLowerCase();
    if (["doctor", "nurse", "lab", "ambulance", "rental"].includes(lower)) {
        return lower;
    }
    const upper = trimmed.toUpperCase();
    if (["SELECT", "ASSIGN"].includes(upper)) {
        return upper;
    }
    return trimmed;
}, z.enum(["SELECT", "ASSIGN", "doctor", "nurse", "lab", "ambulance", "rental"]));

const serviceValidation = z.object({
    name: z.string().trim().min(1),
    title: z.string().trim().min(1),
    type: serviceTypeSchema,
    imageUrl: z.string(),
    isActive: z.boolean().default(true)
})

export default serviceValidation
