import { z } from "zod";

export const addressValidation = z.object({
  userId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, "Invalid userId"),

  label: z.enum([
    "HOME",
    "WORK",
    "OTHERS",
    "FRIEND",
    "FAMILY"
  ]),

  location: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180)
  }),

  state: z.string().min(2, "State is required"),
  city: z.string().min(2, "City is required"),

  pincode: z
    .string()
    .regex(/^\d{6}$/, "Invalid pincode"),

  moreInfo: z.string().optional(),

});
