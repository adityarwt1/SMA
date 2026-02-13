import mongoose, { Document, Schema } from "mongoose";

interface SchoolDocumentInterface extends Document {
    principleId:mongoose.Types.ObjectId,
    schoolName:string
    diseCode:number,
    address:string,
    pinCode:number,
    dist:string,
    state:string,
    from:string | number,
    to: number | string,
    logo:string,
    isGovt:boolean
}

const SchoolSchema:Schema<SchoolDocumentInterface>  = new Schema({
    principleId:{
        type:Schema.Types.ObjectId,
        required:true,
    },
    schoolName:{
        required:true,
        type:String,

    },
    diseCode:{
        type:Number,
        required:true,
    },
    address:{
        type:String,
        required:true,
    },
    pinCode:{
        type:Number,
        required:true,
    },
    dist:{
        type:String,
        required:true
    },
    state:{
        type:String,
        required:true,
    },
    from:{
        type:String || Number,
        required:true,
    },
    to:{
        type:String || Number,
        required:true
    },
    logo:{
        type:String,
        required:false
    },
    isGovt:{
        type:Boolean,
        required:true
    }

},{
    timestamps:true
})

const School = mongoose.models.School || mongoose.model<SchoolDocumentInterface>("School", SchoolSchema)

export default School