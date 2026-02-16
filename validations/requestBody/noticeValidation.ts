import { z } from "zod"

const NoticeAttachmentSchema = z.object({
    fileName: z.string().min(1, "File name is required"),
    fileUrl: z.string().url("Invalid file URL"),
    fileType: z.string().min(1, "File type is required"),
    fileSize: z.number().positive("File size must be positive"),
})

export const NoticeCreateSchema = z.object({
    topic: z.string().min(1, "Topic is required").max(200, "Topic must be less than 200 characters"),
    description: z.string().min(1, "Description is required"),
    image: z.string().optional(),
    attachments: z.array(NoticeAttachmentSchema).optional(),
    targetAudience: z.enum(["school", "students"]),
    targetClass: z.union([z.string(), z.number()]).optional(),
})

export const NoticeUpdateSchema = z.object({
    topic: z.string().min(1, "Topic is required").max(200, "Topic must be less than 200 characters").optional(),
    description: z.string().min(1, "Description is required").optional(),
    image: z.string().optional(),
    attachments: z.array(NoticeAttachmentSchema).optional(),
    targetAudience: z.enum(["school", "students"]).optional(),
    targetClass: z.union([z.string(), z.number()]).optional(),
    isActive: z.boolean().optional(),
})

export const NoticeQuerySchema = z.object({
    targetAudience: z.enum(["school", "students"]).optional(),
    targetClass: z.union([z.string(), z.number()]).optional(),
    isActive: z.string().optional(),
})

// Report validation schemas
export const ReportDateRangeSchema = z.object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
})

export const ReportClassFilterSchema = z.object({
    className: z.union([z.string(), z.number()]).optional(),
    academicYear: z.string().optional(),
})

export const ReportQuerySchema = z.object({
    type: z.enum(["attendance", "fees", "students-not-attending", "dashboard"]).optional(),
    date: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    className: z.union([z.string(), z.number()]).optional(),
    academicYear: z.string().optional(),
})
