import z from "zod";

export const principalBodyValidation = z.object({
  fullName: z.string(),
  contactNumber: z.number(),
  email: z.string().email(),
  password: z.string().min(6),
  dp: z.string().optional(),
});

export const principalPathValidation = z.object({
  fullName: z.string().optional(),
  contactNumber: z.number().optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  dp: z.string().optional(),
})