import { z } from "zod"

export const FeesStructureSchema = z.object({
    feeType: z.string().min(1, "Fee type is required"),
    amount: z.number().min(0, "Amount must be positive"),
    isOptional: z.boolean().default(false),
})

export const FeesSchemeCreateSchema = z.object({
    className: z.union([z.string(), z.number()], {
        error: "Please provide valid class name",
    }),
    academicYear: z.string().min(4, "Academic year is required"),
    totalFees: z.number().min(0, "Total fees must be positive"),
    feesStructure: z.array(FeesStructureSchema).min(1, "At least one fee type is required"),
    isActive: z.boolean().default(true),
})

export const FeesSchemeUpdateSchema = FeesSchemeCreateSchema.partial()

export const PaymentSubmitSchema = z.object({
    studentId: z.string().min(1, "Student ID is required"),
    academicYear: z.string().min(4, "Academic year is required"),
    amount: z.number().min(1, "Amount must be positive"),
    paymentMonth: z.number().min(1).max(12, "Invalid month"),
    paymentYear: z.number().min(2020).max(2100, "Invalid year"),
    paymentProof: z.string().min(1, "Payment proof URL is required"),
    paymentMode: z.enum(["cash", "online", "cheque", "upi"]).default("cash"),
    transactionId: z.string().optional(),
    remarks: z.string().optional(),
})

export const PaymentApprovalSchema = z.object({
    paymentRecordId: z.string().min(1, "Payment record ID is required"),
    status: z.enum(["approved", "rejected"]),
    rejectionReason: z.string().optional(),
})

export const GetStudentFeesSchema = z.object({
    studentId: z.string().min(1, "Student ID is required").optional(),
    academicYear: z.string().optional(),
    className: z.union([z.string(), z.number()]).optional(),
})

export const BulkPaymentActionSchema = z.object({
    paymentRecordIds: z.array(z.string().min(1, "Payment record ID is required")).min(1, "At least one payment record ID is required"),
    action: z.enum(["approve", "reject"]),
    rejectionReason: z.string().optional(),
})
