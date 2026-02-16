import mongoose, { Document, Schema } from "mongoose"

interface BookIssueInterface {
    bookId: mongoose.Types.ObjectId
    studentId: mongoose.Types.ObjectId
    issueDate: Date
    dueDate: Date
    returnDate?: Date
    status: "issued" | "returned" | "overdue"
}

interface LibraryDocumentInterface extends Document {
    schoolId: mongoose.Types.ObjectId
    bookId: string
    title: string
    author: string
    category: string
    publisher?: string
    isbn?: string
    quantity: number
    availableQuantity: number
    shelfLocation?: string
    isActive: boolean
    issues: BookIssueInterface[]
}

const BookIssueSchema = new Schema<BookIssueInterface>({
    bookId: {
        type: Schema.Types.ObjectId,
        ref: "Library",
        required: true,
    },
    studentId: {
        type: Schema.Types.ObjectId,
        ref: "Student",
        required: true,
    },
    issueDate: {
        type: Date,
        required: true,
        default: Date.now,
    },
    dueDate: {
        type: Date,
        required: true,
    },
    returnDate: {
        type: Date,
        required: false,
    },
    status: {
        type: String,
        enum: ["issued", "returned", "overdue"],
        required: true,
        default: "issued",
    },
}, { _id: false })

const LibrarySchema: Schema<LibraryDocumentInterface> = new Schema({
    schoolId: {
        type: Schema.Types.ObjectId,
        ref: "School",
        required: true,
    },
    bookId: {
        type: String,
        required: true,
        unique: true,
    },
    title: {
        type: String,
        required: true,
        trim: true,
    },
    author: {
        type: String,
        required: true,
        trim: true,
    },
    category: {
        type: String,
        required: true,
    },
    publisher: {
        type: String,
        required: false,
    },
    isbn: {
        type: String,
        required: false,
    },
    quantity: {
        type: Number,
        required: true,
        min: 0,
    },
    availableQuantity: {
        type: Number,
        required: true,
        min: 0,
    },
    shelfLocation: {
        type: String,
        required: false,
    },
    isActive: {
        type: Boolean,
        required: true,
        default: true,
    },
    issues: {
        type: [BookIssueSchema],
        required: true,
        default: [],
    },
}, {
    timestamps: true,
})

const Library = mongoose.models.Library || mongoose.model<LibraryDocumentInterface>("Library", LibrarySchema)

export default Library