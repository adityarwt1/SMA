import mongoose, { Document, Schema } from "mongoose"

interface AttendanceRecord {
    studentId: mongoose.Types.ObjectId
    status: "present" | "absent" | "late" | "excused"
    date: Date
}

interface StreakData {
    currentStreak: number
    longestStreak: number
    lastAttendanceDate: Date | null
}

export interface AttendanceDocumentInterface extends Document {
    schoolId: mongoose.Types.ObjectId
    className: string | number
    attendanceDate: Date
    attendanceRecords: AttendanceRecord[]
    attendanceTakenBy: mongoose.Types.ObjectId
    createdAt: Date
    updatedAt: Date
}

const AttendanceRecordSchema: Schema<AttendanceRecord> = new Schema({
    studentId: {
        type: Schema.Types.ObjectId,
        ref: "Student",
        required: true,
    },
    status: {
        type: String,
        enum: ["present", "absent", "late", "excused"],
        required: true,
    },
    date: {
        type: Date,
        required: true,
        default: Date.now,
    },
}, { _id: false })

const AttendanceSchema: Schema<AttendanceDocumentInterface> = new Schema({
    schoolId: {
        type: Schema.Types.ObjectId,
        ref: "School",
        required: true,
    },
    className: {
        type: Schema.Types.Mixed,
        required: true,
    },
    attendanceDate: {
        type: Date,
        required: true,
        default: Date.now,
    },
    attendanceRecords: [AttendanceRecordSchema],
    attendanceTakenBy: {
        type: Schema.Types.ObjectId,
        ref: "Teacher",
        required: true,
    },
}, {
    timestamps: true,
})

AttendanceSchema.index({ schoolId: 1, className: 1, attendanceDate: 1 }, { unique: true })
AttendanceSchema.index({ "attendanceRecords.studentId": 1 })

const Attendance = mongoose.models.Attendance || mongoose.model<AttendanceDocumentInterface>("Attendance", AttendanceSchema)

export default Attendance
