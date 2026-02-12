"use server"

import { TokenInterface } from "@/interfaces/token/tokenInterface"
import jwt from 'jsonwebtoken'
import { cookies } from "next/headers"
interface TokenAknowledgement {
    isCreated:boolean,
    token?:string
}
export const createToken = async (tokenPayload:TokenInterface):Promise<TokenAknowledgement> =>{
    const secret = process.env.JWT_SECRET as string
    if(!secret) {
        return {
            isCreated:false
        }
    }
    
    try {
        const token = jwt.sign(tokenPayload, secret)
        if(!token){
            return {
                isCreated:false
            }
        }
        return {
            isCreated:true,
            token
        }
    } catch (error) {
        console.log(error)
        return {
            isCreated:false,
            
        }
    }
}

export const setToCookie = async (token:string):Promise<boolean> =>{
    try {
        const cookiesStore = await cookies()
        cookiesStore.set(process.env.COOKIE_NAME as string, token,{
            httpOnly:true,
            path:"/"
        })

        return true
    } catch (error) {
        return false
    }
}