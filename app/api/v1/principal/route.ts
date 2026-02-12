import { StanderedResponse } from "@/interfaces/apiResponses/standardResponse";
import { TokenInterface } from "@/interfaces/token/tokenInterface";
import { mongodbConnect } from "@/lib/dataBase/mongoDb";
import Principal from "@/models/principle";
import { createToken, setToCookie } from "@/services/tokenServices/jwtTokenServices";
import { BadRequest, conflict, InternalServerIssue } from "@/utils/apiResponses/commonResponses";
import { HttpStatusCode } from "@/utils/apiResponses/httpsStatusAndCode";
import { principalBodyValidation } from "@/validations/responseBody/principalValidations";
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
        const principle = await Principal.create(body)


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

        const isSaved = await setToCookie(tokenServices.token  as string)

        if(!isSaved){
            return InternalServerIssue(new Error("failed to save into cookies"))
        }

        return NextResponse.json<StanderedResponse>({
            status:HttpStatusCode.CREATED,
            success:true,
        })
    } catch (error) {
        console.log(error)
        return InternalServerIssue(error)
    }
    
}

