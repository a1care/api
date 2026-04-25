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
<body style="margin:0;padding:0;background-color:#F0F4F8;font-family:'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#F0F4F8;padding:40px 15px;">
        <tr>
            <td align="center">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:600px;background-color:#ffffff;box-shadow:0 20px 40px rgba(0,0,0,0.08);border-radius:32px;overflow:hidden;">
                    <tr>
                        <td style="background: linear-gradient(135deg, #0D2E6E 0%, #1A6FDB 100%); padding:60px 40px; text-align:center;">
                            <h1 style="color:#ffffff;margin:0;font-size:32px;font-weight:900;letter-spacing:-0.03em;">A1Care <span style="color:#7FCFFF;">24/7</span></h1>
                            <div style="height:2px; width:40px; background-color:rgba(255,255,255,0.2); margin:20px auto;"></div>
                            <p style="color:rgba(255,255,255,0.8);margin:0;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.15em;">Premium Healthcare at Home</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:60px 40px;color:#1E293B;line-height:1.8;">
                            ${body}
                        </td>
                    </tr>
                    <tr>
                        <td style="background-color:#F8FAFC;padding:40px;text-align:center;border-top:1px solid #E2E8F0;">
                            <p style="font-size:12px;color:#94A3B8;margin:0;line-height:20px;">
                                © ${new Date().getFullYear()} A1Care 24/7. All rights reserved.<br/>
                                📍 Hitech City, Hyderabad, India
                            </p>
                            <div style="margin-top:20px; border-top:1px solid #E2E8F0; padding-top:20px;">
                                <a href="#" style="color:#1A6FDB;text-decoration:none;font-size:11px;font-weight:800;margin:0 12px;text-transform:uppercase;letter-spacing:0.05em;">Terms</a>
                                <a href="#" style="color:#1A6FDB;text-decoration:none;font-size:11px;font-weight:800;margin:0 12px;text-transform:uppercase;letter-spacing:0.05em;">Privacy</a>
                                <a href="#" style="color:#1A6FDB;text-decoration:none;font-size:11px;font-weight:800;margin:0 12px;text-transform:uppercase;letter-spacing:0.05em;">Support</a>
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
        <div style="text-align:center;">
            <div style="width:80px; height:80px; background-color:#EFF6FF; border-radius:40px; display:inline-block; line-height:80px; font-size:40px; margin-bottom:30px;">👋</div>
            <h2 style="font-size:26px;font-weight:900;margin-bottom:15px;color:#0F172A;letter-spacing:-0.02e;">Welcome, ${data.fullName}!</h2>
            <p style="font-size:16px;color:#64748B;line-height:26px;margin-bottom:40px;">You are now part of the A1Care community. We're here to provide professional medical care right at your doorstep, whenever you need it.</p>
            <a href="#" style="display:inline-block;background-color:#1A6FDB;color:#ffffff;padding:18px 40px;border-radius:18px;text-decoration:none;font-weight:800;font-size:15px;box-shadow:0 10px 20px rgba(26,111,219,0.2);">Get Started Now</a>
            <p style="margin-top:50px;font-size:14px;color:#94A3B8;font-style:italic;">Best regards,<br/>Team A1Care 24/7</p>
        </div>
    `;
    return sendEmail({ to: data.email, subject: "Welcome to A1Care 24/7 - Quality Care at Home", html: baseTemplate("Welcome", body) });
};

export const sendPartnerWelcomeEmail = async (data: { email: string; fullName: string }) => {
    const body = `
        <h2 style="font-size:22px;font-weight:800;margin-bottom:20px;">Welcome to the A1Care Partner Network!</h2>
        <p style="font-size:16px;margin-bottom:20px;">Dear <strong>${data.fullName}</strong>,</p>
        <p style="margin-bottom:20px;">We're thrilled to have you join us as a healthcare partner. A1Care 24/7 is on a mission to bring high-quality healthcare directly to patients' homes, and your expertise is key to making that happen.</p>
        <p style="margin-bottom:20px;">Your profile is currently under review. Once verified, you'll be able to receive and manage service requests, track your earnings, and grow your practice with us.</p>
        <p style="margin-bottom:30px;">Download the A1Care Partner app to stay updated on your status and start receiving bookings once you're active.</p>
        <a href="#" style="display:inline-block;background-color:${EMAIL_PRIMARY_COLOR};color:#ffffff;padding:16px 32px;border-radius:12px;text-decoration:none;font-weight:700;font-size:16px;">Go to Partner App</a>
        <p style="margin-top:40px;font-size:14px;color:#4b5563;">Best regards,<br/>Partner Support Team, A1Care 24/7</p>
    `;
    return sendEmail({ to: data.email, subject: "Welcome to A1Care Partner - Let's Grow Together", html: baseTemplate("Welcome Partner", body) });
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

export const sendAppointmentConfirmationEmail = async (data: { 
    email: string; 
    fullName: string; 
    serviceName: string; 
    date: string; 
    time: string; 
    location: string;
    price?: string | number;
    paymentMode?: string;
}) => {
    const body = `
        <div style="text-align:center; margin-bottom:40px;">
            <div style="width:70px; height:70px; background-color:#F0FDF4; border-radius:35px; display:inline-block; line-height:70px; font-size:32px; margin-bottom:25px;">✅</div>
            <h2 style="font-size:24px;font-weight:900;margin-bottom:10px;color:#0F172A;">Appointment Confirmed</h2>
            <p style="color:#64748B;font-size:15px;">Your healthcare provider is scheduled!</p>
        </div>
        <div style="background-color:#F8FAFC;padding:32px;border-radius:24px;margin-bottom:30px;border:1px solid #E2E8F0;">
            <div style="margin-bottom:20px;">
                <p style="margin:0; font-size:11px; font-weight:800; color:#94A3B8; text-transform:uppercase; letter-spacing:0.1em;">Service</p>
                <p style="margin:4px 0 0; font-size:17px; font-weight:700; color:#0D2E6E;">${data.serviceName}</p>
            </div>
            <div style="margin-bottom:20px; display:table; width:100%;">
                <div style="display:table-cell; width:50%;">
                    <p style="margin:0; font-size:11px; font-weight:800; color:#94A3B8; text-transform:uppercase; letter-spacing:0.1em;">Date</p>
                    <p style="margin:4px 0 0; font-size:15px; font-weight:700;">${data.date}</p>
                </div>
                <div style="display:table-cell; width:50%;">
                    <p style="margin:0; font-size:11px; font-weight:800; color:#94A3B8; text-transform:uppercase; letter-spacing:0.1em;">Time</p>
                    <p style="margin:4px 0 0; font-size:15px; font-weight:700;">${data.time}</p>
                </div>
            </div>
            <div style="margin-bottom:20px; border-top:1px solid #E2E8F0; padding-top:20px;">
                <p style="margin:0; font-size:11px; font-weight:800; color:#94A3B8; text-transform:uppercase; letter-spacing:0.1em;">Location</p>
                <p style="margin:4px 0 0; font-size:14px; font-weight:600; color:#475569;">${data.location}</p>
            </div>
            <div style="display:table; width:100%; background-color:#EFF6FF; padding:16px; border-radius:16px; margin-top:10px;">
                <div style="display:table-cell; vertical-align:middle;">
                   <p style="margin:0; font-size:10px; font-weight:800; color:#1A6FDB; text-transform:uppercase;">Estimated Cost</p>
                   <p style="margin:2px 0 0; font-size:18px; font-weight:900; color:#0D2E6E;">₹${data.price || 'N/A'}</p>
                </div>
                <div style="display:table-cell; text-align:right; vertical-align:middle;">
                   <p style="margin:0; font-size:10px; font-weight:800; color:#1A6FDB; text-transform:uppercase;">Payment Mode</p>
                   <p style="margin:2px 0 0; font-size:13px; font-weight:700; color:#1e40af;">${data.paymentMode || 'COD'}</p>
                </div>
            </div>
        </div>
        <div style="text-align:center; padding-top:20px;">
            <a href="#" style="font-size:14px; font-weight:700; color:#1A6FDB; text-decoration:none;">Manage Booking in App →</a>
        </div>
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
