import mongoose, { Document, Schema } from "mongoose"

export interface PaymentRecord {
    _id?: mongoose.Types.ObjectId
    amount: number
    paymentMonth: number
    paymentYear: number
    paymentDate: Date
    paymentProof: string
    paymentProofPublicId?: string
    transactionId?: string
    status: "pending" | "approved" | "rejected"
    approvedBy?: mongoose.Types.ObjectId
    approvedAt?: Date
    rejectionReason?: string
}

export interface StudentFeesDocumentInterface extends Document {
    schoolId: mongoose.Types.ObjectId
    studentId: mongoose.Types.ObjectId
    academicYear: string
    className: string | number
    feesSchemeId: mongoose.Types.ObjectId
    totalFees: number
    paidAmount: number
    pendingAmount: number
    paymentHistory: PaymentRecord[]
    paymentMode: "cash" | "online" | "cheque" | "upi"
    remarks?: string
    createdAt: Date
    updatedAt: Date
}

const PaymentRecordSchema: Schema<PaymentRecord> = new Schema({
    amount: {
        type: Number,
        required: true,
        min: 0,
    },
    paymentMonth: {
        type: Number,
        required: true,
        min: 1,
        max: 12,
    },
    paymentYear: {
        type: Number,
        required: true,
    },
    paymentDate: {
        type: Date,
        required: true,
        default: Date.now,
    },
    paymentProof: {
        type: String,
        required: true,
    },
    paymentProofPublicId: {
        type: String,
    },
    transactionId: {
        type: String,
    },
    status: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending",
    },
    approvedBy: {
        type: Schema.Types.ObjectId,
        ref: "Teacher",
    },
    approvedAt: {
        type: Date,
    },
    rejectionReason: {
        type: String,
    },
}, { _id: true })

const StudentFeesSchema: Schema<StudentFeesDocumentInterface> = new Schema({
    schoolId: {
        type: Schema.Types.ObjectId,
        ref: "School",
        required: true,
    },
    studentId: {
        type: Schema.Types.ObjectId,
        ref: "Student",
        required: true,
    },
    academicYear: {
        type: String,
        required: true,
    },
    className: {
        type: Schema.Types.Mixed,
        required: true,
    },
    feesSchemeId: {
        type: Schema.Types.ObjectId,
        ref: "FeesScheme",
        required: true,
    },
    totalFees: {
        type: Number,
        required: true,
        min: 0,
    },
    paidAmount: {
        type: Number,
        default: 0,
        min: 0,
    },
    pendingAmount: {
        type: Number,
        required: true,
        min: 0,
    },
    paymentHistory: [PaymentRecordSchema],
    paymentMode: {
        type: String,
        enum: ["cash", "online", "cheque", "upi"],
        default: "cash",
    },
    remarks: {
        type: String,
    },
}, {
    timestamps: true,
})

StudentFeesSchema.index({ schoolId: 1, studentId: 1, academicYear: 1 }, { unique: true })
StudentFeesSchema.index({ "paymentHistory.status": 1 })

const StudentFees = mongoose.models.StudentFees || mongoose.model<StudentFeesDocumentInterface>("StudentFees", StudentFeesSchema)

export default StudentFees
