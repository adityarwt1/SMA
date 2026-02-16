import { mongodbConnect } from "@/lib/dataBase/mongoDb"
import Library from "@/models/library"
import { BadRequest, forBidden, InternalServerIssue, notFound, roleCheck, Unauthorized, VerifyToken } from "@/utils/apiResponses/commonResponses"
import { HttpStatusCode } from "@/utils/apiResponses/httpsStatusAndCode"
import { BookCreateSchema, BookUpdateSchema, BookIssueSchema } from "@/validations/requestBody/libraryValidation"
import { NextRequest, NextResponse } from "next/server"
import mongoose from "mongoose"

// POST - Add Book (Principal/Teacher only)
export async function POST(req: NextRequest): Promise<NextResponse> {
    try {
        const apiAuthentication = await VerifyToken(req)
        if (!apiAuthentication.isVerified || !apiAuthentication.user) {
            return Unauthorized()
        }

        const isValidRole = await roleCheck(apiAuthentication.user, "principal") || await roleCheck(apiAuthentication.user, "teacher")
        if (!isValidRole) {
            return forBidden("Only principal or teacher can add books")
        }

        const body = await req.json()
        const isValidBody = BookCreateSchema.safeParse(body)
        if (!isValidBody.success) {
            return BadRequest(isValidBody.error.message || "Please provide valid body")
        }

        const isConnected = await mongodbConnect()
        if (!isConnected) {
            return InternalServerIssue(new Error("Failed to connect database!"))
        }

        // Check if book with same bookId already exists
        const existingBook = await Library.findOne({
            schoolId: apiAuthentication.user.schoolId,
            bookId: body.bookId,
        }).lean()

        if (existingBook) {
            return BadRequest("Book with this ID already exists")
        }

        const book = await Library.create({
            ...body,
            schoolId: apiAuthentication.user.schoolId,
            availableQuantity: body.quantity,
        })

        if (!book) {
            return InternalServerIssue(new Error("Failed to add book"))
        }

        return NextResponse.json({
            status: HttpStatusCode.CREATED,
            success: true,
            data: book,
        }, { status: HttpStatusCode.CREATED })

    } catch (error) {
        console.log(error)
        return InternalServerIssue(error)
    }
}

// GET - Get Books
export async function GET(req: NextRequest): Promise<NextResponse> {
    try {
        const apiAuthentication = await VerifyToken(req)
        if (!apiAuthentication.isVerified || !apiAuthentication.user) {
            return Unauthorized()
        }

        const { searchParams } = new URL(req.url)
        const category = searchParams.get("category")
        const search = searchParams.get("search")
        const isActive = searchParams.get("isActive")

        const isConnected = await mongodbConnect()
        if (!isConnected) {
            return InternalServerIssue(new Error("Failed to connect database!"))
        }

        const query: Record<string, unknown> = {
            schoolId: apiAuthentication.user.schoolId,
        }

        if (category) {
            query.category = category
        }

        if (search) {
            query.$or = [
                { title: { $regex: search, $options: "i" } },
                { author: { $regex: search, $options: "i" } },
                { bookId: { $regex: search, $options: "i" } },
            ]
        }

        if (isActive !== null) {
            query.isActive = isActive === "true"
        }

        const books = await Library.find(query)
            .sort({ title: 1 })
            .lean()

        return NextResponse.json({
            status: HttpStatusCode.OK,
            success: true,
            data: books,
        }, { status: HttpStatusCode.OK })

    } catch (error) {
        console.log(error)
        return InternalServerIssue(error)
    }
}

// PATCH - Update Book or Issue/Return Book (Principal/Teacher only for actions)
export async function PATCH(req: NextRequest): Promise<NextResponse> {
    try {
        const apiAuthentication = await VerifyToken(req)
        if (!apiAuthentication.isVerified || !apiAuthentication.user) {
            return Unauthorized()
        }

        const { searchParams } = new URL(req.url)
        const bookId = searchParams.get("id")
        const action = searchParams.get("action") // "update" | "issue" | "return"

        if (!bookId) {
            return BadRequest("Book ID is required")
        }

        const isConnected = await mongodbConnect()
        if (!isConnected) {
            return InternalServerIssue(new Error("Failed to connect database!"))
        }

        // Handle book issue
        if (action === "issue" && (await roleCheck(apiAuthentication.user, "principal") || await roleCheck(apiAuthentication.user, "teacher"))) {
            const body = await req.json()
            const isValidBody = BookIssueSchema.safeParse(body)
            if (!isValidBody.success) {
                return BadRequest(isValidBody.error.message || "Please provide valid body")
            }

            const book = await Library.findById(bookId).lean()
            if (!book) {
                return notFound("Book not found")
            }

            if (book.availableQuantity <= 0) {
                return BadRequest("No copies available for issue")
            }

            let studentObjectId: mongoose.Types.ObjectId
            try {
                studentObjectId = new mongoose.Types.ObjectId(body.studentId)
            } catch {
                return BadRequest("Invalid student ID format")
            }

            const issueRecord = {
                bookId: book._id,
                studentId: studentObjectId,
                issueDate: new Date(),
                dueDate: new Date(body.dueDate),
                status: "issued" as const,
            }

            const updated = await Library.findByIdAndUpdate(
                bookId,
                {
                    $push: { issues: issueRecord },
                    $inc: { availableQuantity: -1 },
                },
                { new: true }
            ).lean()

            return NextResponse.json({
                status: HttpStatusCode.OK,
                success: true,
                data: updated,
            }, { status: HttpStatusCode.OK })
        }

        // Handle book return
        if (action === "return" && (await roleCheck(apiAuthentication.user, "principal") || await roleCheck(apiAuthentication.user, "teacher"))) {
            const studentId = searchParams.get("studentId")
            if (!studentId) {
                return BadRequest("Student ID is required for return")
            }

            const book = await Library.findOneAndUpdate(
                {
                    _id: bookId,
                    "issues.studentId": studentId,
                    "issues.status": "issued",
                },
                {
                    $set: {
                        "issues.$.status": "returned",
                        "issues.$.returnDate": new Date(),
                    },
                    $inc: { availableQuantity: 1 },
                },
                { new: true }
            ).lean()

            if (!book) {
                return notFound("Issued book record not found")
            }

            return NextResponse.json({
                status: HttpStatusCode.OK,
                success: true,
                data: book,
            }, { status: HttpStatusCode.OK })
        }

        // Handle book update
        const isValidRole = await roleCheck(apiAuthentication.user, "principal") || await roleCheck(apiAuthentication.user, "teacher")
        if (!isValidRole) {
            return forBidden("Only principal or teacher can update book")
        }

        const body = await req.json()
        const isValidBody = BookUpdateSchema.safeParse(body)
        if (!isValidBody.success) {
            return BadRequest(isValidBody.error.message || "Please provide valid body")
        }

        // If quantity is being updated, recalculate available quantity
        const existingBook = await Library.findById(bookId).lean()
        if (existingBook && body.quantity !== undefined && body.quantity !== existingBook.quantity) {
            const quantityDiff = body.quantity - existingBook.quantity
            body.availableQuantity = existingBook.availableQuantity + quantityDiff
        }

        const updatedBook = await Library.findOneAndUpdate(
            { _id: bookId, schoolId: apiAuthentication.user.schoolId },
            { ...body },
            { new: true }
        ).lean()

        if (!updatedBook) {
            return notFound("Book not found")
        }

        return NextResponse.json({
            status: HttpStatusCode.OK,
            success: true,
            data: updatedBook,
        }, { status: HttpStatusCode.OK })

    } catch (error) {
        console.log(error)
        return InternalServerIssue(error)
    }
}

// DELETE - Delete Book (Principal/Teacher only)
export async function DELETE(req: NextRequest): Promise<NextResponse> {
    try {
        const apiAuthentication = await VerifyToken(req)
        if (!apiAuthentication.isVerified || !apiAuthentication.user) {
            return Unauthorized()
        }

        const isValidRole = await roleCheck(apiAuthentication.user, "principal") || await roleCheck(apiAuthentication.user, "teacher")
        if (!isValidRole) {
            return forBidden("Only principal or teacher can delete book")
        }

        const { searchParams } = new URL(req.url)
        const bookId = searchParams.get("id")

        if (!bookId) {
            return BadRequest("Book ID is required")
        }

        const isConnected = await mongodbConnect()
        if (!isConnected) {
            return InternalServerIssue(new Error("Failed to connect database!"))
        }

        // Check if book has any issued copies
        const book = await Library.findById(bookId).lean()
        if (book) {
            const issuedCount = book.issues?.filter((i: { status: string }) => i.status === "issued").length || 0
            if (issuedCount > 0) {
                return BadRequest("Cannot delete book with issued copies")
            }
        }

        const deletedBook = await Library.findOneAndDelete({
            _id: bookId,
            schoolId: apiAuthentication.user.schoolId,
        }).lean()

        if (!deletedBook) {
            return notFound("Book not found")
        }

        return NextResponse.json({
            status: HttpStatusCode.OK,
            success: true,
            message: "Book deleted successfully",
        }, { status: HttpStatusCode.OK })

    } catch (error) {
        console.log(error)
        return InternalServerIssue(error)
    }
}