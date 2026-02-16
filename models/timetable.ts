import mongoose, { Document, Schema } from "mongoose"

interface PeriodInterface {
    periodNumber: number
    subject: string
    teacherId: mongoose.Types.ObjectId
    startTime: string
    endTime: string
}

interface DayScheduleInterface {
    day: "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday"
    periods: PeriodInterface[]
}

interface TimetableDocumentInterface extends Document {
    schoolId: mongoose.Types.ObjectId
    classId: string | number
    academicYear: string
    schedule: DayScheduleInterface[]
    createdBy: mongoose.Types.ObjectId
    isActive: boolean
}

const PeriodSchema = new Schema<PeriodInterface>({
    periodNumber: {
        type: Number,
        required: true,
        min: 1,
    },
    subject: {
        type: String,
        required: true,
        trim: true,
    },
    teacherId: {
        type: Schema.Types.ObjectId,
        ref: "Teacher",
        required: true,
    },
    startTime: {
        type: String,
        required: true,
    },
    endTime: {
        type: String,
        required: true,
    },
}, { _id: false })

const DayScheduleSchema = new Schema<DayScheduleInterface>({
    day: {
        type: String,
        enum: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"],
        required: true,
    },
    periods: {
        type: [PeriodSchema],
        required: true,
        default: [],
    },
}, { _id: false })

const TimetableSchema: Schema<TimetableDocumentInterface> = new Schema({
    schoolId: {
        type: Schema.Types.ObjectId,
        ref: "School",
        required: true,
    },
    classId: {
        type: Schema.Types.Mixed,
        required: true,
    },
    academicYear: {
        type: String,
        required: true,
    },
    schedule: {
        type: [DayScheduleSchema],
        required: true,
        default: [],
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        required: true,
    },
    isActive: {
        type: Boolean,
        required: true,
        default: true,
    },
}, {
    timestamps: true,
})

const Timetable = mongoose.models.Timetable || mongoose.model<TimetableDocumentInterface>("Timetable", TimetableSchema)

export default Timetable