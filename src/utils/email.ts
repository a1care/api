import nodemailer from "nodemailer";
import { getSystemSettings } from "../modules/Admin/admin.controller.js";
import { EmailTemplate } from "../modules/EmailTemplates/emailTemplate.model.js";

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

const escapeHtml = (unsafe: string | undefined | null | number) => {
    if (unsafe === undefined || unsafe === null) return '';
    return String(unsafe)
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
};

const baseTemplate = (title: string, body: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)} - A1Care</title>
</head>
<body style="margin:0;padding:0;background-color:#F5F7FA;font-family:Inter, Arial, Helvetica, sans-serif;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#F5F7FA;padding:24px 0;">
        <tr>
            <td align="center">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:620px;background-color:#F5F7FA;">
                    <!-- HEADER -->
                    <tr>
                        <td style="padding:16px 20px 24px;text-align:center;">
                            <h1 style="color:#0F172A;margin:0;font-size:24px;font-weight:700;letter-spacing:-0.5px;">A1Care <span style="color:#3B82F6;">24/7</span></h1>
                            <p style="color:#64748B;margin:4px 0 0;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;">Premium Healthcare at Home</p>
                        </td>
                    </tr>
                    <!-- BODY CONTENT -->
                    <tr>
                        <td style="padding:0 20px;">
                            ${body}
                        </td>
                    </tr>
                    <!-- FOOTER -->
                    <tr>
                        <td style="padding:32px 20px;text-align:center;border-top:1px solid #E5E7EB;margin-top:24px;">
                            <p style="color:#64748B;margin:0 0 8px;font-size:12px;">© ${new Date().getFullYear()} A1Care 24/7. All rights reserved.<br/>Hitech City, Hyderabad, India</p>
                            <div>
                                <a href="https://a1care.in/terms" style="color:#64748B;text-decoration:none;font-size:12px;margin:0 4px;">Terms</a>
                                <span style="color:#CBD5E1;">•</span>
                                <a href="https://a1care.in/privacy" style="color:#64748B;text-decoration:none;font-size:12px;margin:0 4px;">Privacy</a>
                                <span style="color:#CBD5E1;">•</span>
                                <a href="https://a1care.in/support" style="color:#64748B;text-decoration:none;font-size:12px;margin:0 4px;">Support</a>
                            </div>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;

const getDynamicTemplate = async (code: string, fallbackSubject: string, fallbackBody: string, data: Record<string, any>) => {
    let subject = fallbackSubject;
    let body = fallbackBody;

    try {
        const template = await EmailTemplate.findOne({ code }).lean();
        if (template && template.htmlBody && template.htmlBody.includes("{{")) {
            subject = template.subject || fallbackSubject;
            body = template.htmlBody;
        }
    } catch (error) {
        console.error(`[EmailTemplate] Failed to fetch template for ${code}`, error);
    }

    for (const [key, value] of Object.entries(data)) {
        const regex = new RegExp(`{{${key}}}`, 'g');
        const strVal = escapeHtml(value);
        subject = subject.replace(regex, strVal);
        body = body.replace(regex, strVal);
    }

    return { subject, body };
};

// --- Reusable UI Components ---

const renderStatusBadge = (status: string, semanticType: "SUCCESS" | "WARNING" | "CRITICAL" | "INFO") => {
    let bg, color;
    switch (semanticType) {
        case "SUCCESS": bg = "#DCFCE7"; color = "#166534"; break;
        case "WARNING": bg = "#FEF3C7"; color = "#92400E"; break;
        case "CRITICAL": bg = "#FEE2E2"; color = "#991B1B"; break;
        case "INFO": bg = "#DBEAFE"; color = "#1E40AF"; break;
    }
    return `<span style="display:inline-block;padding:4px 10px;border-radius:999px;background-color:${bg};color:${color};font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">${escapeHtml(status)}</span>`;
};

const renderCTA = (url: string, label: string) => {
    if (!url) return '';
    return `
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;margin-bottom:24px;">
            <tr>
                <td align="center">
                    <a href="${url}" style="display:inline-block;background-color:#2563EB;color:#FFFFFF;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;min-width:200px;text-align:center;">${escapeHtml(label)}</a>
                </td>
            </tr>
        </table>
    `;
};

const renderHero = (title: string, subtitle: string, customerName?: string) => `
    <div style="text-align:center;padding:16px 20px 24px;">
        <h2 style="margin:0 0 12px;font-size:26px;font-weight:700;color:#0F172A;letter-spacing:-0.5px;">${escapeHtml(title)}</h2>
        ${customerName && customerName !== 'Customer' ? `<p style="margin:0 0 8px;font-size:16px;color:#475569;">Hello ${escapeHtml(customerName)},</p>` : ''}
        <p style="margin:0;font-size:15px;color:#64748B;">${escapeHtml(subtitle)}</p>
    </div>
`;

// --- Scenarios ---

export const sendWelcomeEmail = async (data: { email: string; fullName: string }) => {
    const body = `
        ${renderHero("Welcome to A1Care 24/7", "Your account has been successfully created.", data.fullName)}
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#FFFFFF;border-radius:12px;border:1px solid #E5E7EB;margin-bottom:24px;padding:24px;">
            <tr>
                <td align="center">
                    <p style="margin:0 0 16px;font-size:15px;color:#334155;">We bring professional medical care right to your doorstep, whenever you need it.</p>
                </td>
            </tr>
        </table>
        ${renderCTA("https://a1care.in/app", "Explore A1Care")}
    `;
    return sendEmail({ to: data.email, subject: "Welcome to A1Care 24/7", html: baseTemplate("Welcome", body) });
};

export const sendAppointmentConfirmationEmail = async (data: { 
    email: string; 
    fullName: string; 
    serviceName: string; 
    bookingId: string;
    bookingStatus: string;
    serviceCategory?: string | undefined;
    date?: string | undefined; 
    time?: string | undefined; 
    patientAddress?: string | undefined;
    partnerName?: string | undefined;
    doctorName?: string | undefined;
    hospitalName?: string | undefined;
    serviceAmount?: number | undefined;
    discountAmount?: number | undefined;
    totalAmount?: number | undefined;
    paymentMethod?: string | undefined;
    isOP?: boolean | undefined;
}) => {
    const rawStatus = (data.bookingStatus || 'PENDING').toUpperCase();
    let badgeType: "SUCCESS" | "WARNING" | "CRITICAL" | "INFO" = "INFO";
    if (rawStatus === 'CONFIRMED' || rawStatus === 'COMPLETED') badgeType = "SUCCESS";
    else if (rawStatus === 'PENDING') badgeType = "WARNING";
    else if (rawStatus === 'CANCELLED') badgeType = "CRITICAL";

    const titleMap: Record<string, string> = {
        'CONFIRMED': 'Booking Confirmed',
        'PENDING': 'Booking Received',
        'ASSIGNED': 'Provider Assigned',
        'IN_PROGRESS': 'Service In Progress',
        'COMPLETED': 'Booking Completed',
        'CANCELLED': 'Booking Cancelled',
    };
    const heroTitle = titleMap[rawStatus] || 'Booking Update';
    const heroSubtitle = rawStatus === 'CONFIRMED' ? 'Your appointment has been successfully booked.' : 'There is an update to your booking.';

    const renderProvider = () => {
        const name = data.doctorName || data.hospitalName || data.partnerName;
        const type = data.doctorName ? 'Doctor' : data.hospitalName ? 'Hospital' : data.partnerName ? 'Provider' : null;
        if (!name) return '';
        return `<tr><td colspan="2" style="padding-top:16px;border-top:1px solid #F1F5F9;margin-top:16px;"><p style="margin:0;font-size:12px;font-weight:600;color:#64748B;text-transform:uppercase;">${type}</p><p style="margin:4px 0 0;font-size:15px;font-weight:600;color:#0F172A;">${escapeHtml(name)}</p></td></tr>`;
    };

    const renderPayment = () => {
        if (data.totalAmount === undefined || data.totalAmount === null) return '';
        let html = `
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#FFFFFF;border-radius:12px;border:1px solid #E5E7EB;margin-bottom:24px;padding:24px;">
            <tr><td colspan="2" style="padding-bottom:16px;"><p style="margin:0;font-size:12px;font-weight:600;color:#64748B;text-transform:uppercase;letter-spacing:0.05em;">Payment Summary</p></td></tr>
        `;
        if (data.discountAmount && data.discountAmount > 0 && data.serviceAmount !== undefined) {
            html += `
            <tr>
                <td style="padding-bottom:12px;font-size:14px;color:#475569;">Service Amount</td>
                <td align="right" style="padding-bottom:12px;font-size:14px;color:#0F172A;font-weight:600;">₹${escapeHtml(data.serviceAmount)}</td>
            </tr>
            <tr>
                <td style="padding-bottom:16px;font-size:14px;color:#475569;">Discount</td>
                <td align="right" style="padding-bottom:16px;font-size:14px;color:#059669;font-weight:600;">-₹${escapeHtml(data.discountAmount)}</td>
            </tr>
            <tr><td colspan="2" style="border-top:1px solid #F1F5F9;padding-top:16px;"></td></tr>
            `;
        }
        html += `
            <tr>
                <td style="font-size:14px;font-weight:700;color:#0F172A;">TOTAL</td>
                <td align="right" style="font-size:16px;font-weight:800;color:#0F172A;">₹${escapeHtml(data.totalAmount)}</td>
            </tr>
        `;
        if (data.paymentMethod) {
            html += `
            <tr>
                <td style="padding-top:16px;font-size:14px;color:#475569;">Payment Method</td>
                <td align="right" style="padding-top:16px;font-size:14px;color:#0F172A;font-weight:600;">${escapeHtml(data.paymentMethod)}</td>
            </tr>
            `;
        }
        html += `</table>`;
        return html;
    };

    const bookingUrl = `https://a1care.in/app/bookings/${encodeURIComponent(data.bookingId)}`;

    const body = `
        ${renderHero(heroTitle, heroSubtitle, data.fullName)}
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#FFFFFF;border-radius:12px;border:1px solid #E5E7EB;margin-bottom:16px;padding:24px;">
            <tr>
                <td colspan="2" style="padding-bottom:16px;border-bottom:1px solid #F1F5F9;">
                    <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:#3B82F6;text-transform:uppercase;letter-spacing:0.05em;">${escapeHtml(data.serviceCategory || (data.isOP ? 'Hospital Visit' : 'Home Service'))}</p>
                    <p style="margin:0 0 16px;font-size:18px;font-weight:700;color:#0F172A;">${escapeHtml(data.serviceName)}</p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                            <td width="50%">
                                <p style="margin:0;font-size:12px;font-weight:600;color:#64748B;text-transform:uppercase;">Status</p>
                                <div style="margin-top:4px;">${renderStatusBadge(rawStatus, badgeType)}</div>
                            </td>
                            <td width="50%">
                                <p style="margin:0;font-size:12px;font-weight:600;color:#64748B;text-transform:uppercase;">Booking ID</p>
                                <p style="margin:4px 0 0;font-size:14px;font-weight:600;color:#0F172A;">#${escapeHtml(data.bookingId.slice(-8).toUpperCase())}</p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
            <tr>
                <td colspan="2" style="padding-top:16px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                            <td width="50%">
                                <p style="margin:0;font-size:12px;font-weight:600;color:#64748B;text-transform:uppercase;">Date</p>
                                <p style="margin:4px 0 0;font-size:14px;font-weight:600;color:#0F172A;">${escapeHtml(data.date || 'TBD')}</p>
                            </td>
                            <td width="50%">
                                <p style="margin:0;font-size:12px;font-weight:600;color:#64748B;text-transform:uppercase;">Time</p>
                                <p style="margin:4px 0 0;font-size:14px;font-weight:600;color:#0F172A;">${escapeHtml(data.time || 'TBD')}</p>
                            </td>
                        </tr>
                        ${renderProvider()}
                    </table>
                </td>
            </tr>
        </table>
        ${data.patientAddress ? `
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#FFFFFF;border-radius:12px;border:1px solid #E5E7EB;margin-bottom:16px;padding:24px;">
            <tr>
                <td>
                    <p style="margin:0;font-size:12px;font-weight:600;color:#64748B;text-transform:uppercase;letter-spacing:0.05em;">Service Location</p>
                    <p style="margin:8px 0 0;font-size:14px;color:#334155;line-height:1.5;">📍 ${escapeHtml(data.patientAddress)}</p>
                </td>
            </tr>
        </table>` : ''}
        ${renderPayment()}
        ${renderCTA(bookingUrl, "View Booking")}
    `;
    return sendEmail({ to: data.email, subject: `${heroTitle}: ${data.serviceName}`, html: baseTemplate("Booking Confirmation", body) });
};

export const sendServiceCompletedEmail = async (
    email: string,
    fullName: string,
    serviceName: string,
    partnerName: string,
    amount: number | string,
    date: string
) => {
    const body = `
        ${renderHero("Service Completed", "Your healthcare service has been successfully completed.", fullName)}
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#FFFFFF;border-radius:12px;border:1px solid #E5E7EB;margin-bottom:24px;padding:24px;">
            <tr>
                <td colspan="2" style="padding-bottom:16px;border-bottom:1px solid #F1F5F9;">
                    <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#64748B;text-transform:uppercase;letter-spacing:0.05em;">Service</p>
                    <p style="margin:0;font-size:16px;font-weight:700;color:#0F172A;">${escapeHtml(serviceName)}</p>
                </td>
            </tr>
            <tr>
                <td width="50%" style="padding-top:16px;">
                    <p style="margin:0;font-size:12px;font-weight:600;color:#64748B;text-transform:uppercase;">Provider</p>
                    <p style="margin:4px 0 0;font-size:14px;font-weight:600;color:#0F172A;">${escapeHtml(partnerName)}</p>
                </td>
                <td width="50%" style="padding-top:16px;">
                    <p style="margin:0;font-size:12px;font-weight:600;color:#64748B;text-transform:uppercase;">Date</p>
                    <p style="margin:4px 0 0;font-size:14px;font-weight:600;color:#0F172A;">${escapeHtml(date)}</p>
                </td>
            </tr>
            ${amount !== undefined && amount !== null ? `
            <tr>
                <td colspan="2" style="padding-top:16px;border-top:1px solid #F1F5F9;margin-top:16px;">
                    <p style="margin:0;font-size:12px;font-weight:600;color:#64748B;text-transform:uppercase;">Final Amount</p>
                    <p style="margin:4px 0 0;font-size:20px;font-weight:800;color:#0F172A;">₹${escapeHtml(amount)}</p>
                </td>
            </tr>` : ''}
        </table>
        ${renderCTA("https://a1care.in/app/bookings", "View Booking")}
    `;
    return sendEmail({ to: email, subject: `Service Completed: ${serviceName}`, html: baseTemplate("Service Completed", body) });
};

export const sendRefundConfirmationEmail = async (
    email: string,
    fullName: string,
    amount: number | string,
    serviceName: string,
    bookingId: string
) => {
    const bookingUrl = `https://a1care.in/app/bookings/${encodeURIComponent(bookingId)}`;
    const body = `
        ${renderHero("Refund Processed", "Your refund has been processed successfully.", fullName)}
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#FFFFFF;border-radius:12px;border:1px solid #E5E7EB;margin-bottom:24px;padding:24px;">
            <tr>
                <td style="text-align:center;padding-bottom:16px;border-bottom:1px solid #F1F5F9;">
                    <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:#64748B;text-transform:uppercase;letter-spacing:0.05em;">Refund Amount</p>
                    <p style="margin:0;font-size:32px;font-weight:800;color:#059669;">₹${escapeHtml(amount)}</p>
                    <div style="margin-top:8px;">${renderStatusBadge("PROCESSED", "SUCCESS")}</div>
                </td>
            </tr>
            <tr>
                <td style="padding-top:16px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                            <td width="50%">
                                <p style="margin:0;font-size:12px;font-weight:600;color:#64748B;text-transform:uppercase;">Original Service</p>
                                <p style="margin:4px 0 0;font-size:14px;font-weight:600;color:#0F172A;">${escapeHtml(serviceName)}</p>
                            </td>
                            <td width="50%">
                                <p style="margin:0;font-size:12px;font-weight:600;color:#64748B;text-transform:uppercase;">Booking ID</p>
                                <p style="margin:4px 0 0;font-size:14px;font-weight:600;color:#0F172A;">#${escapeHtml(bookingId.slice(-8).toUpperCase())}</p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
        ${renderCTA(bookingUrl, "View Booking")}
    `;
    return sendEmail({ to: email, subject: `Refund Processed: ₹${amount}`, html: baseTemplate("Refund Processed", body) });
};

export const sendWalletTopupEmail = async (data: { email: string; fullName: string; amount: string; txnid: string }) => {
    const body = `
        ${renderHero("Wallet Top-up Successful", "We've successfully credited your A1Care wallet.", data.fullName)}
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#FFFFFF;border-radius:12px;border:1px solid #E5E7EB;margin-bottom:24px;padding:24px;">
            <tr>
                <td style="text-align:center;padding-bottom:16px;border-bottom:1px solid #F1F5F9;">
                    <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:#64748B;text-transform:uppercase;letter-spacing:0.05em;">Amount Added</p>
                    <p style="margin:0;font-size:32px;font-weight:800;color:#0F172A;">₹${escapeHtml(data.amount)}</p>
                    <div style="margin-top:8px;">${renderStatusBadge("SUCCESS", "SUCCESS")}</div>
                </td>
            </tr>
            <tr>
                <td style="padding-top:16px;text-align:center;">
                    <p style="margin:0;font-size:12px;font-weight:600;color:#64748B;text-transform:uppercase;">Transaction ID</p>
                    <p style="margin:4px 0 0;font-size:14px;font-weight:600;color:#0F172A;">${escapeHtml(data.txnid)}</p>
                </td>
            </tr>
        </table>
        ${renderCTA("https://a1care.in/app/wallet", "View Wallet")}
    `;
    return sendEmail({ to: data.email, subject: `Wallet Top-up Successful: ₹${data.amount}`, html: baseTemplate("Wallet Top-up", body) });
};

export const sendTicketReceiptEmail = async (data: {
    email: string;
    fullName: string;
    subject: string;
    ticketId: string;
    priority: string;
}) => {
    let badgeType: "SUCCESS" | "WARNING" | "CRITICAL" | "INFO" = "INFO";
    const prio = data.priority.toUpperCase();
    if (prio === 'HIGH' || prio === 'CRITICAL') badgeType = "CRITICAL";
    else if (prio === 'MEDIUM') badgeType = "WARNING";

    const ticketUrl = `https://a1care.in/app/support/tickets/${encodeURIComponent(data.ticketId)}`;

    const body = `
        ${renderHero("Ticket Received", "We've received your support request.", data.fullName)}
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#FFFFFF;border-radius:12px;border:1px solid #E5E7EB;margin-bottom:24px;padding:24px;">
            <tr>
                <td colspan="2" style="padding-bottom:16px;border-bottom:1px solid #F1F5F9;">
                    <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#64748B;text-transform:uppercase;letter-spacing:0.05em;">Subject</p>
                    <p style="margin:0;font-size:16px;font-weight:700;color:#0F172A;">${escapeHtml(data.subject)}</p>
                </td>
            </tr>
            <tr>
                <td width="50%" style="padding-top:16px;">
                    <p style="margin:0;font-size:12px;font-weight:600;color:#64748B;text-transform:uppercase;">Ticket ID</p>
                    <p style="margin:4px 0 0;font-size:14px;font-weight:600;color:#0F172A;">#${escapeHtml(data.ticketId)}</p>
                </td>
                <td width="50%" style="padding-top:16px;">
                    <p style="margin:0;font-size:12px;font-weight:600;color:#64748B;text-transform:uppercase;">Priority</p>
                    <div style="margin-top:4px;">${renderStatusBadge(data.priority, badgeType)}</div>
                </td>
            </tr>
        </table>
        ${renderCTA(ticketUrl, "View Ticket")}
    `;
    return sendEmail({ to: data.email, subject: `Support Ticket Received: #${data.ticketId}`, html: baseTemplate("Support Ticket", body) });
};

export const sendPartnerWelcomeEmail = async (data: { email: string; fullName: string }) => {
    let { subject, body } = await getDynamicTemplate(
        "partner_welcome", 
        "Welcome to A1Care Partner Network", 
        `
        ${renderHero("Welcome to A1Care", "Your partner registration has been received.", data.fullName)}
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#FFFFFF;border-radius:12px;border:1px solid #E5E7EB;margin-bottom:24px;padding:24px;">
            <tr>
                <td align="center">
                    <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:#64748B;text-transform:uppercase;">Profile Status</p>
                    ${renderStatusBadge("KYC UNDER REVIEW", "WARNING")}
                    <p style="margin:16px 0 0;font-size:14px;color:#475569;">Our team is currently verifying your details. You will be notified once your profile is approved.</p>
                </td>
            </tr>
        </table>
        ${renderCTA("https://a1care.in/app/partner", "Open Partner Dashboard")}
        `, 
        data
    );
    return sendEmail({ to: data.email, subject, html: baseTemplate("Partner Welcome", body) });
};

export const sendPartnerApprovalEmail = async (data: { email: string; fullName: string }) => {
    let { subject, body } = await getDynamicTemplate(
        "partner_approved",
        "A1Care Partner Application Approved",
        `
        ${renderHero("Partner Approved", "Congratulations, your profile has been approved.", data.fullName)}
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#FFFFFF;border-radius:12px;border:1px solid #E5E7EB;margin-bottom:24px;padding:24px;">
            <tr>
                <td align="center">
                    ${renderStatusBadge("APPROVED", "SUCCESS")}
                    <p style="margin:16px 0 0;font-size:14px;color:#475569;">You can now accept eligible service requests and manage your bookings through the partner dashboard.</p>
                </td>
            </tr>
        </table>
        ${renderCTA("https://a1care.in/app/partner", "Open Partner Dashboard")}
        `,
        data
    );
    return sendEmail({ to: data.email, subject, html: baseTemplate("Partner Approved", body) });
};

export const sendPartnerRejectionEmail = async (data: { email: string; fullName: string; reason: string }) => {
    let { subject, body } = await getDynamicTemplate(
        "partner_rejected",
        "KYC Review Update",
        `
        ${renderHero("Profile Review Update", "Your partner application requires attention.", data.fullName)}
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#FFFFFF;border-radius:12px;border:1px solid #E5E7EB;margin-bottom:24px;padding:24px;">
            <tr>
                <td align="center" style="padding-bottom:16px;border-bottom:1px solid #F1F5F9;">
                    <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:#64748B;text-transform:uppercase;">Status</p>
                    ${renderStatusBadge("REJECTED", "CRITICAL")}
                </td>
            </tr>
            ${data.reason ? `
            <tr>
                <td style="padding-top:16px;">
                    <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#991B1B;text-transform:uppercase;">Reason</p>
                    <p style="margin:0;font-size:14px;color:#7F1D1D;font-weight:600;">${escapeHtml(data.reason)}</p>
                </td>
            </tr>` : ''}
        </table>
        ${renderCTA("https://a1care.in/app/partner", "Review Profile")}
        `,
        data
    );
    return sendEmail({ to: data.email, subject, html: baseTemplate("Partner Rejected", body) });
};

export const sendPayoutStatusEmail = async (
    email: string,
    fullName: string,
    amount: number | string,
    status: string,
    adminNote?: string
) => {
    const rawStatus = (status || '').toUpperCase();
    let badgeType: "SUCCESS" | "WARNING" | "CRITICAL" | "INFO" = "INFO";
    if (rawStatus === 'PROCESSED') badgeType = "SUCCESS";
    else if (rawStatus === 'PENDING' || rawStatus === 'PROCESSING') badgeType = "WARNING";
    else if (rawStatus === 'FAILED' || rawStatus === 'REJECTED') badgeType = "CRITICAL";

    const body = `
        ${renderHero("Payout Update", `Your payout is currently ${rawStatus.toLowerCase()}.`, fullName)}
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#FFFFFF;border-radius:12px;border:1px solid #E5E7EB;margin-bottom:24px;padding:24px;">
            <tr>
                <td style="text-align:center;padding-bottom:16px;border-bottom:1px solid #F1F5F9;">
                    <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:#64748B;text-transform:uppercase;letter-spacing:0.05em;">Payout Amount</p>
                    <p style="margin:0;font-size:32px;font-weight:800;color:#0F172A;">₹${escapeHtml(amount)}</p>
                    <div style="margin-top:8px;">${renderStatusBadge(rawStatus, badgeType)}</div>
                </td>
            </tr>
            ${adminNote ? `
            <tr>
                <td style="padding-top:16px;">
                    <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#64748B;text-transform:uppercase;">Note</p>
                    <p style="margin:0;font-size:14px;color:#475569;">${escapeHtml(adminNote)}</p>
                </td>
            </tr>` : ''}
        </table>
        ${renderCTA("https://a1care.in/app/partner/earnings", "View Earnings")}
    `;
    return sendEmail({ to: email, subject: `Payout Update: ${rawStatus} - A1Care Partner`, html: baseTemplate("Payout Update", body) });
};

// --- Untouched/Non-10-Scenario functions kept for compatibility ---

export const sendJobAcknowledgmentEmail = async (data: { email: string; fullName: string; jobTitle: string }) => {
    const body = `
        ${renderHero("Application Received", "We have received your application.", data.fullName)}
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#FFFFFF;border-radius:12px;border:1px solid #E5E7EB;margin-bottom:24px;padding:24px;">
            <tr>
                <td>
                    <p style="margin:0;font-size:14px;color:#475569;">Thank you for applying for the <strong>${escapeHtml(data.jobTitle)}</strong> position. Our team is currently reviewing it.</p>
                </td>
            </tr>
        </table>
    `;
    return sendEmail({ to: data.email, subject: `Application Received: ${data.jobTitle}`, html: baseTemplate("Application Received", body) });
};

export const sendOTPFallbackEmail = async (data: { email: string; otp: string }) => {
    const body = `
        ${renderHero("Verification Code", "Use the following code to complete your verification.", "User")}
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#FFFFFF;border-radius:12px;border:1px solid #E5E7EB;margin-bottom:24px;padding:24px;">
            <tr>
                <td align="center">
                    <p style="margin:0;font-size:36px;font-weight:900;letter-spacing:10px;color:#2563EB;">${escapeHtml(data.otp)}</p>
                </td>
            </tr>
        </table>
    `;
    return sendEmail({ to: data.email, subject: "A1Care Verification Code", html: baseTemplate("Security Code", body) });
};

export const sendInvoiceReceiptEmail = async (data: {
    email: string;
    fullName: string;
    serviceName: string;
    bookingId: string;
    date: string;
    subtotal: number | string;
    tax: number | string;
    discount?: number | string;
    totalAmount: number | string;
    paymentMode: string;
}) => {
    const body = `
        ${renderHero("Payment Receipt", "Thank you for choosing A1Care 24/7.", data.fullName)}
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#FFFFFF;border-radius:12px;border:1px solid #E5E7EB;margin-bottom:24px;padding:24px;">
            <tr>
                <td colspan="2" style="padding-bottom:16px;border-bottom:1px solid #F1F5F9;">
                    <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:#3B82F6;text-transform:uppercase;letter-spacing:0.05em;">${escapeHtml(data.serviceName)}</p>
                    <p style="margin:0 0 4px;font-size:12px;color:#64748B;">ID: ${escapeHtml(data.bookingId)}</p>
                </td>
            </tr>
            <tr>
                <td style="padding-top:16px;padding-bottom:12px;font-size:14px;color:#475569;">Subtotal</td>
                <td align="right" style="padding-top:16px;padding-bottom:12px;font-size:14px;color:#0F172A;font-weight:600;">₹${escapeHtml(data.subtotal)}</td>
            </tr>
            <tr>
                <td style="padding-bottom:12px;font-size:14px;color:#475569;">Taxes & Fees</td>
                <td align="right" style="padding-bottom:12px;font-size:14px;color:#0F172A;font-weight:600;">₹${escapeHtml(data.tax)}</td>
            </tr>
            ${data.discount ? `
            <tr>
                <td style="padding-bottom:16px;font-size:14px;color:#475569;">Discount</td>
                <td align="right" style="padding-bottom:16px;font-size:14px;color:#059669;font-weight:600;">-₹${escapeHtml(data.discount)}</td>
            </tr>` : ''}
            <tr><td colspan="2" style="border-top:1px solid #F1F5F9;padding-top:16px;"></td></tr>
            <tr>
                <td style="font-size:14px;font-weight:700;color:#0F172A;">TOTAL (via ${escapeHtml(data.paymentMode)})</td>
                <td align="right" style="font-size:16px;font-weight:800;color:#0F172A;">₹${escapeHtml(data.totalAmount)}</td>
            </tr>
        </table>
    `;
    return sendEmail({ to: data.email, subject: `Payment Receipt: ${data.serviceName}`, html: baseTemplate("Payment Receipt", body) });
};
