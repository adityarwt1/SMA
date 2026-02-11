import mongoose from "mongoose"

export interface PrincipalDocumentInteface  {
    fullName:string,
    contactNumber:number,
    email:string,
    password:string
    dp:string,
    schoolId:string |mongoose.Types.ObjectId
}
