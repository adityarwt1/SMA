import mongoose, { Document, Schema } from "mongoose"

interface SubmissionInterface {
    studentId: mongoose.Types.ObjectId
    submittedAt: Date
    submissionText?: string
    attachmentUrl?: string
    grade?: number
    feedback?: string
    gradedBy?: mongoose.Types.ObjectId
    gradedAt?: Date
}

interface AssignmentDocumentInterface extends Document {
    schoolId: mongoose.Types.ObjectId
    classId: string | number
    subject: string
    title: string
    description: string
    attachmentUrl?: string
    dueDate: Date
    createdBy: mongoose.Types.ObjectId
    createdByRole: "principal" | "teacher"
    isActive: boolean
    submissions: SubmissionInterface[]
}

const SubmissionSchema = new Schema<SubmissionInterface>({
    studentId: {
        type: Schema.Types.ObjectId,
        ref: "Student",
        required: true,
    },
    submittedAt: {
        type: Date,
        required: true,
        default: Date.now,
    },
    submissionText: {
        type: String,
        required: false,
    },
    attachmentUrl: {
        type: String,
        required: false,
    },
    grade: {
        type: Number,
        required: false,
        min: 0,
        max: 100,
    },
    feedback: {
        type: String,
        required: false,
    },
    gradedBy: {
        type: Schema.Types.ObjectId,
        ref: "Teacher",
        required: false,
    },
    gradedAt: {
        type: Date,
        required: false,
    },
}, { _id: false })

const AssignmentSchema: Schema<AssignmentDocumentInterface> = new Schema({
    schoolId: {
        type: Schema.Types.ObjectId,
        ref: "School",
        required: true,
    },
    classId: {
        type: Schema.Types.Mixed,
        required: true,
    },
    subject: {
        type: String,
        required: true,
        trim: true,
    },
    title: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        required: true,
    },
    attachmentUrl: {
        type: String,
        required: false,
    },
    dueDate: {
        type: Date,
        required: true,
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        required: true,
    },
    createdByRole: {
        type: String,
        enum: ["principal", "teacher"],
        required: true,
    },
    isActive: {
        type: Boolean,
        required: true,
        default: true,
    },
    submissions: {
        type: [SubmissionSchema],
        required: true,
        default: [],
    },
}, {
    timestamps: true,
})

const Assignment = mongoose.models.Assignment || mongoose.model<AssignmentDocumentInterface>("Assignment", AssignmentSchema)

export default Assignment