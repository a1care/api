import crypto from "crypto";
import { Order, PaymentLog, OrderStatus, PaymentTransaction, PaymentStatus } from "./payment.model.js";
import { ApiError } from "../../utils/ApiError.js";
import axios from "axios";
import fs from "fs";
import path from "path";

export interface EasebuzzConfig {
  merchantKey: string;
  salt: string;
  env: "test" | "prod";
}

export class EasebuzzService {
  private config: EasebuzzConfig;

  constructor(config: EasebuzzConfig) {
    this.config = config;
  }

  generateHash(params: any): string {
    const { 
        txnid, amount, productinfo, firstname, email, 
    } = params;
    
    const udf1 = (params.udf1 || "").toString().trim();
    const udf2 = (params.udf2 || "").toString().trim();
    const udf3 = (params.udf3 || "").toString().trim();
    const udf4 = (params.udf4 || "").toString().trim();
    const udf5 = (params.udf5 || "").toString().trim();
    const udf6 = (params.udf6 || "").toString().trim();
    const udf7 = (params.udf7 || "").toString().trim();
    const udf8 = (params.udf8 || "").toString().trim();
    const udf9 = (params.udf9 || "").toString().trim();
    const udf10 = (params.udf10 || "").toString().trim();
    
    const formattedAmount = Number(amount).toFixed(2);
    const hashString = `${this.config.merchantKey.trim()}|${txnid.trim()}|${formattedAmount}|${productinfo.trim()}|${firstname.trim()}|${email.trim()}|${udf1}|${udf2}|${udf3}|${udf4}|${udf5}|${udf6}|${udf7}|${udf8}|${udf9}|${udf10}|${this.config.salt.trim()}`;
    
    return crypto.createHash("sha512").update(hashString).digest("hex");
  }

  async initiatePaymentApi(params: any): Promise<any> {
    const apiEndpoint = this.config.env === "test" 
      ? "https://testpay.easebuzz.in/payment/initiateLink" 
      : "https://pay.easebuzz.in/payment/initiateLink";

    const hash = this.generateHash(params);
    
    // Prepare form data for server-to-server POST
    const formData = new URLSearchParams();
    formData.append("key", this.config.merchantKey.trim());
    formData.append("hash", hash);

    const finalParams = { ...params };
    if (finalParams.amount) finalParams.amount = Number(finalParams.amount).toFixed(2);
    if (finalParams.phone) {
        finalParams.phone = finalParams.phone.toString().replace(/[^0-9]/g, '').slice(-10);
    }

    // Ensure all 10 UDFs exist in body and match hash
    for (let i = 1; i <= 10; i++) {
        const key = `udf${i}`;
        formData.append(key, (finalParams[key] || "").toString().trim());
    }

    console.log(`\n📤 [Easebuzz API Request] to ${apiEndpoint}`);
    console.log(`Key: ${this.config.merchantKey} | Hash: ${hash.slice(0, 10)}...`);

    // Append other mandatory fields
    const mandatory = ["txnid", "amount", "productinfo", "firstname", "email", "phone", "surl", "furl"];
    mandatory.forEach(key => {
        if (finalParams[key] !== undefined) {
            formData.append(key, finalParams[key]);
            console.log(`   ${key}: ${finalParams[key]}`);
        }
    });

    try {
        const response = await axios.post(apiEndpoint, formData, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        
        // Detailed logging for Status 0 errors
        if (response.data.status === 0) {
            console.error("🔴 Easebuzz API Rejection:", JSON.stringify(response.data, null, 2));
        }

        return response.data;
    } catch (error: any) {
        console.error("Easebuzz Initiation Error:", error.response?.data || error.message);
        throw new ApiError(500, "Failed to initiate payment with Easebuzz");
    }
  }

  verifyResponseHash(response: any): boolean {
    const { 
        status, hash, amount, txnid, key, email, firstname, productinfo,
        udf1 = "", udf2 = "", udf3 = "", udf4 = "", udf5 = "",
        udf6 = "", udf7 = "", udf8 = "", udf9 = "", udf10 = "" 
    } = response;
    
    if (!hash) return false;
    const formattedAmount = Number(amount).toFixed(2);
    
    // Return Hash Order: salt|status|udf10|udf9|udf8|udf7|udf6|udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key
    // There are 5 empty slots between status and udf5: udf10, udf9, udf8, udf7, udf6
    const hashString = `${this.config.salt.trim()}|${status}|${udf10}|${udf9}|${udf8}|${udf7}|${udf6}|${udf5}|${udf4}|${udf3}|${udf2}|${udf1}|${email}|${firstname}|${productinfo}|${formattedAmount}|${txnid}|${key}`;
    const generatedHash = crypto.createHash("sha512").update(hashString).digest("hex");
    
    console.log(`\n🔐 [Easebuzz Response Hash Debug]`);
    console.log(`Raw: ${hashString}`);
    console.log(`Status: ${status} | Received: ${hash} | Generated: ${generatedHash}`);

    return generatedHash === hash;
  }

  async verifyTransactionStatus(txnid: string): Promise<any> {
    const apiEndpoint = this.config.env === "test" 
      ? "https://testpay.easebuzz.in/transaction/v1/retrieve" 
      : "https://pay.easebuzz.in/transaction/v1/retrieve";

    const order = await Order.findOne({ txnId: txnid }).populate('userId');
    if (!order) throw new ApiError(404, "Order not found for status verification");

        const user = order.userId as any;
        const email = (user.email && user.email.includes("@")) ? user.email.trim() : "patient@example.com";
        const phone = (user.mobileNumber?.toString() || "9999999999").replace(/[^0-9]/g, "").slice(-10);
        const amount = Number(order.amount).toFixed(2);

        try {
            // STRATEGY 1: V5 Hash (Enhanced)
            const hashStringV5 = `${this.config.merchantKey.trim()}|${txnid.trim()}|${amount}|${email}|${phone}|${this.config.salt.trim()}`;
            const hashV5 = crypto.createHash("sha512").update(hashStringV5).digest("hex");

            // Pre-request Log
            try {
                const logPath = path.join(process.cwd(), "payment_debug.log");
                fs.appendFileSync(logPath, `\n[${new Date().toISOString()}] TRIGGERING_INQUIRY: ${txnid} | Amt: ${amount} | Email: ${email} | Phone: ${phone}\n[HashV5 String]: ${hashStringV5}\n`);
            } catch (le) { console.error("Logger Failed:", le); }

        let response = await this._doInquiry(apiEndpoint, txnid, amount, email, phone, hashV5);
        
        console.log(`🔍 [Easebuzz Inquiry Status] Order: ${txnid}`, JSON.stringify(response.data, null, 2));

        // Persistent Log
        try {
            const logPath = path.join(process.cwd(), "payment_debug.log");
            fs.appendFileSync(logPath, `\n[${new Date().toISOString()}] INQUIRY_STATUS: ${txnid} | Result: ${JSON.stringify(response.data, null, 2)}\n`);
        } catch (le) { console.error("Logger Failed:", le); }

        // Check for common failure messages that suggest we should try Strategy 2 (V1 Hash)
        const errorData = (response.data.data || "").toString();
        const errorMsg = (response.data.msg || "").toString();
        
        // Better status check: handle boolean false or status 0
        const isFailing = response.data.status === 0 || response.data.status === false || response.data.status === "0";
        
        if (isFailing && (
            errorData.includes("Hash") || 
            errorData.includes("wrong") || 
            errorMsg.includes("wrong") || 
            errorMsg.includes("Hash") ||
            errorData === "Something went wrong."
        )) {
            const hashStringV1 = `${this.config.merchantKey.trim()}|${txnid.trim()}|${this.config.salt.trim()}`;
            console.log(`⚠️ [Easebuzz Inquiry] Strategy 1 failed. Trying Strategy 2 (V1 Hash): ${hashStringV1}`);
            const hashV1 = crypto.createHash("sha512").update(hashStringV1).digest("hex");
            response = await this._doInquiry(apiEndpoint, txnid, amount, email, phone, hashV1);
            console.log(`🔍 [Easebuzz Inquiry V1 Result]`, JSON.stringify(response.data, null, 2));
            
            try {
                const logPath = path.join(process.cwd(), "payment_debug.log");
                fs.appendFileSync(logPath, `\n[${new Date().toISOString()}] INQUIRY_V1_RESULT: ${txnid} | HashV1String: ${hashStringV1} | Result: ${JSON.stringify(response.data, null, 2)}\n`);
            } catch {}
        }

        return response.data;
    } catch (error: any) {
        await this.logEvent(txnid, "STATUS_VERIFICATION_FAILED", "ERROR", error.message);
        throw new ApiError(500, `Gateway Inquiry Failed: ${error.message}`);
    }
  }

  private async _doInquiry(apiEndpoint: string, txnid: string, amount: string, email: string, phone: string, hash: string) {
    const params = new URLSearchParams();
    params.append("key", this.config.merchantKey.trim());
    params.append("txnid", txnid.trim());
    params.append("amount", amount);
    params.append("email", email);
    params.append("phone", phone);
    params.append("hash", hash.trim());

    return axios.post(apiEndpoint, params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
  }

  async logEvent(txnId: string, event: string, level: "INFO" | "WARN" | "ERROR", message: string, metadata?: any) {
    return PaymentLog.create({ txnId, event, level, message, metadata });
  }
}
