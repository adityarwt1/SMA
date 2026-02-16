import { z } from "zod"

const PeriodSchema = z.object({
    periodNumber: z.number().min(1, "Period number must be at least 1"),
    subject: z.string().min(1, "Subject is required"),
    teacherId: z.string().min(1, "Teacher ID is required"),
    startTime: z.string().min(1, "Start time is required"),
    endTime: z.string().min(1, "End time is required"),
})

const DayScheduleSchema = z.object({
    day: z.enum(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]),
    periods: z.array(PeriodSchema),
})

export const TimetableCreateSchema = z.object({
    classId: z.union([z.string(), z.number()]),
    academicYear: z.string().min(1, "Academic year is required"),
    schedule: z.array(DayScheduleSchema),
})

export const TimetableUpdateSchema = z.object({
    classId: z.union([z.string(), z.number()]).optional(),
    academicYear: z.string().min(1, "Academic year is required").optional(),
    schedule: z.array(DayScheduleSchema).optional(),
    isActive: z.boolean().optional(),
})