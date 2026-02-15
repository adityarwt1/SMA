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
    bcCode:z.string()
})