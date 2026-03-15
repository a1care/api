import mongoose from "mongoose";

export async function connectDb(){
    const uri = process.env.MONGO_URI
    if(!uri){
        throw new Error("mongoose uri not found..")
    }
    await mongoose.connect(uri)
    console.log("mongodb connect successfully...")
}