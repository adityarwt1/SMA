import { StanderedResponse } from "@/interfaces/apiResponses/standardResponse";
import { TokenInterface } from "@/interfaces/token/tokenInterface";
import { mongodbConnect } from "@/lib/dataBase/mongoDb";
import School from "@/models/school";
import { createToken } from "@/services/tokenServices/jwtTokenServices";
import { BadRequest, conflict, forBidden, InternalServerIssue, roleCheck, Unauthorized, VerifyToken } from "@/utils/apiResponses/commonResponses";
import { HttpStatusCode } from "@/utils/apiResponses/httpsStatusAndCode";
import { schoolRegisterValidation, schoolUpdateValidation } from "@/validations/requestBody/schollValidation";
import { cookies } from "next/headers";
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
            return BadRequest(isValidBody.error.message || "please provide valid data for registeration!")
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

         const tokenPayLoad:TokenInterface ={
            _id:apiAuthentication.user._id,
            role:"principal",
            schoolId:newSchool._id
        }
        const tokenServices = await createToken(tokenPayLoad)

        if(!tokenServices.isCreated || !tokenServices.token){
            return InternalServerIssue(new Error("Failed to create token!"))
        }

        (await cookies()).set(process.env.COOKIE_NAME as string, tokenServices.token)
       return NextResponse.json({
        status:HttpStatusCode.CREATED,
        success:true,
        data:newSchool
       }
    ,{
        status:HttpStatusCode.CREATED
    })
    } catch (error) {
        console.log(error)
        return InternalServerIssue(error)
    }   
}

export async function PATCH(req:NextRequest):Promise<NextResponse> {
    try {
        const apiAuthentication  = await VerifyToken(req)
        // ifnot authencticated user
        if(!apiAuthentication.isVerified || !apiAuthentication.user){
            return Unauthorized()
        }

        /// rolecheck 
        const isValidRole = await roleCheck(apiAuthentication.user, "principal")
        if(!isValidRole){
            return forBidden("you are not a principal!")
        }
        // req body
        const body = await req.json()
        /// bodyvalidation
        const isValidBody =schoolUpdateValidation.safeParse(body)
        if(!isValidBody.success){
            return BadRequest(isValidBody.error.message || "please provide valide data format!")
        }

        // databse connecttion 
        const isconnected = await mongodbConnect()
        if(!isconnected){
            return InternalServerIssue(new Error("Failed to connet Databse!"))
        }

        const updatedData = await School.findOneAndUpdate({
            _id:body._id
        },{...body},{new:true}).lean().select("_id")

        if(!updatedData){
            return InternalServerIssue(new Error("Failed to update school record!"))
        }

        return NextResponse.json<StanderedResponse>({
            status:HttpStatusCode.OK,
            success:true,
        })
    } catch (error) {
        console.log(error)
        return InternalServerIssue(error)
    }
}