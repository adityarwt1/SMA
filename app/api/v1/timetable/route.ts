import { mongodbConnect } from "@/lib/dataBase/mongoDb"
import Timetable from "@/models/timetable"
import { BadRequest, forBidden, InternalServerIssue, notFound, roleCheck, Unauthorized, VerifyToken } from "@/utils/apiResponses/commonResponses"
import { HttpStatusCode } from "@/utils/apiResponses/httpsStatusAndCode"
import { TimetableCreateSchema, TimetableUpdateSchema } from "@/validations/requestBody/timetableValidation"
import { NextRequest, NextResponse } from "next/server"

// POST - Create Timetable (Principal/Teacher only)
export async function POST(req: NextRequest): Promise<NextResponse> {
    try {
        const apiAuthentication = await VerifyToken(req)
        if (!apiAuthentication.isVerified || !apiAuthentication.user) {
            return Unauthorized()
        }

        const isValidRole = await roleCheck(apiAuthentication.user, "principal") || await roleCheck(apiAuthentication.user, "teacher")
        if (!isValidRole) {
            return forBidden("Only principal or teacher can create timetable")
        }

        const body = await req.json()
        const isValidBody = TimetableCreateSchema.safeParse(body)
        if (!isValidBody.success) {
            return BadRequest(isValidBody.error.message || "Please provide valid body")
        }

        const isConnected = await mongodbConnect()
        if (!isConnected) {
            return InternalServerIssue(new Error("Failed to connect database!"))
        }

        // Check if timetable already exists for this class and academic year
        const existingTimetable = await Timetable.findOne({
            schoolId: apiAuthentication.user.schoolId,
            classId: body.classId,
            academicYear: body.academicYear,
        }).lean()

        if (existingTimetable) {
            return BadRequest("Timetable already exists for this class and academic year")
        }

        const timetable = await Timetable.create({
            ...body,
            schoolId: apiAuthentication.user.schoolId,
            createdBy: apiAuthentication.user._id,
        })

        if (!timetable) {
            return InternalServerIssue(new Error("Failed to create timetable"))
        }

        return NextResponse.json({
            status: HttpStatusCode.CREATED,
            success: true,
            data: timetable,
        }, { status: HttpStatusCode.CREATED })

    } catch (error) {
        console.log(error)
        return InternalServerIssue(error)
    }
}

// GET - Get Timetables
export async function GET(req: NextRequest): Promise<NextResponse> {
    try {
        const apiAuthentication = await VerifyToken(req)
        if (!apiAuthentication.isVerified || !apiAuthentication.user) {
            return Unauthorized()
        }

        const { searchParams } = new URL(req.url)
        const classId = searchParams.get("classId")
        const academicYear = searchParams.get("academicYear")
        const isActive = searchParams.get("isActive")

        const isConnected = await mongodbConnect()
        if (!isConnected) {
            return InternalServerIssue(new Error("Failed to connect database!"))
        }

        const query: Record<string, unknown> = {
            schoolId: apiAuthentication.user.schoolId,
        }

        // Students see only their class timetable
        if (apiAuthentication.user.role === "student") {
            query.classId = apiAuthentication.user.currentClass
        } else if (classId) {
            query.classId = classId
        }

        if (academicYear) {
            query.academicYear = academicYear
        }

        if (isActive !== null) {
            query.isActive = isActive === "true"
        }

        const timetables = await Timetable.find(query)
            .populate("createdBy", "fullName")
            .populate("schedule.periods.teacherId", "fullName")
            .lean()

        return NextResponse.json({
            status: HttpStatusCode.OK,
            success: true,
            data: timetables,
        }, { status: HttpStatusCode.OK })

    } catch (error) {
        console.log(error)
        return InternalServerIssue(error)
    }
}

// PATCH - Update Timetable (Principal/Teacher only)
export async function PATCH(req: NextRequest): Promise<NextResponse> {
    try {
        const apiAuthentication = await VerifyToken(req)
        if (!apiAuthentication.isVerified || !apiAuthentication.user) {
            return Unauthorized()
        }

        const isValidRole = await roleCheck(apiAuthentication.user, "principal") || await roleCheck(apiAuthentication.user, "teacher")
        if (!isValidRole) {
            return forBidden("Only principal or teacher can update timetable")
        }

        const body = await req.json()
        const isValidBody = TimetableUpdateSchema.safeParse(body)
        if (!isValidBody.success) {
            return BadRequest(isValidBody.error.message || "Please provide valid body")
        }

        const { searchParams } = new URL(req.url)
        const timetableId = searchParams.get("id")

        if (!timetableId) {
            return BadRequest("Timetable ID is required")
        }

        const isConnected = await mongodbConnect()
        if (!isConnected) {
            return InternalServerIssue(new Error("Failed to connect database!"))
        }

        const updatedTimetable = await Timetable.findOneAndUpdate(
            { _id: timetableId, schoolId: apiAuthentication.user.schoolId },
            { ...body },
            { new: true }
        ).lean()

        if (!updatedTimetable) {
            return notFound("Timetable not found")
        }

        return NextResponse.json({
            status: HttpStatusCode.OK,
            success: true,
            data: updatedTimetable,
        }, { status: HttpStatusCode.OK })

    } catch (error) {
        console.log(error)
        return InternalServerIssue(error)
    }
}

// DELETE - Delete Timetable (Principal/Teacher only)
export async function DELETE(req: NextRequest): Promise<NextResponse> {
    try {
        const apiAuthentication = await VerifyToken(req)
        if (!apiAuthentication.isVerified || !apiAuthentication.user) {
            return Unauthorized()
        }

        const isValidRole = await roleCheck(apiAuthentication.user, "principal") || await roleCheck(apiAuthentication.user, "teacher")
        if (!isValidRole) {
            return forBidden("Only principal or teacher can delete timetable")
        }

        const { searchParams } = new URL(req.url)
        const timetableId = searchParams.get("id")

        if (!timetableId) {
            return BadRequest("Timetable ID is required")
        }

        const isConnected = await mongodbConnect()
        if (!isConnected) {
            return InternalServerIssue(new Error("Failed to connect database!"))
        }

        const deletedTimetable = await Timetable.findOneAndDelete({
            _id: timetableId,
            schoolId: apiAuthentication.user.schoolId,
        }).lean()

        if (!deletedTimetable) {
            return notFound("Timetable not found")
        }

        return NextResponse.json({
            status: HttpStatusCode.OK,
            success: true,
            message: "Timetable deleted successfully",
        }, { status: HttpStatusCode.OK })

    } catch (error) {
        console.log(error)
        return InternalServerIssue(error)
    }
}