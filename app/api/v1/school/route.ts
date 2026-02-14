import { StanderedResponse } from "@/interfaces/apiResponses/standardResponse";
import { mongodbConnect } from "@/lib/dataBase/mongoDb";
import School from "@/models/school";
import { BadRequest, conflict, forBidden, InternalServerIssue, roleCheck, Unauthorized, VerifyToken } from "@/utils/apiResponses/commonResponses";
import { HttpStatusCode } from "@/utils/apiResponses/httpsStatusAndCode";
import { schoolRegisterValidation } from "@/validations/requestBody/schollValidation";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req:NextRequest):Promise<NextResponse> {
    try {
        const apiAuthentication = await VerifyToken(req)

        if(!apiAuthentication.isVerified || !apiAuthentication.user?._id){
            return Unauthorized()
        }
        // role check
        const isValidRole = await roleCheck(apiAuthentication.user, "principal")
        if(!isValidRole){
            return forBidden("you are not a principal!")
        }
        // request body 
        const body = await req.json()
        // body validation 
        const isValidBody = schoolRegisterValidation.safeParse(body)

        if(!isValidBody.success){
            return BadRequest("please provide valid data for registeration!")
        }

        // databse connnection 
        const isConnected = await mongodbConnect()

        if(!isConnected){
            return InternalServerIssue(new Error("Failed to connect databse!"))
        }

        // find Existence school
        const isExist = await School.findOne({
            diseCode:body.diseCode
        }).lean().select("_id")

       if(isExist){
        return conflict("school already register with this diseCode!")
       }

       const newSchool = await School.create({...body, principleId:apiAuthentication.user._id})

       if(!newSchool){
        return InternalServerIssue(new Error("failedc to create new school!"))
       }

       return NextResponse.json({
        status:HttpStatusCode.CREATED,
        success:true,
        data:newSchool
       }
    )
    } catch (error) {
        console.log(error)
        return InternalServerIssue(error)
    }   
}