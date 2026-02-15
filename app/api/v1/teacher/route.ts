import { TokenInterface } from "@/interfaces/token/tokenInterface";
import { mongodbConnect } from "@/lib/dataBase/mongoDb";
import School from "@/models/school";
import Teacher from "@/models/techer";
import { createToken } from "@/services/tokenServices/jwtTokenServices";
import { BadRequest, conflict, forBidden, InternalServerIssue, notFound, roleCheck, Unauthorized, VerifyToken } from "@/utils/apiResponses/commonResponses";
import { HttpStatusCode } from "@/utils/apiResponses/httpsStatusAndCode";
import { teacherRegisterValidation, teacherUpdateValidation } from "@/validations/requestBody/teacherValidation";
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
        const teacher = await Teacher.create({...body, password:hashedPassword, schoolId:school._id})

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
        (await cookies()).set(process.env.COOKIE_NAME as string, tokenServices.token);
        // return token also to save into local storage to access this
        return NextResponse.json({
            success:true,
            status:HttpStatusCode.CREATED,
            token:tokenServices.token,
        },
    {
        status:HttpStatusCode.CREATED
    })
    } catch (error) {
        console.log(error)
        return InternalServerIssue(error)
    }
}


// update api
export async function PATCH(req:NextRequest) :Promise<NextResponse> {
    try {
        // authenticate api through bearer token
        const apiAuthentication = await VerifyToken(req)
        // user is not authenticated
        if(!apiAuthentication.isVerified || !apiAuthentication?.user){
            return Unauthorized()
        }
        // tokenrole chekck
        const isValidRole = await roleCheck(apiAuthentication.user, "teacher")
        if(!isValidRole){
            return forBidden("You are not an teacher!")
        }
        // body validations
        const body = await req.json()
        if(!body){
            return BadRequest("please valid body")
        }
        // zod body validation 
        const isValidBody = teacherUpdateValidation.safeParse(body)
        // error for the body validation 
        if(!isValidBody.success){
            return BadRequest('please provide valid update data!')
        }
    
        // databse connection test 
        const isConnected = await mongodbConnect()

        if(!isConnected){
            return InternalServerIssue("failed to connect databse!")
        }
        // check the existance 
        const teacherdocs = await Teacher.findOne({
            _id:apiAuthentication.user._id
        }).select("_id").lean()
        // teacherby change not exist
        if(!teacherdocs){
            return notFound("Teacher record not found!")
        }
        // if changing password
        if(body.password){
            const hashedPassword = await bcrypt.hash(body.password, 10)
            body.password = hashedPassword
        }

        const newUpdatedData = await Teacher.findOneAndUpdate({
            _id:apiAuthentication.user._id
        },{
            ...body
        })
        // if by change failed to update teacher data!
        if(!newUpdatedData){
            return InternalServerIssue(new Error("Failed to update teacher document!"))
        }
        // final return whhile complete the api
        return NextResponse.json({
            status:HttpStatusCode.OK,
            success:true
        },{
            status:HttpStatusCode.OK
        })
    } catch (error) {
        console.log(error)
        return InternalServerIssue(error)
    }
}