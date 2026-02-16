import { mongodbConnect } from "@/lib/dataBase/mongoDb"
import FeesScheme from "@/models/feesScheme"
import Student from "@/models/student"
import { PaymentRecord } from "@/models/studentFees"
import StudentFees from "@/models/studentFees"
import { BadRequest, conflict, forBidden, InternalServerIssue, notFound, roleCheck, Unauthorized, VerifyToken } from "@/utils/apiResponses/commonResponses"
import { HttpStatusCode } from "@/utils/apiResponses/httpsStatusAndCode"
import { BulkPaymentActionSchema, PaymentApprovalSchema, PaymentSubmitSchema } from "@/validations/requestBody/feesValidation"
import { NextRequest, NextResponse } from "next/server"
import mongoose from "mongoose"

// POST - Student submit payment (with payment proof)
export async function POST(req: NextRequest): Promise<NextResponse> {
    try {
        const apiAuthentication = await VerifyToken(req)
        if (!apiAuthentication.isVerified || !apiAuthentication.user) {
            return Unauthorized()
        }

        // Allow both student and teacher/principal to submit payment
        const isValidRole = await roleCheck(apiAuthentication.user, "student") || 
                          await roleCheck(apiAuthentication.user, "teacher") ||
                          await roleCheck(apiAuthentication.user, "principal")
        if (!isValidRole) {
            return forBidden("Invalid role for this action")
        }

        const body = await req.json()
        const isValidBody = PaymentSubmitSchema.safeParse(body)
        if (!isValidBody.success) {
            return BadRequest(isValidBody.error.message || "Please provide valid body")
        }

        const isConnected = await mongodbConnect()
        if (!isConnected) {
            return InternalServerIssue(new Error("Failed to connect database!"))
        }

        const { studentId, academicYear, amount, paymentMonth, paymentYear, paymentProof, paymentMode, transactionId, remarks } = body

        // Get student info
        const student = await Student.findById(studentId).lean()
        if (!student) {
            return notFound("Student not found")
        }

        // If student is submitting, they can only submit for themselves
        if (apiAuthentication.user.role === "student" && apiAuthentication.user._id.toString() !== studentId) {
            return forBidden("You can only submit payment for yourself")
        }

        // Get the active fees scheme for student's class and academic year
        const feesScheme = await FeesScheme.findOne({
            schoolId: student.schoolId,
            className: student.currentClass,
            academicYear: academicYear,
            isActive: true,
        }).lean()

        if (!feesScheme) {
            return notFound("No active fees scheme found for this class and academic year")
        }

        // Find or create student fees record
        let studentFees = await StudentFees.findOne({
            studentId: studentId,
            academicYear: academicYear,
        }).lean()

        if (!studentFees) {
            // Create new student fees record
            studentFees = await StudentFees.create({
                schoolId: student.schoolId,
                studentId: studentId,
                academicYear: academicYear,
                className: student.currentClass,
                feesSchemeId: feesScheme._id,
                totalFees: feesScheme.totalFees,
                paidAmount: 0,
                pendingAmount: feesScheme.totalFees,
                paymentHistory: [],
                paymentMode: paymentMode || "cash",
            })
        }

        // Check if payment for this month already exists (pending or approved)
        const existingPayment = studentFees.paymentHistory.find((p: PaymentRecord) => 
            p.paymentMonth === paymentMonth && 
            p.paymentYear === paymentYear &&
            (p.status === "pending" || p.status === "approved")
        )

        if (existingPayment) {
            return conflict(`Payment for ${getMonthName(paymentMonth)} ${paymentYear} already exists`)
        }

        // Add payment to history
        const paymentRecord = {
            amount,
            paymentMonth,
            paymentYear,
            paymentDate: new Date(),
            paymentProof,
            transactionId,
            status: "pending" as const,
            remarks,
        }

        const updatedStudentFees = await StudentFees.findOneAndUpdate(
            { studentId: studentId, academicYear: academicYear },
            {
                $push: { paymentHistory: paymentRecord },
                // Temporarily add to paid (will be adjusted on approval)
                $inc: { paidAmount: amount },
            },
            { new: true }
        ).lean()

        if (!updatedStudentFees) {
            return InternalServerIssue(new Error("Failed to submit payment"))
        }

        return NextResponse.json({
            status: HttpStatusCode.CREATED,
            success: true,
            message: "Payment submitted successfully, awaiting approval",
            data: {
                paymentId: updatedStudentFees.paymentHistory[updatedStudentFees.paymentHistory.length - 1]._id,
                amount,
                paymentMonth,
                paymentYear,
                status: "pending",
            },
        }, { status: HttpStatusCode.CREATED })

    } catch (error) {
        console.log(error)
        return InternalServerIssue(error)
    }
}

// GET - Get student fees details
export async function GET(req: NextRequest): Promise<NextResponse> {
    try {
        const apiAuthentication = await VerifyToken(req)
        if (!apiAuthentication.isVerified || !apiAuthentication.user) {
            return Unauthorized()
        }

        const { searchParams } = new URL(req.url)
        const studentId = searchParams.get("studentId")
        const academicYear = searchParams.get("academicYear")

        const isConnected = await mongodbConnect()
        if (!isConnected) {
            return InternalServerIssue(new Error("Failed to connect database!"))
        }

        const query: Record<string, unknown> = {
            schoolId: apiAuthentication.user.schoolId,
        }

        // If student, only show their own fees
        if (apiAuthentication.user.role === "student") {
            query.studentId = apiAuthentication.user._id
        } else if (studentId) {
            query.studentId = studentId
        }

        if (academicYear) {
            query.academicYear = academicYear
        }

        const studentFees = await StudentFees.find(query)
            .populate("studentId", "fullName fatherName motherName currentClass")
            .populate("feesSchemeId", "feesStructure totalFees")
            .sort({ createdAt: -1 })
            .lean()

        // Transform data to calculate actual pending based on approved payments
        const transformedData = studentFees.map(sf => {
            const approvedPayments = sf.paymentHistory.filter((p: PaymentRecord) => p.status === "approved")
            const actualPaidAmount = approvedPayments.reduce((sum: number, p: PaymentRecord) => sum + p.amount, 0)
            const actualPendingAmount = sf.totalFees - actualPaidAmount

            return {
                ...sf,
                paidAmount: actualPaidAmount,
                pendingAmount: actualPendingAmount,
                paymentHistory: sf.paymentHistory.map((p: PaymentRecord) => ({
                    ...p,
                    isDeletable: p.status === "pending",
                })),
            }
        })

        return NextResponse.json({
            status: HttpStatusCode.OK,
            success: true,
            data: transformedData,
        }, { status: HttpStatusCode.OK })

    } catch (error) {
        console.log(error)
        return InternalServerIssue(error)
    }
}

// PATCH - Cancel pending payment (student can cancel their own pending payments)
// OR Approve/Reject payments (Principal/Teacher only)
export async function PATCH(req: NextRequest): Promise<NextResponse> {
    try {
        const apiAuthentication = await VerifyToken(req)
        if (!apiAuthentication.isVerified || !apiAuthentication.user) {
            return Unauthorized()
        }

        const body = await req.json()
        const { paymentRecordId, action } = body

        if (!paymentRecordId || !action) {
            return BadRequest("Payment record ID and action are required")
        }

        const isConnected = await mongodbConnect()
        if (!isConnected) {
            return InternalServerIssue(new Error("Failed to connect database!"))
        }

        // Find the student fees record containing this payment
        const studentFees = await StudentFees.findOne({
            schoolId: apiAuthentication.user.schoolId,
            "paymentHistory._id": new mongoose.Types.ObjectId(paymentRecordId),
        }).lean()

        if (!studentFees) {
            return notFound("Payment record not found")
        }

        const paymentRecord = studentFees.paymentHistory.find(
            (p: PaymentRecord) => p._id?.toString() === paymentRecordId
        )

        if (!paymentRecord) {
            return notFound("Payment record not found")
        }

        // Check permissions
        if (action === "cancel") {
            // Student can cancel their own pending payments
            // Teacher/Principal can cancel any pending payment
            if (apiAuthentication.user.role === "student" && 
                studentFees.studentId.toString() !== apiAuthentication.user._id.toString()) {
                return forBidden("You can only cancel your own payments")
            }

            if (paymentRecord.status !== "pending") {
                return BadRequest("Only pending payments can be cancelled")
            }

            // Remove the payment and adjust amounts
            await StudentFees.findOneAndUpdate(
                { _id: studentFees._id },
                {
                    $pull: { paymentHistory: { _id: new mongoose.Types.ObjectId(paymentRecordId) } },
                    $inc: { paidAmount: -paymentRecord.amount },
                },
                { new: true }
            )

            return NextResponse.json({
                status: HttpStatusCode.OK,
                success: true,
                message: "Payment cancelled successfully",
            }, { status: HttpStatusCode.OK })
        }

        // APPROVE or REJECT action (Principal/Teacher only)
        if (action === "approve" || action === "reject") {
            const isTeacherOrPrincipal = await roleCheck(apiAuthentication.user, "teacher") || 
                                         await roleCheck(apiAuthentication.user, "principal")
            if (!isTeacherOrPrincipal) {
                return forBidden("Only principal or teacher can approve or reject payments")
            }

            // Validate body for approval/rejection
            const isValidBody = PaymentApprovalSchema.safeParse({
                paymentRecordId,
                status: action === "approve" ? "approved" : "rejected",
                rejectionReason: body.rejectionReason,
            })

            if (!isValidBody.success) {
                return BadRequest(isValidBody.error.message || "Please provide valid body")
            }

            if (paymentRecord.status !== "pending") {
                return BadRequest("Only pending payments can be approved or rejected")
            }

            const updateFields: Record<string, unknown> = {
                "paymentHistory.$.status": action === "approve" ? "approved" : "rejected",
                "paymentHistory.$.approvedBy": apiAuthentication.user._id,
                "paymentHistory.$.approvedAt": new Date(),
            }

            if (action === "reject" && body.rejectionReason) {
                updateFields["paymentHistory.$.rejectionReason"] = body.rejectionReason
            }

            // If approving, calculate actual pending after approval
            // If rejecting, subtract the amount from paidAmount
            const amountChange = action === "approve" ? 0 : -paymentRecord.amount

            const updatedStudentFees = await StudentFees.findOneAndUpdate(
                { 
                    _id: studentFees._id,
                    "paymentHistory._id": new mongoose.Types.ObjectId(paymentRecordId) 
                },
                {
                    $set: updateFields,
                    $inc: { paidAmount: amountChange },
                },
                { new: true }
            ).lean()

            if (!updatedStudentFees) {
                return InternalServerIssue(new Error("Failed to update payment status"))
            }

            // Recalculate pending amount based on approved payments
            const approvedPayments = updatedStudentFees.paymentHistory.filter((p: PaymentRecord) => p.status === "approved")
            const actualPaidAmount = approvedPayments.reduce((sum: number, p: PaymentRecord) => sum + p.amount, 0)
            const actualPendingAmount = updatedStudentFees.totalFees - actualPaidAmount

            await StudentFees.findByIdAndUpdate(updatedStudentFees._id, {
                paidAmount: actualPaidAmount,
                pendingAmount: actualPendingAmount,
            })

            return NextResponse.json({
                status: HttpStatusCode.OK,
                success: true,
                message: action === "approve" ? "Payment approved successfully" : "Payment rejected successfully",
                data: {
                    paymentId: paymentRecordId,
                    status: action === "approve" ? "approved" : "rejected",
                    approvedBy: apiAuthentication.user.role,
                    approvedAt: new Date(),
                },
            }, { status: HttpStatusCode.OK })
        }

        return BadRequest("Invalid action. Use 'cancel', 'approve', or 'reject'")

    } catch (error) {
        console.log(error)
        return InternalServerIssue(error)
    }
}

// Helper function to get month name
function getMonthName(month: number): string {
    const months = ["January", "February", "March", "April", "May", "June",
                   "July", "August", "September", "October", "November", "December"]
    return months[month - 1] || ""
}

// PUT - Bulk payment approval/rejection (Principal/Teacher only)
export async function PUT(req: NextRequest): Promise<NextResponse> {
    try {
        const apiAuthentication = await VerifyToken(req)
        if (!apiAuthentication.isVerified || !apiAuthentication.user) {
            return Unauthorized()
        }

        const isTeacherOrPrincipal = await roleCheck(apiAuthentication.user, "teacher") || 
                                     await roleCheck(apiAuthentication.user, "principal")
        if (!isTeacherOrPrincipal) {
            return forBidden("Only principal or teacher can approve or reject payments")
        }

        const body = await req.json()
        const isValidBody = BulkPaymentActionSchema.safeParse(body)
        if (!isValidBody.success) {
            return BadRequest(isValidBody.error.message || "Please provide valid body")
        }

        const { paymentRecordIds, action, rejectionReason } = body

        const isConnected = await mongodbConnect()
        if (!isConnected) {
            return InternalServerIssue(new Error("Failed to connect database!"))
        }

        const results = {
            approved: [] as string[],
            rejected: [] as string[],
            failed: [] as { id: string; reason: string }[],
        }

        // Process each payment record
        for (const paymentRecordId of paymentRecordIds) {
            try {
                // Find the student fees record containing this payment
                const studentFees = await StudentFees.findOne({
                    schoolId: apiAuthentication.user.schoolId,
                    "paymentHistory._id": new mongoose.Types.ObjectId(paymentRecordId),
                }).lean()

                if (!studentFees) {
                    results.failed.push({ id: paymentRecordId, reason: "Payment record not found" })
                    continue
                }

                const paymentRecord = studentFees.paymentHistory.find(
                    (p: PaymentRecord) => p._id?.toString() === paymentRecordId
                )

                if (!paymentRecord) {
                    results.failed.push({ id: paymentRecordId, reason: "Payment record not found" })
                    continue
                }

                if (paymentRecord.status !== "pending") {
                    results.failed.push({ id: paymentRecordId, reason: "Only pending payments can be approved or rejected" })
                    continue
                }

                const updateFields: Record<string, unknown> = {
                    "paymentHistory.$.status": action === "approve" ? "approved" : "rejected",
                    "paymentHistory.$.approvedBy": apiAuthentication.user._id,
                    "paymentHistory.$.approvedAt": new Date(),
                }

                if (action === "reject" && rejectionReason) {
                    updateFields["paymentHistory.$.rejectionReason"] = rejectionReason
                }

                const amountChange = action === "approve" ? 0 : -paymentRecord.amount

                const updatedStudentFees = await StudentFees.findOneAndUpdate(
                    {
                        _id: studentFees._id,
                        "paymentHistory._id": new mongoose.Types.ObjectId(paymentRecordId)
                    },
                    {
                        $set: updateFields,
                        $inc: { paidAmount: amountChange },
                    },
                    { new: true }
                ).lean()

                if (!updatedStudentFees) {
                    results.failed.push({ id: paymentRecordId, reason: "Failed to update payment" })
                    continue
                }

                // Recalculate pending amount based on approved payments
                const approvedPayments = updatedStudentFees.paymentHistory.filter((p: PaymentRecord) => p.status === "approved")
                const actualPaidAmount = approvedPayments.reduce((sum: number, p: PaymentRecord) => sum + p.amount, 0)
                const actualPendingAmount = updatedStudentFees.totalFees - actualPaidAmount

                await StudentFees.findByIdAndUpdate(updatedStudentFees._id, {
                    paidAmount: actualPaidAmount,
                    pendingAmount: actualPendingAmount,
                })

                if (action === "approve") {
                    results.approved.push(paymentRecordId)
                } else {
                    results.rejected.push(paymentRecordId)
                }

            } catch (error) {
                console.log(`Error processing payment ${paymentRecordId}:`, error)
                results.failed.push({ id: paymentRecordId, reason: "Internal server error" })
            }
        }

        const totalProcessed = results.approved.length + results.rejected.length
        const message = totalProcessed > 0 
            ? `Successfully processed ${totalProcessed} payment(s): ${results.approved.length} approved, ${results.rejected.length} rejected`
            : "No payments were processed"

        return NextResponse.json({
            status: HttpStatusCode.OK,
            success: true,
            message,
            data: results,
        }, { status: HttpStatusCode.OK })

    } catch (error) {
        console.log(error)
        return InternalServerIssue(error)
    }
}
