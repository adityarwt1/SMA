"use server"
import { NextRequest, NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import { StanderedResponse } from "@/intefaces/apiResponses/standardResponse"
import { HttpStatusCode, HttpStatusText } from "./httpsStatusAndCode"
import { TokenInterface } from "@/intefaces/token/tokenInterface"

export const BadRequest  =async (message?:string )=> NextResponse.json<StanderedResponse>({
    success:false,
    status:HttpStatusCode.BAD_REQUEST,
    error:HttpStatusText.BAD_REQUEST,
    message
},{
    status:HttpStatusCode.BAD_REQUEST
})
export const UnExpectedError  =async (message?:string )=> NextResponse.json<StanderedResponse>({
    success:false,
    status:HttpStatusCode.BAD_REQUEST,
    error:HttpStatusText.BAD_REQUEST,
    message
},{
    status:HttpStatusCode.BAD_REQUEST
})

export const InternalServerIssue =async (error?:Error | unknown)=> NextResponse.json<StanderedResponse>({
    message:(error as Error)?.message as string || "Internal server issue!",
    status:HttpStatusCode.INTERNAL_SERVER_ERROR,
    error:HttpStatusText.INTERNAL_SERVER_ERROR,
    success:false
},{
    status:HttpStatusCode.INTERNAL_SERVER_ERROR
})

export const TestingTest = async (message:string)=> NextResponse.json({
    message
})


export const Unauthorized = async ()=> NextResponse.json<StanderedResponse>({
    status:HttpStatusCode.UNAUTHORIZED,
    success:false,
    error:HttpStatusText.UNAUTHORIZED,
    message:"User unathorized!"
},{
    status:HttpStatusCode.UNAUTHORIZED
})

export const FailedToConnectDatabse = async ()=> NextResponse.json<StanderedResponse>({
    status:HttpStatusCode.INTERNAL_SERVER_ERROR,
    success:false,
    error:HttpStatusText.INTERNAL_SERVER_ERROR,
    message:"Failed to connect database!"
},{
    status:HttpStatusCode.INTERNAL_SERVER_ERROR
})


export const VerifyToken = async (req:NextRequest) : Promise<{
    isVerified:boolean,
    user?:TokenInterface
}>=>{
    try {
        const header = req.headers;
        const token = header.get("Authorization")?.split(" ")[1];
        if(!token){
            return {
                isVerified:false
            };
        }
        let user:TokenInterface;
        try {
            user = jwt.verify(token,process.env.JWT_SECRET as string) as TokenInterface 
        } catch (error) {
            console.log(error)
            return {
                isVerified:false
            }
        }

        if(!user){
            return {
                isVerified:false
            }
        }
        return {
            isVerified:true,
            user
        }
        
    } catch (error) {
        console.log(error)
        return {
            isVerified:false
        }
    }   
}

export const notFound =async (message?:string)=> NextResponse.json<StanderedResponse>({
    status:HttpStatusCode.NOT_FOUND,
    success:false,
    error:HttpStatusText.NOT_FOUND,
    message: message || "not found"
})