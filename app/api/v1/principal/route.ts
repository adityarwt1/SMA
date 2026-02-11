import { mongodbConnect } from "@/lib/dataBase/mongoDb";
import { BadRequest, InternalServerIssue } from "@/utils/apiResponses/commonResponses";
import { principalBodyValidation } from "@/validations/responseBody/principalValidations";
import { NextRequest } from "next/server";

export async function POST(req:NextRequest) {

    try {
        const body = await req.json()

        // validating through zod 
        const isValidBody = principalBodyValidation.safeParse(body)
        // if validatioin failed
        if(!isValidBody.error){
            return BadRequest("Please provide valid body!")
        }

        /// contectind dabse
        const isConnected = await mongodbConnect()

        if(!isConnected){
            return InternalServerIssue()
        }

        
    } catch (error) {
        console.log(error)
        return InternalServerIssue(error)
    }
    
}