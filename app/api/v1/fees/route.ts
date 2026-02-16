import { TokenInterface } from "@/interfaces/token/tokenInterface"
import { mongodbConnect } from "@/lib/dataBase/mongoDb"
import FeesScheme from "@/models/feesScheme"
import School from "@/models/school"
import Student from "@/models/student"
import StudentFees from "@/models/studentFees"
import { createToken } from "@/services/tokenServices/jwtTokenServices"
import { BadRequest, conflict, forBidden, InternalServerIssue, notFound, roleCheck, Unauthorized, VerifyToken } from "@/utils/apiResponses/commonResponses"
import { HttpStatusCode } from "@/utils/apiResponses/httpsStatusAndCode"
import { FeesSchemeCreateSchema, FeesSchemeUpdateSchema, GetStudentFeesSchema, PaymentApprovalSchema, PaymentSubmitSchema } from "@/validations/requestBody/feesValidation"
import { NextRequest, NextResponse } from "next/server"
import mongoose from "mongoose"

// =========================
// FEES SCHEME APIs
// =========================

// POST - Create Fees Scheme (Principal/Teacher)
export async function POST(req: NextRequest): Promise<NextResponse> {
    try {
        const apiAuthentication = await VerifyToken(req)
        if (!apiAuthentication.isVerified || !apiAuthentication.user) {
            return Unauthorized()
        }

        const isValidRole = await roleCheck(apiAuthentication.user, "principal") || await roleCheck(apiAuthentication.user, "teacher")
        if (!isValidRole) {
            return forBidden("Only principal or teacher can create fees scheme")
        }

        const body = await req.json()
        const isValidBody = FeesSchemeCreateSchema.safeParse(body)
        if (!isValidBody.success) {
            return BadRequest(isValidBody.error.message || "Please provide valid body")
        }

        const isConnected = await mongodbConnect()
        if (!isConnected) {
            return InternalServerIssue(new Error("Failed to connect database!"))
        }

        // Check if school is private (not government)
        const school = await School.findById(apiAuthentication.user.schoolId).lean()
        if (!school) {
            return notFound("School not found")
        }

        if (school.isGovt) {
            return BadRequest("Fees scheme is only for private schools. Government schools don't have fees.")
        }

        // Check if fees scheme already exists for this class and academic year
        const existingScheme = await FeesScheme.findOne({
            schoolId: apiAuthentication.user.schoolId,
            className: body.className,
            academicYear: body.academicYear,
        }).lean()

        if (existingScheme) {
            return conflict("Fees scheme already exists for this class and academic year")
        }

        const feesScheme = await FeesScheme.create({
            ...body,
            schoolId: apiAuthentication.user.schoolId,
            createdBy: apiAuthentication.user._id,
            createdByRole: apiAuthentication.user.role,
        })

        if (!feesScheme) {
            return InternalServerIssue(new Error("Failed to create fees scheme"))
        }

        return NextResponse.json({
            status: HttpStatusCode.CREATED,
            success: true,
            data: feesScheme,
        }, { status: HttpStatusCode.CREATED })

    } catch (error) {
        console.log(error)
        return InternalServerIssue(error)
    }
}

// GET - Get Fees Schemes
export async function GET(req: NextRequest): Promise<NextResponse> {
    try {
        const apiAuthentication = await VerifyToken(req)
        if (!apiAuthentication.isVerified || !apiAuthentication.user) {
            return Unauthorized()
        }

        const { searchParams } = new URL(req.url)
        const className = searchParams.get("className")
        const academicYear = searchParams.get("academicYear")
        const isActive = searchParams.get("isActive")

        const isConnected = await mongodbConnect()
        if (!isConnected) {
            return InternalServerIssue(new Error("Failed to connect database!"))
        }

        const query: Record<string, unknown> = {
            schoolId: apiAuthentication.user.schoolId,
        }

        if (className) {
            query.className = className
        }
        if (academicYear) {
            query.academicYear = academicYear
        }
        if (isActive !== null) {
            query.isActive = isActive === "true"
        }

        const feesSchemes = await FeesScheme.find(query)
            .populate("createdBy", "fullName")
            .sort({ className: 1, academicYear: -1 })
            .lean()

        return NextResponse.json({
            status: HttpStatusCode.OK,
            success: true,
            data: feesSchemes,
        }, { status: HttpStatusCode.OK })

    } catch (error) {
        console.log(error)
        return InternalServerIssue(error)
    }
}

// PATCH - Update Fees Scheme
export async function PATCH(req: NextRequest): Promise<NextResponse> {
    try {
        const apiAuthentication = await VerifyToken(req)
        if (!apiAuthentication.isVerified || !apiAuthentication.user) {
            return Unauthorized()
        }

        const isValidRole = await roleCheck(apiAuthentication.user, "principal") || await roleCheck(apiAuthentication.user, "teacher")
        if (!isValidRole) {
            return forBidden("Only principal or teacher can update fees scheme")
        }

        const body = await req.json()
        const isValidBody = FeesSchemeUpdateSchema.safeParse(body)
        if (!isValidBody.success) {
            return BadRequest(isValidBody.error.message || "Please provide valid body")
        }

        const { searchParams } = new URL(req.url)
        const schemeId = searchParams.get("id")

        if (!schemeId) {
            return BadRequest("Fees scheme ID is required")
        }

        const isConnected = await mongodbConnect()
        if (!isConnected) {
            return InternalServerIssue(new Error("Failed to connect database!"))
        }

        const updatedScheme = await FeesScheme.findOneAndUpdate(
            {
                _id: schemeId,
                schoolId: apiAuthentication.user.schoolId,
            },
            { ...body },
            { new: true }
        ).lean()

        if (!updatedScheme) {
            return notFound("Fees scheme not found")
        }

        return NextResponse.json({
            status: HttpStatusCode.OK,
            success: true,
            data: updatedScheme,
        }, { status: HttpStatusCode.OK })

    } catch (error) {
        console.log(error)
        return InternalServerIssue(error)
    }
}

// DELETE - Delete Fees Scheme
export async function DELETE(req: NextRequest): Promise<NextResponse> {
    try {
        const apiAuthentication = await VerifyToken(req)
        if (!apiAuthentication.isVerified || !apiAuthentication.user) {
            return Unauthorized()
        }

        const isValidRole = await roleCheck(apiAuthentication.user, "principal")
        if (!isValidRole) {
            return forBidden("Only principal can delete fees scheme")
        }

        const { searchParams } = new URL(req.url)
        const schemeId = searchParams.get("id")

        if (!schemeId) {
            return BadRequest("Fees scheme ID is required")
        }

        const isConnected = await mongodbConnect()
        if (!isConnected) {
            return InternalServerIssue(new Error("Failed to connect database!"))
        }

        const deletedScheme = await FeesScheme.findOneAndDelete({
            _id: schemeId,
            schoolId: apiAuthentication.user.schoolId,
        }).lean()

        if (!deletedScheme) {
            return notFound("Fees scheme not found")
        }

        return NextResponse.json({
            status: HttpStatusCode.OK,
            success: true,
            message: "Fees scheme deleted successfully",
        }, { status: HttpStatusCode.OK })

    } catch (error) {
        console.log(error)
        return InternalServerIssue(error)
    }
}
