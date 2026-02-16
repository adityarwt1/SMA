import mongoose from "mongoose";
import { TokenInterface } from "@/interfaces/token/tokenInterface";
import { mongodbConnect } from "@/lib/dataBase/mongoDb";
import Attendance from "@/models/attendance";
import Student from "@/models/student";
import StudentAttendance from "@/models/studentAttendance";
import Teacher from "@/models/techer";
import { BadRequest, conflict, forBidden, InternalServerIssue, notFound, roleCheck, Unauthorized, VerifyToken } from "@/utils/apiResponses/commonResponses";
import { HttpStatusCode } from "@/utils/apiResponses/httpsStatusAndCode";
import { GetAttendanceQuerySchema, TakeAttendanceSchema, StudentStreakQuerySchema } from "@/validations/requestBody/attendanceValidation";
import { NextRequest, NextResponse } from "next/server";

function getDateOnly(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}

function isConsecutiveDay(lastDate: Date | null, currentDate: Date): boolean {
    if (!lastDate) return true;
    const last = getDateOnly(lastDate);
    const current = getDateOnly(currentDate);
    const diffTime = current.getTime() - last.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays === 1;
}

async function updateStudentStreak(
    studentId: mongoose.Types.ObjectId,
    schoolId: mongoose.Types.ObjectId,
    className: string | number,
    status: string,
    attendanceDate: Date
) {
    const dateOnly = getDateOnly(attendanceDate);
    const year = dateOnly.getFullYear();
    const month = dateOnly.getMonth() + 1;

    let studentAttendance = await StudentAttendance.findOne({ studentId, className }).lean();

    const updateStreak = () => {
        if (!studentAttendance) {
            const isConsecutive = isConsecutiveDay(null, dateOnly);
            const newStreak: any = {
                currentStreak: status === "present" ? 1 : 0,
                longestStreak: status === "present" ? 1 : 0,
                lastAttendanceDate: status === "present" ? dateOnly : null,
                totalPresent: status === "present" ? 1 : 0,
                totalAbsent: status === "absent" ? 1 : 0,
                totalLate: status === "late" ? 1 : 0,
                totalExcused: status === "excused" ? 1 : 0,
                monthlyAttendance: [{
                    year,
                    month,
                    present: status === "present" ? 1 : 0,
                    absent: status === "absent" ? 1 : 0,
                    late: status === "late" ? 1 : 0,
                    excused: status === "excused" ? 1 : 0,
                    dates: [{ date: dateOnly, status }]
                }],
                yearlyAttendance: [{
                    year,
                    present: status === "present" ? 1 : 0,
                    absent: status === "absent" ? 1 : 0,
                    late: status === "late" ? 1 : 0,
                    excused: status === "excused" ? 1 : 0,
                    days: [{ date: dateOnly, status }]
                }]
            };
            return newStreak;
        }

        const isConsecutive = isConsecutiveDay(studentAttendance.lastAttendanceDate, dateOnly);
        let currentStreak = studentAttendance.currentStreak;
        let longestStreak = studentAttendance.longestStreak;

        if (status === "present") {
            if (isConsecutive) {
                currentStreak += 1;
            } else {
                currentStreak = 1;
            }
            if (currentStreak > longestStreak) {
                longestStreak = currentStreak;
            }
        } else {
            currentStreak = 0;
        }

        const totalPresent = (studentAttendance.totalPresent || 0) + (status === "present" ? 1 : 0);
        const totalAbsent = (studentAttendance.totalAbsent || 0) + (status === "absent" ? 1 : 0);
        const totalLate = (studentAttendance.totalLate || 0) + (status === "late" ? 1 : 0);
        const totalExcused = (studentAttendance.totalExcused || 0) + (status === "excused" ? 1 : 0);

        let monthlyAttendance = studentAttendance.monthlyAttendance || [];
        let yearlyAttendance = studentAttendance.yearlyAttendance || [];

        const monthIndex = monthlyAttendance.findIndex((m: any) => m.year === year && m.month === month);
        if (monthIndex >= 0) {
            monthlyAttendance[monthIndex].present += status === "present" ? 1 : 0;
            monthlyAttendance[monthIndex].absent += status === "absent" ? 1 : 0;
            monthlyAttendance[monthIndex].late += status === "late" ? 1 : 0;
            monthlyAttendance[monthIndex].excused += status === "excused" ? 1 : 0;
            monthlyAttendance[monthIndex].dates.push({ date: dateOnly, status });
        } else {
            monthlyAttendance.push({
                year,
                month,
                present: status === "present" ? 1 : 0,
                absent: status === "absent" ? 1 : 0,
                late: status === "late" ? 1 : 0,
                excused: status === "excused" ? 1 : 0,
                dates: [{ date: dateOnly, status }]
            });
        }

        const yearIndex = yearlyAttendance.findIndex((y: any) => y.year === year);
        if (yearIndex >= 0) {
            yearlyAttendance[yearIndex].present += status === "present" ? 1 : 0;
            yearlyAttendance[yearIndex].absent += status === "absent" ? 1 : 0;
            yearlyAttendance[yearIndex].late += status === "late" ? 1 : 0;
            yearlyAttendance[yearIndex].excused += status === "excused" ? 1 : 0;
            yearlyAttendance[yearIndex].days.push({ date: dateOnly, status });
        } else {
            yearlyAttendance.push({
                year,
                present: status === "present" ? 1 : 0,
                absent: status === "absent" ? 1 : 0,
                late: status === "late" ? 1 : 0,
                excused: status === "excused" ? 1 : 0,
                days: [{ date: dateOnly, status }]
            });
        }

        return {
            currentStreak,
            longestStreak,
            lastAttendanceDate: status === "present" ? dateOnly : studentAttendance.lastAttendanceDate,
            totalPresent,
            totalAbsent,
            totalLate,
            totalExcused,
            monthlyAttendance,
            yearlyAttendance
        };
    };

    const streakData = updateStreak();

    await StudentAttendance.findOneAndUpdate(
        { studentId, className },
        { ...streakData, schoolId, studentId },
        { upsert: true, new: true }
    );
}

export async function POST(req: NextRequest): Promise<NextResponse> {
    try {
        const apiAuthentication = await VerifyToken(req);
        if (!apiAuthentication.isVerified || !apiAuthentication.user) {
            return Unauthorized();
        }

        const isValidRole = await roleCheck(apiAuthentication.user, "teacher");
        if (!isValidRole) {
            return forBidden("Only teachers can take attendance!");
        }

        const body = await req.json();
        const isValidBody = TakeAttendanceSchema.safeParse(body);
        if (!isValidBody.success) {
            return BadRequest(isValidBody.error.message || "Invalid request body");
        }

        const isConnected = await mongodbConnect();
        if (!isConnected) {
            return InternalServerIssue(new Error("Failed to connect database!"));
        }

        const teacher = await Teacher.findById(apiAuthentication.user._id).lean();
        if (!teacher) {
            return notFound("Teacher not found!");
        }

        if (!teacher.classTeacherOf) {
            return forBidden("You are not a class teacher of any class!");
        }

        const className = body.className;
        if (teacher.classTeacherOf !== className) {
            return forBidden("You can only take attendance for your class!");
        }

        const attendanceDate = body.attendanceDate ? new Date(body.attendanceDate) : new Date();
        const dateOnly = getDateOnly(attendanceDate);

        const existingAttendance = await Attendance.findOne({
            schoolId: apiAuthentication.user.schoolId,
            className,
            attendanceDate: dateOnly
        }).lean();

        if (existingAttendance) {
            return conflict("Attendance for this date already exists! Use PUT to update.");
        }

        const studentIds = body.records.map((r: any) => new mongoose.Types.ObjectId(r.studentId));
        const students = await Student.find({
            _id: { $in: studentIds },
            schoolId: apiAuthentication.user.schoolId,
            currentClass: className
        }).select("_id fullName").lean();

        if (students.length !== studentIds.length) {
            return BadRequest("Some student IDs are invalid or not in this class!");
        }

        const attendanceRecords = body.records.map((record: any) => ({
            studentId: new mongoose.Types.ObjectId(record.studentId),
            status: record.status,
            date: dateOnly
        }));

        const attendance = await Attendance.create({
            schoolId: apiAuthentication.user.schoolId,
            className,
            attendanceDate: dateOnly,
            attendanceRecords,
            attendanceTakenBy: apiAuthentication.user._id
        });

        if (!attendance) {
            return InternalServerIssue(new Error("Failed to create attendance!"));
        }

        for (const record of attendanceRecords) {
            await updateStudentStreak(
                record.studentId,
                new mongoose.Types.ObjectId(apiAuthentication.user.schoolId as string),
                className,
                record.status,
                dateOnly
            );
        }

        return NextResponse.json({
            success: true,
            status: HttpStatusCode.CREATED,
            message: "Attendance taken successfully!",
            data: attendance
        }, { status: HttpStatusCode.CREATED });

    } catch (error) {
        console.log(error);
        return InternalServerIssue(error);
    }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
    try {
        const apiAuthentication = await VerifyToken(req);
        if (!apiAuthentication.isVerified || !apiAuthentication.user) {
            return Unauthorized();
        }

        const { searchParams } = new URL(req.url);
        const className = searchParams.get("className");
        const studentId = searchParams.get("studentId");
        const year = searchParams.get("year");
        const month = searchParams.get("month");

        const isConnected = await mongodbConnect();
        if (!isConnected) {
            return InternalServerIssue(new Error("Failed to connect database!"));
        }

        if (studentId) {
            const isValidQuery = StudentStreakQuerySchema.safeParse({ studentId, year });
            if (!isValidQuery.success) {
                return BadRequest(isValidQuery.error.message);
            }

            const query: any = { studentId: new mongoose.Types.ObjectId(studentId) };
            
            if (year) {
                const yearNum = parseInt(year as string);
                query["yearlyAttendance"] = { $elemMatch: { year: yearNum } };
            }

            const studentAttendance = await StudentAttendance.findOne(query).lean();

            if (!studentAttendance) {
                return notFound("No attendance records found for this student!");
            }

            let yearlyData: any[] = studentAttendance.yearlyAttendance || [];
            if (year) {
                yearlyData = yearlyData.filter((y: any) => y.year === parseInt(year as string));
            }

            return NextResponse.json({
                success: true,
                status: HttpStatusCode.OK,
                data: {
                    studentId: studentAttendance.studentId,
                    className: studentAttendance.className,
                    currentStreak: studentAttendance.currentStreak,
                    longestStreak: studentAttendance.longestStreak,
                    lastAttendanceDate: studentAttendance.lastAttendanceDate,
                    totalPresent: studentAttendance.totalPresent,
                    totalAbsent: studentAttendance.totalAbsent,
                    totalLate: studentAttendance.totalLate,
                    totalExcused: studentAttendance.totalExcused,
                    yearlyAttendance: yearlyData,
                    monthlyAttendance: month && year 
                        ? studentAttendance.monthlyAttendance?.filter((m: any) => m.year === parseInt(year as string) && m.month === parseInt(month as string))
                        : studentAttendance.monthlyAttendance
                }
            });
        }

        if (!className) {
            return BadRequest("Class name is required!");
        }

        const isValidQuery = GetAttendanceQuerySchema.safeParse({ className });
        if (!isValidQuery.success) {
            return BadRequest(isValidQuery.error.message);
        }

        const query: any = {
            schoolId: apiAuthentication.user.schoolId,
            className
        };

        const attendance = await Attendance.find(query)
            .populate("attendanceRecords.studentId", "fullName")
            .sort({ attendanceDate: -1 })
            .lean();

        return NextResponse.json({
            success: true,
            status: HttpStatusCode.OK,
            data: attendance
        });

    } catch (error) {
        console.log(error);
        return InternalServerIssue(error);
    }
}

export async function PUT(req: NextRequest): Promise<NextResponse> {
    try {
        const apiAuthentication = await VerifyToken(req);
        if (!apiAuthentication.isVerified || !apiAuthentication.user) {
            return Unauthorized();
        }

        const isValidRole = await roleCheck(apiAuthentication.user, "teacher");
        if (!isValidRole) {
            return forBidden("Only teachers can update attendance!");
        }

        const body = await req.json();
        const { className, attendanceDate, records } = body;

        if (!className || !attendanceDate || !records || !Array.isArray(records)) {
            return BadRequest("Invalid request body! Required: className, attendanceDate, records");
        }

        const isConnected = await mongodbConnect();
        if (!isConnected) {
            return InternalServerIssue(new Error("Failed to connect database!"));
        }

        const teacher = await Teacher.findById(apiAuthentication.user._id).lean();
        if (!teacher || teacher.classTeacherOf !== className) {
            return forBidden("You can only update attendance for your class!");
        }

        const dateOnly = getDateOnly(new Date(attendanceDate));

        const existingAttendance = await Attendance.findOne({
            schoolId: apiAuthentication.user.schoolId,
            className,
            attendanceDate: dateOnly
        });

        if (!existingAttendance) {
            return notFound("Attendance record not found for this date!");
        }

        const updatedRecords = records.map((record: any) => ({
            studentId: new mongoose.Types.ObjectId(record.studentId),
            status: record.status,
            date: dateOnly
        }));

        existingAttendance.attendanceRecords = updatedRecords;
        await existingAttendance.save();

        for (const record of updatedRecords) {
            await updateStudentStreak(
                record.studentId,
                new mongoose.Types.ObjectId(apiAuthentication.user.schoolId as string),
                className,
                record.status,
                dateOnly
            );
        }

        return NextResponse.json({
            success: true,
            status: HttpStatusCode.OK,
            message: "Attendance updated successfully!",
            data: existingAttendance
        });

    } catch (error) {
        console.log(error);
        return InternalServerIssue(error);
    }
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
    try {
        const apiAuthentication = await VerifyToken(req);
        if (!apiAuthentication.isVerified || !apiAuthentication.user) {
            return Unauthorized();
        }

        const isValidRole = await roleCheck(apiAuthentication.user, "teacher");
        if (!isValidRole) {
            return forBidden("Only teachers can delete attendance!");
        }

        const { searchParams } = new URL(req.url);
        const className = searchParams.get("className");
        const attendanceDate = searchParams.get("date");

        if (!className || !attendanceDate) {
            return BadRequest("Class name and date are required!");
        }

        const isConnected = await mongodbConnect();
        if (!isConnected) {
            return InternalServerIssue(new Error("Failed to connect database!"));
        }

        const teacher = await Teacher.findById(apiAuthentication.user._id).lean();
        if (!teacher || teacher.classTeacherOf !== className) {
            return forBidden("You can only delete attendance for your class!");
        }

        const dateOnly = getDateOnly(new Date(attendanceDate));

        const deletedAttendance = await Attendance.findOneAndDelete({
            schoolId: apiAuthentication.user.schoolId,
            className,
            attendanceDate: dateOnly
        });

        if (!deletedAttendance) {
            return notFound("Attendance record not found!");
        }

        return NextResponse.json({
            success: true,
            status: HttpStatusCode.OK,
            message: "Attendance deleted successfully!"
        });

    } catch (error) {
        console.log(error);
        return InternalServerIssue(error);
    }
}
