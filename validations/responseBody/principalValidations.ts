import z from "zod";

export const principalBodyValidation = z.object({
  fullName: z.string(),
  contactNumber: z.number(),
  email: z.string().email(),
  password: z.string().min(6),
  dp: z.string().optional(),
});
