import nodemailer from "nodemailer";
import { getSystemSettings } from "../modules/Admin/admin.controller.js";

export interface EmailOptions {
    to: string;
    subject: string;
    html: string;
    attachments?: any[];
}

export const sendEmail = async (options: EmailOptions) => {
    const settings = await getSystemSettings();
    const config = settings.email;

    if (!config.user || !config.pass || !config.host) {
        console.warn("Email configuration missing. Skipping email send.");
        return false;
    }

    const transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.port === 465,
        auth: {
            user: config.user,
            pass: config.pass,
        },
    });

    const mailOptions = {
        from: config.from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        attachments: options.attachments,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log("Email sent: %s", info.messageId);
        return true;
    } catch (error) {
        console.error("Error sending email:", error);
        return false;
    }
};

const EMAIL_PRIMARY_COLOR = "#2F80ED";

const baseTemplate = (title: string, body: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title} - A1Care 24/7</title>
</head>
<body style="margin:0;padding:0;background-color:#f9fafb;font-family:'Inter',Arial,sans-serif;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f9fafb;padding:40px 15px;">
        <tr>
            <td align="center">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:600px;background-color:#ffffff;box-shadow:0 10px 25px rgba(0,0,0,0.05);border-radius:24px;overflow:hidden;">
                    <tr>
                        <td style="background-color:${EMAIL_PRIMARY_COLOR};padding:40px;text-align:center;">
                            <h1 style="color:#ffffff;margin:0;font-size:28px;font-weight:900;letter-spacing:-0.02em;">A1Care <span style="opacity:0.8;">24/7</span></h1>
                            <p style="color:rgba(255,255,255,0.9);margin:8px 0 0;font-size:14px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;">Your Health, Our Priority</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:50px 40px;color:#111827;line-height:1.7;">
                            ${body}
                        </td>
                    </tr>
                    <tr>
                        <td style="background-color:#f3f4f6;padding:30px;text-align:center;">
                            <p style="font-size:12px;color:#6b7280;margin:0;">
                                © ${new Date().getFullYear()} A1Care 24/7. All rights reserved.<br/>
                                Quality Healthcare Services at Your Doorstep.
                            </p>
                            <div style="margin-top:15px;">
                                <a href="#" style="color:${EMAIL_PRIMARY_COLOR};text-decoration:none;font-size:12px;font-weight:700;margin:0 10px;">Privacy Policy</a>
                                <a href="#" style="color:${EMAIL_PRIMARY_COLOR};text-decoration:none;font-size:12px;font-weight:700;margin:0 10px;">Contact Support</a>
                            </div>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;

export const sendWelcomeEmail = async (data: { email: string; fullName: string }) => {
    const body = `
        <h2 style="font-size:22px;font-weight:800;margin-bottom:20px;">Welcome to the A1Care Family!</h2>
        <p style="font-size:16px;margin-bottom:20px;">Dear <strong>${data.fullName}</strong>,</p>
        <p style="margin-bottom:20px;">We're thrilled to have you on board. A1Care 24/7 is designed to bring premium healthcare services—from specialized doctors to nursing and physiotherapy—directly to your home.</p>
        <p style="margin-bottom:30px;">You can now book appointments, manage your medical history, and access care 24/7 via our mobile application.</p>
        <a href="#" style="display:inline-block;background-color:${EMAIL_PRIMARY_COLOR};color:#ffffff;padding:16px 32px;border-radius:12px;text-decoration:none;font-weight:700;font-size:16px;">Download Mobile App</a>
        <p style="margin-top:40px;font-size:14px;color:#4b5563;">Best regards,<br/>Team A1Care 24/7</p>
    `;
    return sendEmail({ to: data.email, subject: "Welcome to A1Care 24/7 - Quality Care at Home", html: baseTemplate("Welcome", body) });
};

export const sendJobAcknowledgmentEmail = async (data: { email: string; fullName: string; jobTitle: string }) => {
    const body = `
        <h2 style="font-size:22px;font-weight:800;margin-bottom:20px;">Application Received</h2>
        <p style="font-size:16px;margin-bottom:20px;">Dear <strong>${data.fullName}</strong>,</p>
        <p style="margin-bottom:20px;">Thank you for applying for the <strong>${data.jobTitle}</strong> position. We have received your application and our team is currently reviewing it.</p>
        <p style="margin-bottom:20px;">If your profile matches our requirements, we will contact you for further rounds of interviews.</p>
        <p style="margin-top:30px;font-size:14px;color:#4b5563;">Best regards,<br/>The HR Team, A1Care 24/7</p>
    `;
    return sendEmail({ to: data.email, subject: `Application Received: ${data.jobTitle} - A1Care 24/7`, html: baseTemplate("Application Received", body) });
};

export const sendAppointmentConfirmationEmail = async (data: { email: string; fullName: string; serviceName: string; date: string; time: string; location: string }) => {
    const body = `
        <h2 style="font-size:22px;font-weight:800;margin-bottom:20px;">Appointment Confirmed!</h2>
        <p style="font-size:16px;margin-bottom:20px;">Dear <strong>${data.fullName}</strong>,</p>
        <p style="margin-bottom:20px;">Your booking for <strong>${data.serviceName}</strong> has been successfully confirmed.</p>
        <div style="background-color:#f3f4f6;padding:24px;border-radius:16px;margin-bottom:30px;">
            <p style="margin:0 0 10px;">📅 <strong>Date:</strong> ${data.date}</p>
            <p style="margin:0 0 10px;">⏰ <strong>Time:</strong> ${data.time}</p>
            <p style="margin:0;">📍 <strong>Location:</strong> ${data.location}</p>
        </div>
        <p style="margin-bottom:20px;">Our provider will arrive at the scheduled time. Please ensure someone is available at the provided address.</p>
        <p style="font-size:14px;color:#4b5563;">Need to reschedule? Open the A1Care app or contact support.</p>
    `;
    return sendEmail({ to: data.email, subject: `Appointment Confirmed: ${data.serviceName} - A1Care 24/7`, html: baseTemplate("Booking Confirmed", body) });
};

export const sendWalletTopupEmail = async (data: { email: string; fullName: string; amount: string; txnid: string }) => {
    const body = `
        <h2 style="font-size:22px;font-weight:800;margin-bottom:20px;color:#10b981;">Wallet Credited Successfully</h2>
        <p style="font-size:16px;margin-bottom:20px;">Dear <strong>${data.fullName}</strong>,</p>
        <p style="margin-bottom:20px;">We've successfully credited your A1Care wallet.</p>
        <div style="background-color:#ecfdf5;padding:24px;border-radius:16px;margin-bottom:30px;border:1px solid #10b981;">
            <p style="margin:0 0 10px;font-size:24px;font-weight:900;color:#065f46;">₹${data.amount}</p>
            <p style="margin:0;font-size:12px;color:#065f46;font-family:monospace;">TXN ID: ${data.txnid}</p>
        </div>
        <p style="margin-bottom:20px;">You can use this balance to pay for any future services on the A1Care platform.</p>
    `;
    return sendEmail({ to: data.email, subject: `Wallet Updated: Success ₹${data.amount} - A1Care 24/7`, html: baseTemplate("Wallet Credit", body) });
};

export const sendOTPFallbackEmail = async (data: { email: string; otp: string }) => {
    const body = `
        <h2 style="font-size:22px;font-weight:800;margin-bottom:20px;">Verification Code</h2>
        <p style="font-size:16px;margin-bottom:20px;">Use the following code to complete your sign-in/verification process.</p>
        <div style="background-color:#f3f4f6;padding:30px;text-align:center;border-radius:16px;margin-bottom:30px;">
            <p style="margin:0;font-size:36px;font-weight:900;letter-spacing:10px;color:${EMAIL_PRIMARY_COLOR};">${data.otp}</p>
        </div>
        <p style="font-size:12px;color:#6b7280;text-align:center;">This code will expire in 10 minutes. Do not share this code with anyone.</p>
    `;
    return sendEmail({ to: data.email, subject: "A1Care 24/7 Verification Code", html: baseTemplate("Security Code", body) });
};
