import { z } from "zod"

export const NoticeCreateSchema = z.object({
    topic: z.string().min(1, "Topic is required").max(200, "Topic must be less than 200 characters"),
    description: z.string().min(1, "Description is required"),
    image: z.string().optional(),
    targetAudience: z.enum(["school", "students"]),
    targetClass: z.union([z.string(), z.number()]).optional(),
})

export const NoticeUpdateSchema = z.object({
    topic: z.string().min(1, "Topic is required").max(200, "Topic must be less than 200 characters").optional(),
    description: z.string().min(1, "Description is required").optional(),
    image: z.string().optional(),
    targetAudience: z.enum(["school", "students"]).optional(),
    targetClass: z.union([z.string(), z.number()]).optional(),
    isActive: z.boolean().optional(),
})

export const NoticeQuerySchema = z.object({
    targetAudience: z.enum(["school", "students"]).optional(),
    targetClass: z.union([z.string(), z.number()]).optional(),
    isActive: z.string().optional(),
})