import { TokenInterface } from "@/interfaces/token/tokenInterface";
import { mongodbConnect } from "@/lib/dataBase/mongoDb";
import School from "@/models/school";
import Student from "@/models/student";
import { createToken } from "@/services/tokenServices/jwtTokenServices";
import { BadRequest, conflict, forBidden, InternalServerIssue, notFound, roleCheck, Unauthorized, VerifyToken } from "@/utils/apiResponses/commonResponses";
import { HttpStatusCode } from "@/utils/apiResponses/httpsStatusAndCode";
import { StudentRegisterSchemaZodSchema, studentUpdateZodValidation } from "@/validations/requestBody/studentValidation";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req:NextRequest):Promise<NextResponse> {
    try {
        /// body from the requeston 
        const body = await req.json()
        // body is must be provided error
        if(!body){
            return BadRequest("must be provide the body!")
        }

        // zod validartion 
        const isValidBody = StudentRegisterSchemaZodSchema.safeParse(body)
        if(!isValidBody.success){
            return BadRequest(isValidBody.error.message || "please provide valid body!" )
        }
        
        /// database connectoin 
        const isConnected = await mongodbConnect()
        if(!isConnected){
            return InternalServerIssue(new Error("Failed to connect databse!"))
        }
        // student already existance test
        // const isStudentExistWithEmail = await Student.findOne({
        //     email:body.email
        // }).lean().select("_id")
        // const isStudentExisstWithAdhar = await Student.findOne({
        //     documents:{
        //         aadharNumber:body.documents.aadharNumber
        //     }
        // })
       const existence = await Student.aggregate([
        {
            $match: {
            $or: [
                { email: body.email },
                { "documents.aadharNumber": body.documents?.aadharNumber },
                { "documents.pan": body.documents?.pan },
                { "documents.ssmId": body.documents?.ssmId },
                { contactNumber: { $in: body.contactNumber || [] } }
            ]
            }
        },
        {
            $project: { _id: 1 }
        },
        {
            $limit: 1
        }
        ])
        // studen when already existy
        if(existence.length > 0){
            return conflict("user already register yet!")
        }
        // schoolCheck
        const isExistSchool = await School.findOne({
            diseCode:body.diseCode
        }).lean().select("_id")
        // school existance error
        if(!isExistSchool){
            return notFound("your school is not found with this diseCode!")
        }
        // password hashing 
        const hashedPassword = await bcrypt.hash(body.password, 10)
        // return while bcrypt js
        if(!hashedPassword){
            return InternalServerIssue(new Error("Failed to create database!"))
        }
        const student = await Student.create({...body, password:hashedPassword, schoolId:isExistSchool._id})

        // when failed to create student registration 
        if(!student){
            return InternalServerIssue(new Error("Failed to create student document!"))
        }

        // creating token
        const tokenPayload :TokenInterface = {
            _id:student._id,
            role:"student",
            schoolId:isExistSchool._id
        }

        // token services
        const tokenServices  = await createToken(tokenPayload)
        // while failed to create token
        if(!tokenServices.isCreated || !tokenServices.token){
            return InternalServerIssue(new Error("failed to create token!"))
        }
        // return final value
        return NextResponse.json({
            status:HttpStatusCode.CREATED,
            success:true,
            token:tokenServices.token
        },{
            status:HttpStatusCode.CREATED
        })
    } catch (error) {
        console.log(error)
        return InternalServerIssue(error)
    }
}



export async function PATCH(req:NextRequest):Promise<NextResponse> {
    try {
      // authentication of api
      const apiAuthentication = await VerifyToken(req)
      if(!apiAuthentication.isVerified || !apiAuthentication.user){
        return Unauthorized()
      }
      // role check
      const isValidRole = await roleCheck(apiAuthentication.user, "student")
      if(!isValidRole){
        return forBidden("current role is not valid!")
      }
      // body validation 
      const body = await req.json()
      const isValidBody = studentUpdateZodValidation.safeParse(body)
      // validation error
      if(!isValidBody.success){
        return BadRequest(isValidBody.error.message || "Please provide valid body")
      }

      // databser connection 
      const isConnected = await mongodbConnect()
      if(!isConnected){
        return InternalServerIssue(new Error("Failed to connect databse!"))
      }
      // if the updating the password
      if(body.password){
        const hashedPassword = await bcrypt.hash(body.password, 10)
        body.password = hashedPassword
      }
      /// updatinig data
      const newUpdatedDoc =await Student.findOneAndUpdate({
        _id:apiAuthentication.user._id
      },{
        ...body
      }).lean().select("_id")
    //   failed to update 
    if(!newUpdatedDoc){
        return InternalServerIssue(new Error("Failed to update student document!"))
    }
      return NextResponse.json({
        success:true,
        status:HttpStatusCode.OK,
        message:"Updated Successfully!"
      })
    } catch (error) {
      console.log(error)
      return InternalServerIssue(error)
    }
}