import { z } from "zod"

/* =========================
   Documents Schema
========================= */

export const DocumentsZodSchema = z.object({
  ssmId:z.number().min(5,{
    error:"Please provide full length of ssmId!"
  }),
  aadharNumber: z
    .number({
      error: "Aadhar number is required",
    })
    .int()
    .min(100000000000, "Aadhar must be 12 digits")
    .max(999999999999, "Aadhar must be 12 digits"),

  pan: z
    .string({
      error: "PAN is required",
    })
    .toUpperCase()
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Invalid PAN format"),
})

/* =========================
   Student Register Schema
========================= */

export const StudentRegisterSchemaZodSchema = z.object({
  diseCode: z.number().min(4, {
    error: "please provide full diseCode!",
  }),

  fullName: z
    .string({
      error: "Full name is required",
    })
    .min(2)
    .trim(),

  contactNumber: z
    .array(
      z
        .number({
          error: "Contact number must be number",
        })
        .int()
        .min(1000000000, "Must be 10 digits")
        .max(9999999999, "Must be 10 digits")
    )
    .min(1, "At least one contact number required"),

  fatherName: z
    .string({
      error: "Father name required",
    })
    .min(2)
    .trim(),

  motherName: z
    .string({
      error: "Mother name required",
    })
    .min(2)
    .trim(),

  documents: DocumentsZodSchema,

  dp: z.string().url().optional().or(z.literal("")),

  email: z.email(),

  address: z
    .string({
      error: "Address required",
    })
    .min(5),

  state: z
    .string({
      error: "State required",
    })
    .min(2),

  pinCode: z.number({
    error: "Pin code required",
  }),

  password: z.string().min(6, {
    error: "Password must be least length of 6!",
  }),
  currentClass:z.union([z.string(), z.number()],{
    error:"Please provide valid datatype of currentClass."
  })
})

/* =========================
   Student Update Schema
   (ALL OPTIONAL)
========================= */

export const studentUpdateZodValidation =
  StudentRegisterSchemaZodSchema.partial()
