import mongoose from "mongoose";

export const mongodbConnect = async () :Promise<boolean>=>{
    try {
        if(mongoose.connection.readyState === 1){
            return true
        }
        const isConnected = await mongoose.connect(process.env.MONGODB_URI as string, {
            dbName:"SMA"
        })

        if(!isConnected){
            return false
        }
        return true
    } catch (error) {
        console.log(error)
        return false
    }
}