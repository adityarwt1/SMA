import z from "zod"

export const AttendanceRecordSchema = z.object({
    studentId: z.string().min(1, "Student ID is required"),
    status: z.enum(["present", "absent", "late", "excused"], {
        error: "Status must be present, absent, late, or excused"
    })
})

export const TakeAttendanceSchema = z.object({
    className: z.union([z.string(), z.number()], {
        error: "Class name is required"
    }),
    attendanceDate: z.string().or(z.date()).optional(),
    records: z.array(AttendanceRecordSchema).min(1, "At least one student record is required")
})

export const UpdateAttendanceRecordSchema = z.object({
    studentId: z.string().min(1, "Student ID is required"),
    status: z.enum(["present", "absent", "late", "excused"], {
        error: "Status must be present, absent, late, or excused"
    })
})

export const GetAttendanceQuerySchema = z.object({
    className: z.union([z.string(), z.number()]).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    year: z.string().or(z.number()).optional(),
    month: z.string().or(z.number()).optional()
})

export const StudentStreakQuerySchema = z.object({
    studentId: z.string().min(1, "Student ID is required"),
    year: z.string().or(z.number()).optional()
})
