import { StanderedResponse } from "@/interfaces/apiResponses/standardResponse";
import { TokenInterface } from "@/interfaces/token/tokenInterface";
import { mongodbConnect } from "@/lib/dataBase/mongoDb";
import Principal from "@/models/principle";
import { createToken, setToCookie } from "@/services/tokenServices/jwtTokenServices";
import { BadRequest, conflict, forBidden, InternalServerIssue, notFound, roleCheck, Unauthorized, VerifyToken } from "@/utils/apiResponses/commonResponses";
import { HttpStatusCode } from "@/utils/apiResponses/httpsStatusAndCode";
import { principalBodyValidation, principalPathValidation } from "@/validations/requestBody/principalValidations";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { NextRequest ,NextResponse } from "next/server";

export async function POST(req:NextRequest) :Promise<NextResponse> {

    try {
        const body = await req.json()

        // validating through zod 
        const isValidBody = principalBodyValidation.safeParse(body)
        // if validatioin failed
        if(isValidBody.error){
            return BadRequest("Please provide valid body!")
        }

        /// contectind dabse
        const isConnected = await mongodbConnect()

        if(!isConnected){
            return InternalServerIssue()
        }
        // check the existance
        const isExistWithEmail = await Principal.findOne({
            email:body.email,

        }).lean().select("_id")

        const isExistWithPhoneNumber = await Principal.findOne({
            contactNumber:body.contactNumber
        }).lean().select("_id")
        
        /// conditon when exist wiht the email and constact numberr bboth
        if(isExistWithEmail ){
            return conflict("already register with this email id!")
        }

        if(isExistWithPhoneNumber){
            return conflict("already register with this phone number!")
        }

        // creating hash password
        const hashedPassword = await bcrypt.hash(body.password, 10)

        const principle = await Principal.create({...body, password:hashedPassword})

    
        if(!principle){
            return InternalServerIssue()
        }

        const tokenPayload :TokenInterface= {
            _id:principle._id,
            role:"principal",
            schoolId:"",
            
        }

        const tokenServices = await createToken(tokenPayload)
        
        if(!tokenServices.isCreated || !tokenServices.token){
            return InternalServerIssue(new Error("failed to create token!"))
        }
        (await cookies()).set(process.env.COOKIE_NAME as string, tokenServices.token)
        // if(!isSaved){
        //     return InternalServerIssue(new Error("failed to save into cookies"))
        // }

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

/// patch api fo principaol inter
export async function PATCH(req:NextRequest):Promise<NextResponse> {
    try {
        // upthenticatin apoi
        const authenticationApi = await VerifyToken(req)

        if(!authenticationApi.isVerified || !authenticationApi.user){
            return Unauthorized()
        }

        /// if role is not a 
        const isValidrole = await roleCheck(authenticationApi.user, "principal")

        if(!isValidrole){
            return forBidden("current role is didn't match!")
        }

        // update body 
        const body = await req.json()
        // validation throught the zod 
        const isValidUpdateBody = principalPathValidation.safeParse(body)

        if(!isValidUpdateBody.success){
            return BadRequest()
        }
        // connecting dabse4
        const isConnected = await mongodbConnect()

        if(!isConnected){
            return InternalServerIssue()
        }

        // findinig principal info
        const principal = await Principal.findOne({
            _id:authenticationApi.user._id
        }).lean().select("_id")

        if(!principal){
            return notFound("principal record not found!")
        }

        //// when updating the password
        if(body.password){
            const newHashedPassword = await bcrypt.hash(body.password, 10)
            body.password = newHashedPassword
        }

        const updatedPrncipleRecord = await Principal.findOneAndUpdate({
            _id:authenticationApi.user._id
        },{
            ...body
        }).lean().select(" _id")
        if(!updatedPrncipleRecord){
            return InternalServerIssue("Failed to update principle record!")
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