import z from 'zod'

export const schoolRegisterValidation = z.object({
    schoolName:z.string().min(6, "Please provide full name of school!"),
    diseCode:z.number(),
    address:z.string(),
    pinCode:z.number(),
    dist:z.string(),
    state:z.string(),
    from:z.union([z.string(), z.number()]),
    to: z.union([z.number(), z.string()]),
    logo:z.string().optional(),
    isGovt:z.boolean()
})