import z from 'zod'

export const teacherRegisterValidation = z.object({
    fullName:z.string(),
    email:z.string(),
    password:z.string(),
    dp:z.string().optional(),
    diseCode:z.number(),
    address:z.string(),
    subjects:z.array(z.string()),
    contactNumber:z.number(),
    isGuest:z.boolean(),
    bcCode:z.string(),
    classTeacherOf:z.union([z.string(), z.number()]).nullable().optional()
})
export const teacherUpdateValidation = z.object({
    fullName:z.string().optional(),
    email:z.string().optional(),
    password:z.string().optional(),
    dp:z.string().optional(),
    diseCode:z.number().optional(),
    address:z.string().optional(),
    subjects:z.array(z.string()).optional(),
    contactNumber:z.number().optional(),
    isGuest:z.boolean().optional(),
    bcCode:z.string().optional(),
    classTeacherOf:z.union([z.string(), z.number()]).nullable().optional()
})