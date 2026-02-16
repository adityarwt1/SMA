import mongoose, { Document, Schema } from "mongoose"

export interface FeesStructure {
    feeType: string
    amount: number
    isOptional: boolean
}

export interface FeesSchemeDocumentInterface extends Document {
    schoolId: mongoose.Types.ObjectId
    className: string | number
    academicYear: string
    totalFees: number
    feesStructure: FeesStructure[]
    isActive: boolean
    createdBy: mongoose.Types.ObjectId
    createdByRole: "principal" | "teacher"
    updatedAt: Date
    createdAt: Date
}

const FeesStructureSchema: Schema<FeesStructure> = new Schema({
    feeType: {
        type: String,
        required: true,
    },
    amount: {
        type: Number,
        required: true,
        min: 0,
    },
    isOptional: {
        type: Boolean,
        default: false,
    },
}, { _id: false })

const FeesSchemeSchema: Schema<FeesSchemeDocumentInterface> = new Schema({
    schoolId: {
        type: Schema.Types.ObjectId,
        ref: "School",
        required: true,
    },
    className: {
        type: Schema.Types.Mixed,
        required: true,
    },
    academicYear: {
        type: String,
        required: true,
    },
    totalFees: {
        type: Number,
        required: true,
        min: 0,
    },
    feesStructure: [FeesStructureSchema],
    isActive: {
        type: Boolean,
        default: true,
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
}, {
    timestamps: true,
})

FeesSchemeSchema.index({ schoolId: 1, className: 1, academicYear: 1 }, { unique: true })

const FeesScheme = mongoose.models.FeesScheme || mongoose.model<FeesSchemeDocumentInterface>("FeesScheme", FeesSchemeSchema)

export default FeesScheme
