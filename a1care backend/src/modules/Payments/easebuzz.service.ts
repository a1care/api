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
    const { txnid, amount, productinfo, firstname, email, udf1 = "", udf2 = "", udf3 = "", udf4 = "", udf5 = "" } = params;
    // Key order: key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5|udf6|udf7|udf8|udf9|udf10|salt
    const hashString = `${this.config.merchantKey}|${txnid}|${amount}|${productinfo}|${firstname}|${email}|${udf1}|${udf2}|${udf3}|${udf4}|${udf5}||||||${this.config.salt}`;
    return crypto.createHash("sha512").update(hashString).digest("hex");
  }

  verifyResponseHash(response: any): boolean {
    const { key, txnid, amount, productinfo, firstname, email, udf1 = "", udf2 = "", udf3 = "", udf4 = "", udf5 = "", status, hash } = response;
    // Response hash order: salt|status|udf10|udf9|udf8|udf7|udf6|udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key
    const hashString = `${this.config.salt}|${status}|||||${udf5}|${udf4}|${udf3}|${udf2}|${udf1}|${email}|${firstname}|${productinfo}|${amount}|${txnid}|${key}`;
    const generatedHash = crypto.createHash("sha512").update(hashString).digest("hex");
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

        const response = await axios.post(apiEndpoint, {
            key: this.config.merchantKey,
            txnid,
            hash
        }, {
            headers: { 'Content-Type': 'application/json' }
        });

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
