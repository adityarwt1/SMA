import { z } from "zod"

export const AssignmentCreateSchema = z.object({
    classId: z.union([z.string(), z.number()]),
    subject: z.string().min(1, "Subject is required"),
    title: z.string().min(1, "Title is required").max(200, "Title must be less than 200 characters"),
    description: z.string().min(1, "Description is required"),
    attachmentUrl: z.string().optional(),
    dueDate: z.string().datetime({ message: "Valid due date is required" }),
})

export const AssignmentUpdateSchema = z.object({
    classId: z.union([z.string(), z.number()]).optional(),
    subject: z.string().min(1, "Subject is required").optional(),
    title: z.string().min(1, "Title is required").max(200, "Title must be less than 200 characters").optional(),
    description: z.string().min(1, "Description is required").optional(),
    attachmentUrl: z.string().optional(),
    dueDate: z.string().datetime().optional(),
    isActive: z.boolean().optional(),
})

export const AssignmentSubmitSchema = z.object({
    submissionText: z.string().optional(),
    attachmentUrl: z.string().optional(),
})

export const AssignmentGradeSchema = z.object({
    grade: z.number().min(0, "Grade must be at least 0").max(100, "Grade must be at most 100"),
    feedback: z.string().optional(),
})