import * as z from 'zod'

const doctorValidation = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    gender: z.enum(["Male", "Female", "Other"]),
    startExperience: z.coerce.date().refine((date) => !isNaN(date.getTime()), { message: "Invalid date object" }),
    specialization: z.array(z.string()),
    consultationFee: z.number().min(0, "Fee cannot be negative").optional(),
    homeConsultationFee: z.number().min(0, "Fee cannot be negative").optional(),
    onlineConsultationFee: z.number().min(0, "Fee cannot be negative").optional(),
    about: z.string(),
    workingHours: z.string(),
    serviceRadius: z.number().min(0, "Radius cannot be negative").optional(),
    roleId: z.string(),
    profileImage: z.string().optional(),
    documents: z.array(z.object({
        type: z.string(),
        url: z.string()
    })).optional(),
    status: z.enum(["Pending", "Active", "Inactive"]).optional(),
    bankDetails: z.object({
        accountHolderName: z.string(),
        accountNumber: z.string(),
        ifscCode: z.string(),
        bankName: z.string(),
        upiId: z.string().optional()
    }).optional()
})

export default doctorValidation