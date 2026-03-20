import twilio from "twilio";
import dotenv from 'dotenv';
dotenv.config();

const twilioSid = process.env.TWILIO_ACCOUNT_SID;
const twilioToken = process.env.TWILIO_AUTH_TOKEN;
const verifySid = process.env.TWILIO_VERIFY_SERVICE_SID;

const sendMessage = async (mobileNumber: number, otp: number) => {
    // If Verify SID is present, use Twilio Verify API
    if (twilioSid && twilioToken && verifySid) {
        try {
            const client = twilio(twilioSid, twilioToken);
            // Twilio Verify handles the OTP generation and sending
            // But since our backend generates the OTP (otp param), we will send it as a custom SMS via Verify or standard SMS
            // For now, let's stick to standard SMS IF TWILIO_PHONE_NUMBER exists, 
            // OTHERWISE use the Verify Service if implemented.
            
            // Re-checking for Phone Number for standard SMS
            const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

            if (twilioPhone) {
                const message = await client.messages.create({
                    body: `Your A1Care verification code is: ${otp}. Do not share this with anyone.`,
                    to: `+91${mobileNumber}`,
                    from: twilioPhone
                });
                console.log("[SMS] Sent successfully:", message.sid);
                return;
            } else {
                // If no phone number, we'll try to use the Verify Service 
                // Note: Standard Verify API generates its own OTPs. 
                // To use our own OTP, we'd need a different approach.
                // For now, I'll log that the phone number is missing.
                console.log("------------------------------------------");
                console.log(`[DEV MODE] OTP for ${mobileNumber}: ${otp}`);
                console.log("TWILIO_PHONE_NUMBER missing in .env. Use bypass 123123 or check terminal logs.");
                console.log("------------------------------------------");
            }
        } catch (error) {
            console.error('[Twilio] Error:', error);
        }
    } else {
        console.log("------------------------------------------");
        console.log(`[DEV MODE] OTP for ${mobileNumber}: ${otp}`);
        console.log("Twilio credentials incomplete. Skipping SMS.");
        console.log("------------------------------------------");
    }
}

export default sendMessage;