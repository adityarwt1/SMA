import mongoose, { Document, Schema } from "mongoose"

export interface StudentAttendanceDocumentInterface extends Document {
    studentId: mongoose.Types.ObjectId
    schoolId: mongoose.Types.ObjectId
    className: string | number
    currentStreak: number
    longestStreak: number
    lastAttendanceDate: Date | null
    totalPresent: number
    totalAbsent: number
    totalLate: number
    totalExcused: number
    monthlyAttendance: {
        year: number
        month: number
        present: number
        absent: number
        late: number
        excused: number
        dates: { date: Date; status: string }[]
    }[]
    yearlyAttendance: {
        year: number
        present: number
        absent: number
        late: number
        excused: number
        days: { date: Date; status: string }[]
    }[]
}

const MonthlyAttendanceSchema = new Schema({
    year: { type: Number, required: true },
    month: { type: Number, required: true },
    present: { type: Number, default: 0 },
    absent: { type: Number, default: 0 },
    late: { type: Number, default: 0 },
    excused: { type: Number, default: 0 },
    dates: [{
        date: { type: Date, required: true },
        status: { type: String, enum: ["present", "absent", "late", "excused"], required: true }
    }]
}, { _id: false })

const YearlyAttendanceSchema = new Schema({
    year: { type: Number, required: true },
    present: { type: Number, default: 0 },
    absent: { type: Number, default: 0 },
    late: { type: Number, default: 0 },
    excused: { type: Number, default: 0 },
    days: [{
        date: { type: Date, required: true },
        status: { type: String, enum: ["present", "absent", "late", "excused"], required: true }
    }]
}, { _id: false })

const StudentAttendanceSchema: Schema<StudentAttendanceDocumentInterface> = new Schema({
    studentId: {
        type: Schema.Types.ObjectId,
        ref: "Student",
        required: true,
    },
    schoolId: {
        type: Schema.Types.ObjectId,
        ref: "School",
        required: true,
    },
    className: {
        type: Schema.Types.Mixed,
        required: true,
    },
    currentStreak: {
        type: Number,
        default: 0,
    },
    longestStreak: {
        type: Number,
        default: 0,
    },
    lastAttendanceDate: {
        type: Date,
        default: null,
    },
    totalPresent: {
        type: Number,
        default: 0,
    },
    totalAbsent: {
        type: Number,
        default: 0,
    },
    totalLate: {
        type: Number,
        default: 0,
    },
    totalExcused: {
        type: Number,
        default: 0,
    },
    monthlyAttendance: [MonthlyAttendanceSchema],
    yearlyAttendance: [YearlyAttendanceSchema],
}, {
    timestamps: true,
})

StudentAttendanceSchema.index({ studentId: 1, className: 1 }, { unique: true })
StudentAttendanceSchema.index({ studentId: 1, schoolId: 1 })

const StudentAttendance = mongoose.models.StudentAttendance || mongoose.model<StudentAttendanceDocumentInterface>("StudentAttendance", StudentAttendanceSchema)

export default StudentAttendance
