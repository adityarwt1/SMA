import { z } from "zod"

export const BookCreateSchema = z.object({
    bookId: z.string().min(1, "Book ID is required"),
    title: z.string().min(1, "Title is required"),
    author: z.string().min(1, "Author is required"),
    category: z.string().min(1, "Category is required"),
    publisher: z.string().optional(),
    isbn: z.string().optional(),
    quantity: z.number().min(1, "Quantity must be at least 1"),
    shelfLocation: z.string().optional(),
})

export const BookUpdateSchema = z.object({
    title: z.string().min(1, "Title is required").optional(),
    author: z.string().min(1, "Author is required").optional(),
    category: z.string().min(1, "Category is required").optional(),
    publisher: z.string().optional(),
    isbn: z.string().optional(),
    quantity: z.number().min(1, "Quantity must be at least 1").optional(),
    shelfLocation: z.string().optional(),
    isActive: z.boolean().optional(),
})

export const BookIssueSchema = z.object({
    studentId: z.string().min(1, "Student ID is required"),
    dueDate: z.string().datetime({ message: "Valid due date is required" }),
})