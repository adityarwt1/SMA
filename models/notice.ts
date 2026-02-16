import mongoose, { Document, Schema } from "mongoose"

export interface NoticeAttachment {
    fileName: string
    fileUrl: string
    fileType: string
    fileSize: number
}

export interface NoticeDocumentInterface extends Document {
    schoolId: mongoose.Types.ObjectId
    postedBy: mongoose.Types.ObjectId
    postedByRole: "principal" | "teacher"
    topic: string
    description: string
    image?: string
    attachments?: NoticeAttachment[]
    targetAudience: "school" | "students"
    targetClass?: string | number
    isActive: boolean
}

const NoticeAttachmentSchema: Schema<NoticeAttachment> = new Schema({
    fileName: { type: String, required: true },
    fileUrl: { type: String, required: true },
    fileType: { type: String, required: true },
    fileSize: { type: Number, required: true },
}, { _id: false })

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
    attachments: {
        type: [NoticeAttachmentSchema],
        default: [],
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

NoticeSchema.index({ schoolId: 1, createdAt: -1 })
NoticeSchema.index({ schoolId: 1, targetAudience: 1, targetClass: 1 })

const Notice = mongoose.models.Notice || mongoose.model<NoticeDocumentInterface>("Notice", NoticeSchema)

export default Notice
