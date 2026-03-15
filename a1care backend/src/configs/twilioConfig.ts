import twilio from "twilio";
import dotenv from 'dotenv'
dotenv.config()

const twilioSid = process.env.TWILIO_ACCOUNT_SID;
const twilioToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

const sendMessage = async (mobileNumber: number, otp: number) => {
    if (!twilioSid || !twilioToken || !twilioPhone) {
        console.log("------------------------------------------");
        console.log(`[DEV MODE] OTP for ${mobileNumber}: ${otp}`);
        console.log("Twilio credentials missing in .env. Skipping SMS.");
        console.log("------------------------------------------");
        return;
    }

    try {
        const client = twilio(twilioSid, twilioToken);
        const message = await client.messages.create({
            body: `Your otp for a1care login ${otp}, have a great day`,
            to: `+91${mobileNumber}`,
            from: twilioPhone
        });
        console.log("SMS Sent successfully:", message.sid);
    } catch (error) {
        console.error('Error in sending the message', error);
    }
}

export default sendMessage