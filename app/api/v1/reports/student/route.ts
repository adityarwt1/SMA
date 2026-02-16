import { mongodbConnect } from "@/lib/dataBase/mongoDb"
import Attendance from "@/models/attendance"
import Student from "@/models/student"
import StudentFees, { PaymentRecord } from "@/models/studentFees"
import { BadRequest, InternalServerIssue, roleCheck, Unauthorized, VerifyToken } from "@/utils/apiResponses/commonResponses"
import { HttpStatusCode } from "@/utils/apiResponses/httpsStatusAndCode"
import { NextRequest, NextResponse } from "next/server"
import mongoose from "mongoose"

// GET - Student views their own attendance and fees
export async function GET(req: NextRequest): Promise<NextResponse> {
    try {
        const apiAuthentication = await VerifyToken(req)
        if (!apiAuthentication.isVerified || !apiAuthentication.user) {
            return Unauthorized()
        }

        // Only students can access this endpoint
        const isStudent = await roleCheck(apiAuthentication.user, "student")
        if (!isStudent) {
            return BadRequest("This endpoint is only for students")
        }

        const { searchParams } = new URL(req.url)
        const type = searchParams.get("type") || "all"
        const startDate = searchParams.get("startDate")
        const endDate = searchParams.get("endDate")
        const academicYear = searchParams.get("academicYear")

        const isConnected = await mongodbConnect()
        if (!isConnected) {
            return InternalServerIssue(new Error("Failed to connect database!"))
        }

        const studentId = apiAuthentication.user._id
        const schoolId = apiAuthentication.user.schoolId
        const currentClass = apiAuthentication.user.currentClass

        // Get current academic year if not provided
        const currentAcademicYear = academicYear || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`

        // Determine date range
        let startDateObj: Date
        let endDateObj: Date

        if (startDate && endDate) {
            startDateObj = new Date(startDate)
            endDateObj = new Date(endDate)
        } else {
            // Default to current month
            const now = new Date()
            startDateObj = new Date(now.getFullYear(), now.getMonth(), 1)
            endDateObj = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
        }

        const result: Record<string, unknown> = {}

        // Get student info
        const student = await Student.findById(studentId).select("fullName fatherName motherName currentClass").lean()
        if (student) {
            result.studentInfo = {
                name: student.fullName,
                fatherName: student.fatherName,
                class: student.currentClass,
            }
        }

        // Get attendance data
        if (type === "all" || type === "attendance") {
            const attendanceAggregation = await Attendance.aggregate([
                {
                    $match: {
                        schoolId: new mongoose.Types.ObjectId(schoolId as string),
                        className: currentClass,
                        attendanceDate: {
                            $gte: startDateObj,
                            $lte: endDateObj,
                        },
                    },
                },
                {
                    $unwind: "$attendanceRecords",
                },
                {
                    $match: {
                        "attendanceRecords.studentId": new mongoose.Types.ObjectId(studentId as string),
                    },
                },
                {
                    $group: {
                        _id: "$attendanceRecords.status",
                        count: { $sum: 1 },
                    },
                },
            ])

            const attendanceSummary = {
                present: 0,
                absent: 0,
                late: 0,
                excused: 0,
            }

            attendanceAggregation.forEach((item) => {
                if (item._id in attendanceSummary) {
                    attendanceSummary[item._id as keyof typeof attendanceSummary] = item.count
                }
            })

            const totalDays = attendanceAggregation.reduce((sum, item) => sum + item.count, 0)
            const attendancePercentage = totalDays > 0 
                ? ((attendanceSummary.present + attendanceSummary.late) / totalDays) * 100 
                : 0

            // Get daily attendance for graph
            const dailyAttendance = await Attendance.aggregate([
                {
                    $match: {
                        schoolId: new mongoose.Types.ObjectId(schoolId as string),
                        className: currentClass,
                        attendanceDate: {
                            $gte: startDateObj,
                            $lte: endDateObj,
                        },
                    },
                },
                {
                    $unwind: "$attendanceRecords",
                },
                {
                    $match: {
                        "attendanceRecords.studentId": new mongoose.Types.ObjectId(studentId as string),
                    },
                },
                {
                    $group: {
                        _id: { $dateToString: { format: "%Y-%m-%d", date: "$attendanceDate" } },
                        status: { $first: "$attendanceRecords.status" },
                    },
                },
                {
                    $sort: { "_id": 1 },
                },
            ])

            result.attendance = {
                summary: attendanceSummary,
                totalDays,
                attendancePercentage: Math.round(attendancePercentage * 100) / 100,
                graphData: dailyAttendance.map((item) => ({
                    date: item._id,
                    status: item.status,
                })),
                dateRange: { start: startDateObj, end: endDateObj },
            }
        }

        // Get fees data
        if (type === "all" || type === "fees") {
            const studentFees = await StudentFees.findOne({
                studentId: studentId,
                academicYear: currentAcademicYear,
            })
                .populate("feesSchemeId", "feesStructure totalFees")
                .lean()

            if (studentFees) {
                // Calculate actual paid based on approved payments
                const approvedPayments = studentFees.paymentHistory.filter(
                    (p: PaymentRecord) => p.status === "approved"
                )
                const actualPaid = approvedPayments.reduce((sum: number, p: PaymentRecord) => sum + p.amount, 0)
                const actualPending = studentFees.totalFees - actualPaid

                result.fees = {
                    totalFees: studentFees.totalFees,
                    paidAmount: actualPaid,
                    pendingAmount: actualPending,
                    paymentHistory: studentFees.paymentHistory.map((p: PaymentRecord) => ({
                        amount: p.amount,
                        month: p.paymentMonth,
                        year: p.paymentYear,
                        date: p.paymentDate,
                        status: p.status,
                        paymentMode: studentFees.paymentMode,
                    })),
                    academicYear: currentAcademicYear,
                }
            } else {
                result.fees = {
                    totalFees: 0,
                    paidAmount: 0,
                    pendingAmount: 0,
                    paymentHistory: [],
                    academicYear: currentAcademicYear,
                    message: "No fees record found for this academic year",
                }
            }
        }

        return NextResponse.json({
            status: HttpStatusCode.OK,
            success: true,
            data: result,
        }, { status: HttpStatusCode.OK })

    } catch (error) {
        console.log(error)
        return InternalServerIssue(error)
    }
}
