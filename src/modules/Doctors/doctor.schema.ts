import * as z from 'zod'

const doctorValidation = z.object({
    name: z.string().min(2, "Name must be at least 2 characters").max(50, "Name too long").regex(/^[a-zA-Z\s]+$/, "Name can only contain letters and spaces"),
    gender: z.enum(["Male", "Female", "Other"]),
    startExperience: z.coerce.date().refine((date) => !isNaN(date.getTime()), { message: "Invalid date object" }).optional(),
    experience: z.union([z.number(), z.string()]).optional(),
    specialization: z.array(z.string()),
    consultationFee: z.number().min(0, "Fee cannot be negative").optional(),
    homeConsultationFee: z.number().min(0, "Fee cannot be negative").optional(),
    onlineConsultationFee: z.number().min(0, "Fee cannot be negative").optional(),
    about: z.string().optional(),
    workingHours: z.string().optional(),
    serviceRadius: z.number().min(0, "Radius cannot be negative").optional(),
    roleId: z.string(),
    profileImage: z.string().optional(),
    documents: z.array(z.object({
        type: z.string(),
        url: z.string()
    })).optional(),
    status: z.enum(["Pending", "Active", "Rejected"]).optional(),
    rejectionReason: z.string().optional(),
    isRegistered: z.boolean().optional(),
    vehicleNumber: z.string().optional(),
    vehicleType: z.string().optional(),
    businessName: z.string().optional(),
    gstNumber: z.string().optional(),
    bankDetails: z.object({
        accountHolderName: z.string().min(3, "Account holder name must be at least 3 characters").optional(),
        accountNumber: z.string().min(9, "Account number must be at least 9 characters").max(20, "Account number too long").optional(),
        ifscCode: z.string().length(11, "IFSC code must be exactly 11 characters").optional(),
        bankName: z.string().min(3, "Bank name must be at least 3 characters").optional(),
        upiId: z.string().optional()
    }).optional()
})

export default doctorValidation
