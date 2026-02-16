import { mongodbConnect } from "@/lib/dataBase/mongoDb"
import Assignment from "@/models/assignment"
import { BadRequest, forBidden, InternalServerIssue, notFound, roleCheck, Unauthorized, VerifyToken } from "@/utils/apiResponses/commonResponses"
import { HttpStatusCode } from "@/utils/apiResponses/httpsStatusAndCode"
import { AssignmentCreateSchema, AssignmentUpdateSchema, AssignmentSubmitSchema, AssignmentGradeSchema } from "@/validations/requestBody/assignmentValidation"
import { NextRequest, NextResponse } from "next/server"
import mongoose from "mongoose"

// POST - Create Assignment (Principal/Teacher only)
export async function POST(req: NextRequest): Promise<NextResponse> {
    try {
        const apiAuthentication = await VerifyToken(req)
        if (!apiAuthentication.isVerified || !apiAuthentication.user) {
            return Unauthorized()
        }

        const isValidRole = await roleCheck(apiAuthentication.user, "principal") || await roleCheck(apiAuthentication.user, "teacher")
        if (!isValidRole) {
            return forBidden("Only principal or teacher can create assignment")
        }

        const body = await req.json()
        const isValidBody = AssignmentCreateSchema.safeParse(body)
        if (!isValidBody.success) {
            return BadRequest(isValidBody.error.message || "Please provide valid body")
        }

        const isConnected = await mongodbConnect()
        if (!isConnected) {
            return InternalServerIssue(new Error("Failed to connect database!"))
        }

        const assignment = await Assignment.create({
            ...body,
            schoolId: apiAuthentication.user.schoolId,
            createdBy: apiAuthentication.user._id,
            createdByRole: apiAuthentication.user.role as "principal" | "teacher",
        })

        if (!assignment) {
            return InternalServerIssue(new Error("Failed to create assignment"))
        }

        return NextResponse.json({
            status: HttpStatusCode.CREATED,
            success: true,
            data: assignment,
        }, { status: HttpStatusCode.CREATED })

    } catch (error) {
        console.log(error)
        return InternalServerIssue(error)
    }
}

// GET - Get Assignments
export async function GET(req: NextRequest): Promise<NextResponse> {
    try {
        const apiAuthentication = await VerifyToken(req)
        if (!apiAuthentication.isVerified || !apiAuthentication.user) {
            return Unauthorized()
        }

        const { searchParams } = new URL(req.url)
        const classId = searchParams.get("classId")
        const subject = searchParams.get("subject")
        const isActive = searchParams.get("isActive")

        const isConnected = await mongodbConnect()
        if (!isConnected) {
            return InternalServerIssue(new Error("Failed to connect database!"))
        }

        const query: Record<string, unknown> = {
            schoolId: apiAuthentication.user.schoolId,
        }

        // Students see only their class assignments, teachers see all
        if (apiAuthentication.user.role === "student") {
            query.classId = apiAuthentication.user.currentClass
        } else if (classId) {
            query.classId = classId
        }

        if (subject) {
            query.subject = subject
        }

        if (isActive !== null) {
            query.isActive = isActive === "true"
        }

        const assignments = await Assignment.find(query)
            .populate("createdBy", "fullName")
            .sort({ dueDate: 1 })
            .lean()

        return NextResponse.json({
            status: HttpStatusCode.OK,
            success: true,
            data: assignments,
        }, { status: HttpStatusCode.OK })

    } catch (error) {
        console.log(error)
        return InternalServerIssue(error)
    }
}

// PATCH - Update Assignment or Submit/Grade (Principal/Teacher only)
export async function PATCH(req: NextRequest): Promise<NextResponse> {
    try {
        const apiAuthentication = await VerifyToken(req)
        if (!apiAuthentication.isVerified || !apiAuthentication.user) {
            return Unauthorized()
        }

        const { searchParams } = new URL(req.url)
        const assignmentId = searchParams.get("id")
        const action = searchParams.get("action") // "update" | "submit" | "grade"
        const studentId = searchParams.get("studentId")

        if (!assignmentId) {
            return BadRequest("Assignment ID is required")
        }

        const isConnected = await mongodbConnect()
        if (!isConnected) {
            return InternalServerIssue(new Error("Failed to connect database!"))
        }

        // Handle submission by student
        if (action === "submit" && apiAuthentication.user.role === "student") {
            const body = await req.json()
            const isValidBody = AssignmentSubmitSchema.safeParse(body)
            if (!isValidBody.success) {
                return BadRequest(isValidBody.error.message || "Please provide valid body")
            }

            const assignment = await Assignment.findById(assignmentId).lean()
            if (!assignment) {
                return notFound("Assignment not found")
            }

            // Check if already submitted
            const existingSubmission = assignment.submissions?.find(
                (s: { studentId: mongoose.Types.ObjectId }) => apiAuthentication.user && s.studentId.toString() === apiAuthentication.user._id.toString()
            )

            if (existingSubmission) {
                return BadRequest("You have already submitted this assignment")
            }

            const updated = await Assignment.findByIdAndUpdate(
                assignmentId,
                {
                    $push: {
                        submissions: {
                            studentId: apiAuthentication.user._id,
                            submittedAt: new Date(),
                            submissionText: body.submissionText,
                            attachmentUrl: body.attachmentUrl,
                        },
                    },
                },
                { new: true }
            ).lean()

            return NextResponse.json({
                status: HttpStatusCode.OK,
                success: true,
                data: updated,
            }, { status: HttpStatusCode.OK })
        }

        // Handle grading by teacher/principal
        if (action === "grade" && (await roleCheck(apiAuthentication.user, "principal") || await roleCheck(apiAuthentication.user, "teacher"))) {
            if (!studentId) {
                return BadRequest("Student ID is required for grading")
            }

            const body = await req.json()
            const isValidBody = AssignmentGradeSchema.safeParse(body)
            if (!isValidBody.success) {
                return BadRequest(isValidBody.error.message || "Please provide valid body")
            }

            const assignment = await Assignment.findOneAndUpdate(
                { _id: assignmentId, schoolId: apiAuthentication.user.schoolId, "submissions.studentId": studentId },
                {
                    $set: {
                        "submissions.$.grade": body.grade,
                        "submissions.$.feedback": body.feedback,
                        "submissions.$.gradedBy": apiAuthentication.user._id,
                        "submissions.$.gradedAt": new Date(),
                    },
                },
                { new: true }
            ).lean()

            if (!assignment) {
                return notFound("Assignment or submission not found")
            }

            return NextResponse.json({
                status: HttpStatusCode.OK,
                success: true,
                data: assignment,
            }, { status: HttpStatusCode.OK })
        }

        // Handle assignment update by teacher/principal
        const isValidRole = await roleCheck(apiAuthentication.user, "principal") || await roleCheck(apiAuthentication.user, "teacher")
        if (!isValidRole) {
            return forBidden("Only principal or teacher can update assignment")
        }

        const body = await req.json()
        const isValidBody = AssignmentUpdateSchema.safeParse(body)
        if (!isValidBody.success) {
            return BadRequest(isValidBody.error.message || "Please provide valid body")
        }

        const updatedAssignment = await Assignment.findOneAndUpdate(
            { _id: assignmentId, schoolId: apiAuthentication.user.schoolId },
            { ...body },
            { new: true }
        ).lean()

        if (!updatedAssignment) {
            return notFound("Assignment not found")
        }

        return NextResponse.json({
            status: HttpStatusCode.OK,
            success: true,
            data: updatedAssignment,
        }, { status: HttpStatusCode.OK })

    } catch (error) {
        console.log(error)
        return InternalServerIssue(error)
    }
}

// DELETE - Delete Assignment (Principal/Teacher only)
export async function DELETE(req: NextRequest): Promise<NextResponse> {
    try {
        const apiAuthentication = await VerifyToken(req)
        if (!apiAuthentication.isVerified || !apiAuthentication.user) {
            return Unauthorized()
        }

        const isValidRole = await roleCheck(apiAuthentication.user, "principal") || await roleCheck(apiAuthentication.user, "teacher")
        if (!isValidRole) {
            return forBidden("Only principal or teacher can delete assignment")
        }

        const { searchParams } = new URL(req.url)
        const assignmentId = searchParams.get("id")

        if (!assignmentId) {
            return BadRequest("Assignment ID is required")
        }

        const isConnected = await mongodbConnect()
        if (!isConnected) {
            return InternalServerIssue(new Error("Failed to connect database!"))
        }

        const deletedAssignment = await Assignment.findOneAndDelete({
            _id: assignmentId,
            schoolId: apiAuthentication.user.schoolId,
        }).lean()

        if (!deletedAssignment) {
            return notFound("Assignment not found")
        }

        return NextResponse.json({
            status: HttpStatusCode.OK,
            success: true,
            message: "Assignment deleted successfully",
        }, { status: HttpStatusCode.OK })

    } catch (error) {
        console.log(error)
        return InternalServerIssue(error)
    }
}