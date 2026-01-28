import twilio from "twilio";
import dotenv from 'dotenv'
dotenv.config()

const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID , process.env.TWILIO_AUTH_TOKEN)

const sendMessage = async (mobileNumber:number , otp:number)=>{
    try{
        const sendMessage = await twilioClient.messages.create({
            body:`Your otp for a1care login ${otp}, have a great day`, 
            to:`+91${mobileNumber}`
        })
    }catch(error){
        console.error('Error in sending the message' , error)
    }
}

export default sendMessage