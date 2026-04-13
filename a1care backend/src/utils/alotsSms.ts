import dotenv from 'dotenv';
dotenv.config();
import sendMessage from '../configs/twilioConfig.js';

/**
 * Sends an OTP SMS using the Alots.io API
 * @param mobileNumber 10-digit mobile number (string)
 * @param otp 6-digit OTP (number or string)
 */
export const sendAlotsSms = async (mobileNumber: string, otp: string | number) => {
    const bearerToken = process.env.ALOTS_AUTH_BEARER;
    const senderId = process.env.ALOTS_SENDER_ID || "DCATCH";
    const peId = process.env.ALOTS_PE_ID;
    const dltTemplateId = process.env.ALOTS_DLT_TEMPLATE_ID;
    const chainValue = process.env.ALOTS_CHAIN_VALUE;
    console.log(`[AlotsSMS] Entering sendAlotsSms for ${mobileNumber}`);

    if (!bearerToken || !peId || !dltTemplateId) {
        console.warn("[AlotsSMS] Missing configuration in .env. Falling back to Twilio...");
        // Twilio sendMessage takes (mobile, otp)
        await sendMessage(Number(mobileNumber), Number(otp));
        return { success: true, message: "Sent via Twilio fallback" };
    }

    // Ensure mobile is in array and has 91 prefix if not present
    const cleanMobile = mobileNumber.replace(/\D/g, '').slice(-10);
    const targetNumber = `91${cleanMobile}`;

    const payload = {
        senderId: senderId,
        dcs: 0,
        flashSms: 0,
        peId: peId,
        text: `${otp} is your OTP for verifying your DAY CATCH Account. Please do not share it with anyone.`,
        dltTemplateId: dltTemplateId,
        chainValue: chainValue,
        messageId: `msg_${Date.now()}`,
        numbers: [targetNumber]
    };

    try {
        console.log(`[AlotsSMS] Sending OTP ${otp} to ${targetNumber}...`);
        const response = await fetch('https://alots.io/api/v1/sms/mt', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${bearerToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        console.log("[AlotsSMS] API Response:", JSON.stringify(result));

        if (response.ok) {
            return { success: true, data: result };
        } else {
            return { success: false, message: result.message || "Failed to send SMS" };
        }
    } catch (error: any) {
        console.error("[AlotsSMS] Fetch Error:", error);
        return { success: false, message: error.message };
    }
};

export default sendAlotsSms;
