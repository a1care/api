import crypto from "crypto";
import { Order, PaymentLog, OrderStatus, PaymentTransaction, PaymentStatus } from "./payment.model.js";
import { ApiError } from "../../utils/ApiError.js";
import axios from "axios";

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
        udf1 = "", udf2 = "", udf3 = "", udf4 = "", udf5 = "",
        udf6 = "", udf7 = "", udf8 = "", udf9 = "", udf10 = "" 
    } = params;
    
    // Easebuzz formatting: force 2 decimals for hash consistency
    const formattedAmount = Number(amount).toFixed(2);
    
    // Key order: key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5|udf6|udf7|udf8|udf9|udf10|salt
    const hashString = `${this.config.merchantKey}|${txnid}|${formattedAmount}|${productinfo}|${firstname}|${email}|${udf1}|${udf2}|${udf3}|${udf4}|${udf5}|${udf6}|${udf7}|${udf8}|${udf9}|${udf10}|${this.config.salt}`;
    
    console.log(`\n🔐 [Easebuzz Hash Debug]`);
    console.log(`Raw: ${hashString}`);
    
    return crypto.createHash("sha512").update(hashString).digest("hex");
  }

  async initiatePaymentApi(params: any): Promise<any> {
    const apiEndpoint = this.config.env === "test" 
      ? "https://testpay.easebuzz.in/payment/initiateLink" 
      : "https://pay.easebuzz.in/payment/initiateLink";

    const hash = this.generateHash(params);
    
    // Prepare form data for server-to-server POST
    const formData = new URLSearchParams();
    formData.append("key", this.config.merchantKey);
    formData.append("hash", hash);

    // Synchronize Body with Hash: ALL 10 UDFs must be present
    const finalParams = { ...params };
    
    // Force 2 decimals in body to match hash exactly
    if (finalParams.amount) finalParams.amount = Number(finalParams.amount).toFixed(2);
    
    // Sanitize Phone: Easebuzz requires exactly 10 digits
    if (finalParams.phone) {
        finalParams.phone = finalParams.phone.toString().replace(/[^0-9]/g, '').slice(-10);
    }

    // Ensure all 10 UDFs exist in body
    for (let i = 1; i <= 10; i++) {
        const key = `udf${i}`;
        formData.append(key, finalParams[key] || "");
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
    const { key, txnid, amount, productinfo, firstname, email, udf1 = "", udf2 = "", udf3 = "", udf4 = "", udf5 = "", status, hash } = response;
    const formattedAmount = Number(amount).toFixed(2);
    // Response hash order: salt|status|udf10|udf9|udf8|udf7|udf6|udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key
    const hashString = `${this.config.salt}|${status}|||||${udf5}|${udf4}|${udf3}|${udf2}|${udf1}|${email}|${firstname}|${productinfo}|${formattedAmount}|${txnid}|${key}`;
    const generatedHash = crypto.createHash("sha512").update(hashString).digest("hex");
    
    console.log(`\n🔐 [Easebuzz Response Hash Debug]`);
    console.log(`Raw: ${hashString}`);
    console.log(`Status: ${status} | Hash: ${hash?.slice(0, 10)}... | Generated: ${generatedHash?.slice(0, 10)}...`);

    return generatedHash === hash;
  }

  async verifyTransactionStatus(txnid: string): Promise<any> {
    const apiEndpoint = this.config.env === "test" 
      ? "https://testpay.easebuzz.in/transaction/v1/retrieve" 
      : "https://pay.easebuzz.in/transaction/v1/retrieve";

    // Build the request hash: key|txnid|amount|email|phone|salt
    const order = await Order.findOne({ txnId: txnid }).populate('userId');
    if (!order) throw new ApiError(404, "Order not found for status verification");

    try {
        const hashString = `${this.config.merchantKey}|${txnid}|${this.config.salt}`;
        const hash = crypto.createHash("sha512").update(hashString).digest("hex");

        console.log(`\n🔍 [Easebuzz Inquiry Debug]`);
        console.log(`   Key: ${this.config.merchantKey}`);
        console.log(`   Txn: ${txnid}`);
        console.log(`   Salt: ${this.config.salt?.slice(0, 3)}...`);
        console.log(`   Hash: ${hash.slice(0, 10)}...`);
        
        const params = new URLSearchParams();
        params.append("key", this.config.merchantKey.trim());
        params.append("txnid", txnid.trim());
        params.append("hash", hash.trim());

        const response = await axios.post(apiEndpoint, params.toString(), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        console.log(`📥 [Easebuzz Inquiry Raw]`, JSON.stringify(response.data, null, 2));
        return response.data;
    } catch (error: any) {
        await this.logEvent(txnid, "STATUS_VERIFICATION_FAILED", "ERROR", error.message);
        throw new ApiError(500, "Could not verify transaction with Easebuzz");
    }
  }

  async logEvent(txnId: string, event: string, level: "INFO" | "WARN" | "ERROR", message: string, metadata?: any) {
    return PaymentLog.create({ txnId, event, level, message, metadata });
  }
}
