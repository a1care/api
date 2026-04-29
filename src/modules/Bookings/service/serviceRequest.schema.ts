import * as z from 'zod'

const objectId = z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId");

const scheduledSlotSchema = z.object({
    startTime: z.coerce.date(),
    endTime: z.coerce.date()
}).superRefine((slot, ctx) => {
    if (slot.endTime.getTime() < slot.startTime.getTime()) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "endTime must be greater than or equal to startTime",
            path: ["endTime"]
        });
    }
});

const locationSchema = z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180)
})

const serviceRequestValiation = z.object({
    childServiceId: objectId.optional(),
    healthPackageId: objectId.optional(),
    userId: objectId,
    roleId: z.array(objectId).optional(),
    status: z.enum([
        "PENDING",
        "BROADCASTED",
        "ACCEPTED",
        "RETURNED_TO_ADMIN",
        "IN_PROGRESS",
        "COMPLETED",
        "CANCELLED"
    ]).optional(),
    addressId: objectId.optional(),
    fulfillmentMode: z.enum([
        "HOME_VISIT",
        "HOSPITAL_VISIT",
        "VIRTUAL"
    ]),
    scheduledSlot: scheduledSlotSchema.optional(),
    location: locationSchema.optional(),
    assignedProviderId: objectId.optional(),
    assignRoleId: objectId.optional(),
    bookingType: z.enum(["SCHEDULED", "ON_DEMAND"]),
    price: z.number()
})

export default serviceRequestValiation

