import { mongodbConnect } from "@/lib/dataBase/mongoDb"
import Attendance from "@/models/attendance"
import Student from "@/models/student"
import StudentFees from "@/models/studentFees"
import { BadRequest, InternalServerIssue, Unauthorized, VerifyToken } from "@/utils/apiResponses/commonResponses"
import { HttpStatusCode } from "@/utils/apiResponses/httpsStatusAndCode"
import { ReportQuerySchema } from "@/validations/requestBody/noticeValidation"
import { NextRequest, NextResponse } from "next/server"
import mongoose from "mongoose"

// GET - Get reports based on role and query parameters
export async function GET(req: NextRequest): Promise<NextResponse> {
    try {
        const apiAuthentication = await VerifyToken(req)
        if (!apiAuthentication.isVerified || !apiAuthentication.user) {
            return Unauthorized()
        }

        const { searchParams } = new URL(req.url)
        const type = searchParams.get("type") || "dashboard"
        const date = searchParams.get("date")
        const startDate = searchParams.get("startDate")
        const endDate = searchParams.get("endDate")
        const className = searchParams.get("className")
        const academicYear = searchParams.get("academicYear")

        const isConnected = await mongodbConnect()
        if (!isConnected) {
            return InternalServerIssue(new Error("Failed to connect database!"))
        }

        const userRole = apiAuthentication.user.role
        const schoolId = apiAuthentication.user.schoolId

        // Validate query params
        const isValidQuery = ReportQuerySchema.safeParse({ type, date, startDate, endDate, className, academicYear })
        if (!isValidQuery.success) {
            return BadRequest(isValidQuery.error.message)
        }

        // Determine date range
        let startDateObj: Date
        let endDateObj: Date

        if (startDate && endDate) {
            startDateObj = new Date(startDate)
            endDateObj = new Date(endDate)
        } else if (date) {
            const selectedDate = new Date(date)
            startDateObj = new Date(selectedDate.setHours(0, 0, 0, 0))
            endDateObj = new Date(selectedDate.setHours(23, 59, 59, 999))
        } else {
            // Default to today
            const today = new Date()
            startDateObj = new Date(today.setHours(0, 0, 0, 0))
            endDateObj = new Date(today.setHours(23, 59, 59, 999))
        }

        // Get current academic year if not provided
        const currentAcademicYear = academicYear || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`

        // Initialize result
        let result: Record<string, unknown>

        switch (type) {
            case "dashboard":
                result = await getDashboardReport(schoolId, startDateObj, endDateObj, className, currentAcademicYear, userRole, apiAuthentication.user)
                break
            case "attendance":
                result = await getAttendanceReport(schoolId, startDateObj, endDateObj, className, userRole, apiAuthentication.user)
                break
            case "fees":
                result = await getFeesReport(schoolId, startDateObj, endDateObj, className, currentAcademicYear)
                break
            case "students-not-attending":
                result = await getStudentsNotAttendingReport(schoolId, startDateObj, endDateObj, className, currentAcademicYear)
                break
            default:
                result = await getDashboardReport(schoolId, startDateObj, endDateObj, className, currentAcademicYear, userRole, apiAuthentication.user)
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

// Dashboard Report - Summary for principal and teacher
async function getDashboardReport(
    schoolId: mongoose.Types.ObjectId | string,
    startDate: Date,
    endDate: Date,
    className: string | number | null,
    academicYear: string,
    userRole: string,
    user: { _id: string | mongoose.Types.ObjectId; currentClass?: string | number }
) {
    // Get total students
    const studentQuery: Record<string, unknown> = { schoolId }
    if (userRole === "teacher" && user.currentClass) {
        studentQuery.currentClass = user.currentClass
    } else if (className) {
        studentQuery.currentClass = className
    }

    const totalStudents = await Student.countDocuments(studentQuery)

    // Get today's attendance using aggregation
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const attendanceAggregation = await Attendance.aggregate([
        {
            $match: {
                schoolId: new mongoose.Types.ObjectId(schoolId as string),
                attendanceDate: {
                    $gte: today,
                    $lt: tomorrow,
                },
                ...(className ? { className } : {}),
            },
        },
        {
            $unwind: "$attendanceRecords",
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

    const totalAttendanceTaken = attendanceAggregation.reduce((sum, item) => sum + item.count, 0)
    const attendancePercentage = totalStudents > 0 ? ((attendanceSummary.present + attendanceSummary.late) / totalStudents) * 100 : 0

    // Get fees summary for the month
    const currentMonth = new Date().getMonth() + 1
    const currentYear = new Date().getFullYear()

    const feesAggregation = await StudentFees.aggregate([
        {
            $match: {
                schoolId: new mongoose.Types.ObjectId(schoolId as string),
                academicYear,
            },
        },
        {
            $unwind: {
                path: "$paymentHistory",
                preserveNullAndEmptyArrays: false,
            },
        },
        {
            $match: {
                "paymentHistory.paymentMonth": currentMonth,
                "paymentHistory.paymentYear": currentYear,
                "paymentHistory.status": "approved",
            },
        },
        {
            $group: {
                _id: null,
                totalCollected: { $sum: "$paymentHistory.amount" },
                totalStudents: { $addToSet: "$studentId" },
            },
        },
    ])

    const feesSummary: {
        totalCollected: number
        totalStudentsPaid: number
        totalStudents: number
        totalPending: number
    } = {
        totalCollected: feesAggregation[0]?.totalCollected || 0,
        totalStudentsPaid: feesAggregation[0]?.totalStudents?.length || 0,
        totalStudents: totalStudents,
        totalPending: 0,
    }

    // Get pending fees
    const pendingFeesAggregation = await StudentFees.aggregate([
        {
            $match: {
                schoolId: new mongoose.Types.ObjectId(schoolId as string),
                academicYear,
            },
        },
        {
            $group: {
                _id: null,
                totalPending: { $sum: "$pendingAmount" },
            },
        },
    ])

    const pendingAmount = pendingFeesAggregation[0]?.totalPending || 0
    feesSummary.totalPending = pendingAmount

    return {
        totalStudents,
        todayAttendance: attendanceSummary,
        attendancePercentage: Math.round(attendancePercentage * 100) / 100,
        totalAttendanceTaken,
        fees: feesSummary,
        dateRange: {
            start: startDate,
            end: endDate,
        },
    }
}

// Attendance Report with daily breakdown for graphs
async function getAttendanceReport(
    schoolId: mongoose.Types.ObjectId | string,
    startDate: Date,
    endDate: Date,
    className: string | number | null,
    userRole: string,
    user: { _id: string | mongoose.Types.ObjectId; currentClass?: string | number }
) {
    const matchQuery: Record<string, unknown> = {
        schoolId: new mongoose.Types.ObjectId(schoolId as string),
        attendanceDate: {
            $gte: startDate,
            $lte: endDate,
        },
    }

    if (userRole === "teacher" && user.currentClass) {
        matchQuery.className = user.currentClass
    } else if (className) {
        matchQuery.className = className
    }

    // Get daily attendance breakdown for graphs
    const dailyAttendance = await Attendance.aggregate([
        {
            $match: matchQuery,
        },
        {
            $unwind: "$attendanceRecords",
        },
        {
            $group: {
                _id: {
                    date: { $dateToString: { format: "%Y-%m-%d", date: "$attendanceDate" } },
                    status: "$attendanceRecords.status",
                },
                count: { $sum: 1 },
            },
        },
        {
            $sort: { "_id.date": 1 },
        },
    ])

    // Transform for graph data
    const graphData: Record<string, { date: string; present: number; absent: number; late: number; excused: number }> = {}

    dailyAttendance.forEach((item) => {
        const date = item._id.date
        const status = item._id.status
        if (!graphData[date]) {
            graphData[date] = { date, present: 0, absent: 0, late: 0, excused: 0 }
        }
        if (status === 'present') graphData[date].present = item.count
        else if (status === 'absent') graphData[date].absent = item.count
        else if (status === 'late') graphData[date].late = item.count
        else if (status === 'excused') graphData[date].excused = item.count
    })

    // Get summary statistics
    const summary = await Attendance.aggregate([
        {
            $match: matchQuery,
        },
        {
            $unwind: "$attendanceRecords",
        },
        {
            $group: {
                _id: "$attendanceRecords.status",
                total: { $sum: 1 },
            },
        },
    ])

    const summaryStats = {
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
    }

    summary.forEach((item) => {
        if (item._id in summaryStats) {
            summaryStats[item._id as keyof typeof summaryStats] = item.total
        }
    })

    const totalDays = await Attendance.countDocuments(matchQuery)

    return {
        graphData: Object.values(graphData),
        summary: summaryStats,
        totalDays,
        dateRange: { start: startDate, end: endDate },
    }
}

// Fees Report with daily/monthly breakdown
async function getFeesReport(
    schoolId: mongoose.Types.ObjectId | string,
    startDate: Date,
    endDate: Date,
    className: string | number | null,
    academicYear: string
) {
    const matchQuery: Record<string, unknown> = {
        schoolId: new mongoose.Types.ObjectId(schoolId as string),
        academicYear,
        "paymentHistory.paymentDate": {
            $gte: startDate,
            $lte: endDate,
        },
    }

    if (className) {
        matchQuery.className = className
    }

    // Get fees breakdown by date
    const feesByDate = await StudentFees.aggregate([
        {
            $match: matchQuery,
        },
        {
            $unwind: "$paymentHistory",
        },
        {
            $match: {
                "paymentHistory.paymentDate": {
                    $gte: startDate,
                    $lte: endDate,
                },
                "paymentHistory.status": "approved",
            },
        },
        {
            $group: {
                _id: {
                    date: { $dateToString: { format: "%Y-%m-%d", date: "$paymentHistory.paymentDate" } },
                },
                totalAmount: { $sum: "$paymentHistory.amount" },
                transactionCount: { $sum: 1 },
            },
        },
        {
            $sort: { "_id.date": 1 },
        },
    ])

    // Get fees breakdown by month
    const feesByMonth = await StudentFees.aggregate([
        {
            $match: matchQuery,
        },
        {
            $unwind: "$paymentHistory",
        },
        {
            $match: {
                "paymentHistory.status": "approved",
            },
        },
        {
            $group: {
                _id: {
                    month: "$paymentHistory.paymentMonth",
                    year: "$paymentHistory.paymentYear",
                },
                totalAmount: { $sum: "$paymentHistory.amount" },
                transactionCount: { $sum: 1 },
            },
        },
        {
            $sort: { "_id.year": 1, "_id.month": 1 },
        },
    ])

    // Get summary
    const summaryAggregation = await StudentFees.aggregate([
        {
            $match: matchQuery,
        },
        {
            $group: {
                _id: null,
                totalFees: { $sum: "$totalFees" },
                totalPaid: { $sum: "$paidAmount" },
                totalPending: { $sum: "$pendingAmount" },
                studentCount: { $sum: 1 },
            },
        },
    ])

    const summary = summaryAggregation[0] || {
        totalFees: 0,
        totalPaid: 0,
        totalPending: 0,
        studentCount: 0,
    }

    // Get collection by payment mode
    const byPaymentMode = await StudentFees.aggregate([
        {
            $match: matchQuery,
        },
        {
            $unwind: "$paymentHistory",
        },
        {
            $match: {
                "paymentHistory.status": "approved",
            },
        },
        {
            $group: {
                _id: "$paymentMode",
                totalAmount: { $sum: "$paymentHistory.amount" },
            },
        },
    ])

    const paymentModeBreakdown = byPaymentMode.reduce((acc, item) => {
        acc[item._id || "unknown"] = item.totalAmount
        return acc
    }, {} as Record<string, number>)

    return {
        graphData: feesByDate.map((item) => ({
            date: item._id.date,
            amount: item.totalAmount,
            transactions: item.transactionCount,
        })),
        monthlyData: feesByMonth.map((item) => ({
            month: item._id.month,
            year: item._id.year,
            amount: item.totalAmount,
            transactions: item.transactionCount,
        })),
        summary: {
            ...summary,
            collectionRate: summary.totalFees > 0 ? Math.round((summary.totalPaid / summary.totalFees) * 10000) / 100 : 0,
        },
        paymentModeBreakdown,
        dateRange: { start: startDate, end: endDate },
    }
}

// Students not attending report
async function getStudentsNotAttendingReport(
    schoolId: mongoose.Types.ObjectId | string,
    startDate: Date,
    endDate: Date,
    className: string | number | null,
    _academicYear: string
) {
    const studentQuery: Record<string, unknown> = { schoolId: new mongoose.Types.ObjectId(schoolId as string) }
    if (className) {
        studentQuery.currentClass = className
    }

    // Get all students
    const students = await Student.find(studentQuery).select("_id fullName currentClass").lean()

    // Get attendance records for the date range
    const attendanceRecords = await Attendance.aggregate([
        {
            $match: {
                schoolId: new mongoose.Types.ObjectId(schoolId as string),
                attendanceDate: {
                    $gte: startDate,
                    $lte: endDate,
                },
                ...(className ? { className } : {}),
            },
        },
        {
            $unwind: "$attendanceRecords",
        },
        {
            $match: {
                "attendanceRecords.status": { $in: ["absent", "late"] },
            },
        },
        {
            $group: {
                _id: "$attendanceRecords.studentId",
                absentDates: {
                    $push: {
                        date: "$attendanceDate",
                        status: "$attendanceRecords.status",
                    },
                },
                totalAbsent: {
                    $sum: { $cond: [{ $eq: ["$attendanceRecords.status", "absent"] }, 1, 0] },
                },
                totalLate: {
                    $sum: { $cond: [{ $eq: ["$attendanceRecords.status", "late"] }, 1, 0] },
                },
            },
        },
    ])

    // Create map of student IDs with absences
    const absentStudentMap = new Map<string, { absentDates: { date: Date; status: string }[]; totalAbsent: number; totalLate: number }>()
    attendanceRecords.forEach((record) => {
        absentStudentMap.set(record._id.toString(), {
            absentDates: record.absentDates,
            totalAbsent: record.totalAbsent,
            totalLate: record.totalLate,
        })
    })

    // Get students who were absent
    const studentsNotAttending = students
        .filter((student) => absentStudentMap.has(student._id.toString()))
        .map((student) => {
            const record = absentStudentMap.get(student._id.toString())!
            return {
                _id: student._id,
                fullName: student.fullName,
                currentClass: student.currentClass,
                absentDates: record.absentDates,
                totalAbsent: record.totalAbsent,
                totalLate: record.totalLate,
            }
        })
        .sort((a, b) => b.totalAbsent - a.totalAbsent)

    // Summary
    const summary = {
        totalStudents: students.length,
        studentsWithAbsences: studentsNotAttending.length,
        totalAbsenceDays: studentsNotAttending.reduce((sum, s) => sum + s.totalAbsent, 0),
        totalLateDays: studentsNotAttending.reduce((sum, s) => sum + s.totalLate, 0),
    }

    return {
        students: studentsNotAttending,
        summary,
        dateRange: { start: startDate, end: endDate },
    }
}
