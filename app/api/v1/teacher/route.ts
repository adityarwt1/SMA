import { InternalServerIssue } from "@/utils/apiResponses/commonResponses";
import { NextRequest } from "next/server";

export async function POST(req:NextRequest):Promise<NextResponse> {
    try {
        
    } catch (error) {
        console.log(error)
        return InternalServerIssue(error)
    }
}