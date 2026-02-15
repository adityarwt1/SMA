import { TokenInterface } from "@/interfaces/token/tokenInterface";
import { mongodbConnect } from "@/lib/dataBase/mongoDb";
import School from "@/models/school";
import Teacher from "@/models/techer";
import { createToken } from "@/services/tokenServices/jwtTokenServices";
import { BadRequest, conflict, InternalServerIssue, notFound } from "@/utils/apiResponses/commonResponses";
import { HttpStatusCode } from "@/utils/apiResponses/httpsStatusAndCode";
import { teacherRegisterValidation } from "@/validations/requestBody/teacherValidation";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req:NextRequest):Promise<NextResponse> {
    try {
        const body  = await req.json()

        // valdi body or not 
        const isValidBody = teacherRegisterValidation.safeParse(body)

        if(!isValidBody.success){
            return BadRequest('please provide valid data types!')
        }

        // database connection 
        const isConnected = await mongodbConnect()

        if(!isConnected){
            return InternalServerIssue(new Error("Failed to connect databse!"))
        }
        /// school exist check
        const school = await School.findOne({
            diseCode:body.diseCode
        }).lean().select("_id")

        // school not exist 
        if(!school){
            return notFound("currently your school is not registered yet!")
        }
        // exist with email or not
        const isExistWithEmail  = await Teacher.findOne({
            email:body.email
        }).lean().select("_id")
        // error with existance
        if(isExistWithEmail){
            return conflict('user already exist with this email id!')
        }
        // is exist with contact number
        const isExistWithContactNumber = await Teacher.findOne({
            contactNumber:body.contactNumber
        }).lean().select("_id")

        // return error when already register with ph0one number
        if(isExistWithContactNumber){
            return conflict("user already register with this phone number!")
        }

        /// hashed Password
        const hashedPassword = await bcrypt.hash(body.password, 10)

        // return error when hashed password not generated 
        if(!hashedPassword){
            return InternalServerIssue(new Error("failed to create hashed password!"))
        }

        // created teacher document 
        const teacher = await Teacher.create({...body, password:hashedPassword})

        if(!teacher){
            return InternalServerIssue('failed to register teacher!')
        }

        // token payuload onot
        const tokenPayload :TokenInterface ={
            _id:teacher._id,
            role:"teacher",
            schoolId:school._id
        }
        // create token through services
        const tokenServices =await createToken(tokenPayload)
        // while failure of token creation
        if(!tokenServices.isCreated || !tokenServices.token){
            return InternalServerIssue(new Error("Failed to create token!"))
        }
        // save into coookies
        (await cookies()).set(process.env.COOKIE_NAME as string, tokenServices.token)

        return NextResponse.json({
            success:true,
            status:HttpStatusCode.CREATED,
            token:tokenServices.token
        },
    {
        status:HttpStatusCode.CREATED
    })
    } catch (error) {
        console.log(error)
        return InternalServerIssue(error)
    }
}