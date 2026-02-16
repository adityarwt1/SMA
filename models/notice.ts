import mongoose, { Document, Schema } from "mongoose"

interface NoticeDocumentInterface extends Document {
    schoolId: mongoose.Types.ObjectId
    postedBy: mongoose.Types.ObjectId
    postedByRole: "principal" | "teacher"
    topic: string
    description: string
    image?: string
    targetAudience: "school" | "students"
    targetClass?: string | number
    isActive: boolean
}

const NoticeSchema: Schema<NoticeDocumentInterface> = new Schema({
    schoolId: {
        type: Schema.Types.ObjectId,
        ref: "School",
        required: true,
    },
    postedBy: {
        type: Schema.Types.ObjectId,
        required: true,
    },
    postedByRole: {
        type: String,
        enum: ["principal", "teacher"],
        required: true,
    },
    topic: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        required: true,
    },
    image: {
        type: String,
        required: false,
    },
    targetAudience: {
        type: String,
        enum: ["school", "students"],
        required: true,
        default: "school",
    },
    targetClass: {
        type: Schema.Types.Mixed,
        required: false,
    },
    isActive: {
        type: Boolean,
        required: true,
        default: true,
    },
}, {
    timestamps: true,
})

const Notice = mongoose.models.Notice || mongoose.model<NoticeDocumentInterface>("Notice", NoticeSchema)

export default Notice