import { mongodbConnect } from "@/lib/dataBase/mongoDb"
import Notice from "@/models/notice"
import { BadRequest, forBidden, InternalServerIssue, notFound, roleCheck, Unauthorized, VerifyToken } from "@/utils/apiResponses/commonResponses"
import { HttpStatusCode } from "@/utils/apiResponses/httpsStatusAndCode"
import { NoticeCreateSchema, NoticeUpdateSchema } from "@/validations/requestBody/noticeValidation"
import { NextRequest, NextResponse } from "next/server"

// POST - Create Notice (Principal/Teacher only)
export async function POST(req: NextRequest): Promise<NextResponse> {
    try {
        const apiAuthentication = await VerifyToken(req)
        if (!apiAuthentication.isVerified || !apiAuthentication.user) {
            return Unauthorized()
        }

        const isValidRole = await roleCheck(apiAuthentication.user, "principal") || await roleCheck(apiAuthentication.user, "teacher")
        if (!isValidRole) {
            return forBidden("Only principal or teacher can post notice")
        }

        const body = await req.json()
        const isValidBody = NoticeCreateSchema.safeParse(body)
        if (!isValidBody.success) {
            return BadRequest(isValidBody.error.message || "Please provide valid body")
        }

        const isConnected = await mongodbConnect()
        if (!isConnected) {
            return InternalServerIssue(new Error("Failed to connect database!"))
        }

        const notice = await Notice.create({
            ...body,
            schoolId: apiAuthentication.user.schoolId,
            postedBy: apiAuthentication.user._id,
            postedByRole: apiAuthentication.user.role as "principal" | "teacher",
        })

        if (!notice) {
            return InternalServerIssue(new Error("Failed to create notice"))
        }

        return NextResponse.json({
            status: HttpStatusCode.CREATED,
            success: true,
            data: notice,
        }, { status: HttpStatusCode.CREATED })

    } catch (error) {
        console.log(error)
        return InternalServerIssue(error)
    }
}

// GET - Get Notices (Accessible by everyone - principal, teacher, student)
export async function GET(req: NextRequest): Promise<NextResponse> {
    try {
        const apiAuthentication = await VerifyToken(req)
        if (!apiAuthentication.isVerified || !apiAuthentication.user) {
            return Unauthorized()
        }

        const { searchParams } = new URL(req.url)
        const targetAudience = searchParams.get("targetAudience")
        const targetClass = searchParams.get("targetClass")
        const isActive = searchParams.get("isActive")

        const isConnected = await mongodbConnect()
        if (!isConnected) {
            return InternalServerIssue(new Error("Failed to connect database!"))
        }

        const query: Record<string, unknown> = {
            schoolId: apiAuthentication.user.schoolId,
        }

        // Filter by target audience
        if (targetAudience) {
            if (targetAudience === "students") {
                // For students, show school-wide notices OR notices targeting their class
                const studentClass = apiAuthentication.user.currentClass
                query.$or = [
                    { targetAudience: "school" },
                    { targetAudience: "students", targetClass: studentClass },
                ]
            } else {
                query.targetAudience = targetAudience
            }
        }

        // Filter by class
        if (targetClass) {
            if (!query.$or) {
                query.$or = [
                    { targetAudience: "school" },
                    { targetAudience: "students" },
                ]
            }
            // Add class filter to the query
            query.$and = [
                { $or: query.$or as object[] },
                { $or: [{ targetClass: targetClass }, { targetAudience: "school" }] }
            ]
            delete query.$or
        }

        // Filter by active status
        if (isActive !== null) {
            query.isActive = isActive === "true"
        }

        const notices = await Notice.find(query)
            .populate("postedBy", "fullName")
            .sort({ createdAt: -1 })
            .lean()

        return NextResponse.json({
            status: HttpStatusCode.OK,
            success: true,
            data: notices,
        }, { status: HttpStatusCode.OK })

    } catch (error) {
        console.log(error)
        return InternalServerIssue(error)
    }
}

// PATCH - Update Notice (Principal/Teacher only - can only edit their own school notices)
export async function PATCH(req: NextRequest): Promise<NextResponse> {
    try {
        const apiAuthentication = await VerifyToken(req)
        if (!apiAuthentication.isVerified || !apiAuthentication.user) {
            return Unauthorized()
        }

        const isValidRole = await roleCheck(apiAuthentication.user, "principal") || await roleCheck(apiAuthentication.user, "teacher")
        if (!isValidRole) {
            return forBidden("Only principal or teacher can update notice")
        }

        const body = await req.json()
        const isValidBody = NoticeUpdateSchema.safeParse(body)
        if (!isValidBody.success) {
            return BadRequest(isValidBody.error.message || "Please provide valid body")
        }

        const { searchParams } = new URL(req.url)
        const noticeId = searchParams.get("id")

        if (!noticeId) {
            return BadRequest("Notice ID is required")
        }

        const isConnected = await mongodbConnect()
        if (!isConnected) {
            return InternalServerIssue(new Error("Failed to connect database!"))
        }

        const updatedNotice = await Notice.findOneAndUpdate(
            {
                _id: noticeId,
                schoolId: apiAuthentication.user.schoolId,
            },
            { ...body },
            { new: true }
        ).lean()

        if (!updatedNotice) {
            return notFound("Notice not found")
        }

        return NextResponse.json({
            status: HttpStatusCode.OK,
            success: true,
            data: updatedNotice,
        }, { status: HttpStatusCode.OK })

    } catch (error) {
        console.log(error)
        return InternalServerIssue(error)
    }
}

// DELETE - Delete Notice (Principal/Teacher only)
export async function DELETE(req: NextRequest): Promise<NextResponse> {
    try {
        const apiAuthentication = await VerifyToken(req)
        if (!apiAuthentication.isVerified || !apiAuthentication.user) {
            return Unauthorized()
        }

        const isValidRole = await roleCheck(apiAuthentication.user, "principal") || await roleCheck(apiAuthentication.user, "teacher")
        if (!isValidRole) {
            return forBidden("Only principal or teacher can delete notice")
        }

        const { searchParams } = new URL(req.url)
        const noticeId = searchParams.get("id")

        if (!noticeId) {
            return BadRequest("Notice ID is required")
        }

        const isConnected = await mongodbConnect()
        if (!isConnected) {
            return InternalServerIssue(new Error("Failed to connect database!"))
        }

        const deletedNotice = await Notice.findOneAndDelete({
            _id: noticeId,
            schoolId: apiAuthentication.user.schoolId,
        }).lean()

        if (!deletedNotice) {
            return notFound("Notice not found")
        }

        return NextResponse.json({
            status: HttpStatusCode.OK,
            success: true,
            message: "Notice deleted successfully",
        }, { status: HttpStatusCode.OK })

    } catch (error) {
        console.log(error)
        return InternalServerIssue(error)
    }
}