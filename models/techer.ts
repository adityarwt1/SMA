import mongoose, { Document, Schema } from 'mongoose'
interface SubjectInterface extends Document {
    subjectName:string,
    teacherId:mongoose.Types.ObjectId,
}

interface TeacherDocumentInterface extends Document {
    schoolId:mongoose.Types.ObjectId,
    fullName:string,
    email:string,
    password:string,
    dp:string,
    diseCode:number,
    address:string,
    subjects:SubjectInterface[],
    contactNumber:number
    bcCode:string
    isGuest:boolean
}

const SubjectSchema:Schema<SubjectInterface> = new Schema({
    subjectName:{
        type:String
    },
    teacherId:{
        type:Schema.Types.ObjectId,
        required:true
    }
})
const TeacherSchema:Schema<TeacherDocumentInterface> = new Schema({
    schoolId:{
        type:Schema.Types.ObjectId,
        required:true
    },
    fullName:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true
    },
    password:{
        type:String,
        required:true
    },
    dp:{
        type:String,
        required:false
    },
    diseCode:{
        type:Number,
        required:true
    },
    address:{
        type:String,
        required:true
    },
    bcCode:{
        type:String,
        required:true
    },
    subjects:[SubjectSchema],
    contactNumber:{
        type:Number,
        required:true
    },
    isGuest:{
        type:Boolean,
        required:true
    }
},{
    timestamps:true
})

const Teacher = mongoose.models.Teacher || mongoose.model<TeacherDocumentInterface>("Teacher", TeacherSchema)
export default Teacher