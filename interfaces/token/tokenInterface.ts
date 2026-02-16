import { Role } from "@/types/role/roles";
import mongoose from "mongoose";

export interface TokenInterface {
    _id:string | mongoose.Types.ObjectId,
    schoolId:string |mongoose.Types.ObjectId,
    role:Role,
    currentClass?:string | number,
    iat?:number,
    exp?:number
}