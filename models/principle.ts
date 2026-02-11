import mongoose, { Document, Schema } from "mongoose";

interface PrincipalDocumentInteface extends Document {
    fullName:string,
    contactNumber:number,
    email:string,
    password:string
    dp:string,
    schoolId:mongoose.Types.ObjectId
}

const PrincipalSchema:Schema<PrincipalDocumentInteface> = new Schema({
    fullName:{
        type:String,
        required:true,
    },
    contactNumber:{
        type:Number,
        required:true,
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
    schoolId:{
        type:Schema.Types.ObjectId,
        required:false
    }
},{
    timestamps:true
})

const Principal = mongoose.models.Principal || mongoose.model<PrincipalDocumentInteface>("Principal", PrincipalSchema)
export default Principal