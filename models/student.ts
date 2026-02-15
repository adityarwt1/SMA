import mongoose, { Document, Schema } from "mongoose"

/* =========================
   Interfaces
========================= */

interface DocumentsInterface {
  aadharNumber: number
  pan: string
  ssmId:number
}

export interface StudentDocumentInterface extends Document {
  schoolId: mongoose.Types.ObjectId
  attendanceId: mongoose.Types.ObjectId
  fullName: string
  contactNumber: number[]
  fatherName: string
  motherName: string
  documents: DocumentsInterface
  dp: string
  address: string
  state: string
  pinCode: number,
  diseCode:number,
  email:string
  currentClass:string | number
}

/* =========================
   Sub Schema: Documents
========================= */

const DocumentSchema: Schema<DocumentsInterface> = new Schema(
  {
    aadharNumber: {
      type: Number,
      required: true,
      min: 100000000000,
      max: 999999999999,
    },
    pan: {
      type: String,
      required: true,
      uppercase: true,
      match: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
    },
    ssmId:{
      type:Number,
      required:true,
    }
  },
  { _id: false }
)

/* =========================
   Main Schema: Student
========================= */

const StudentSchema: Schema<StudentDocumentInterface> = new Schema(
  {
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: "School",
      required: true,
    },
    attendanceId: {
      type: Schema.Types.ObjectId,
      ref: "Attendance",
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    contactNumber: [
      {
        type: Number,
        required: true,
        min: 1000000000,
        max: 9999999999,
      },
    ],
    fatherName: {
      type: String,
      required: true,
      trim: true,
    },
    motherName: {
      type: String,
      required: true,
      trim: true,
    },
    documents: {
      type: DocumentSchema,
      required: true,
    },
    dp: {
      type: String,
      default: "",
    },
    address: {
      type: String,
      required: true,
    },
    state: {
      type: String,
      required: true,
    },
    pinCode: {
      type: Number,
      required: true,
      min: 100000,
      max: 999999,
    },
    diseCode:{
        type:Number,
        required:true
    },
    email:{
      type:String,
      required:true
    },
    currentClass:{
      type: Number || String , 
      required:true
    }
  },
  {
    timestamps: true,
  }
)

/* =========================
   Model Export
========================= */

const Student =
  mongoose.models.Student ||
  mongoose.model<StudentDocumentInterface>("Student", StudentSchema)

export default Student
