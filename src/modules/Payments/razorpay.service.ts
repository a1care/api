import Razorpay from 'razorpay';
import crypto from 'crypto';
import { PaymentLog } from './payment.model.js';

export class RazorpayService {
    private instance: any;
    private keySecret: string;

    constructor(options: { keyId: string; keySecret: string }) {
        this.instance = new Razorpay({
            key_id: options.keyId,
            key_secret: options.keySecret,
        });
        this.keySecret = options.keySecret;
    }

    /**
     * Create a Razorpay Order
     */
    async createRazorpayOrder(params: { amount: number; receipt: string; notes?: any }) {
        const options = {
            amount: Math.round(params.amount * 100), // Razorpay expects amount in paise
            currency: "INR",
            receipt: params.receipt,
            notes: params.notes || {},
        };

        try {
            const order = await this.instance.orders.create(options);
            return order;
        } catch (error) {
            console.error("Razorpay Order Creation Error:", error);
            throw error;
        }
    }

    /**
     * Verify the payment signature
     */
    verifySignature(orderId: string, paymentId: string, signature: string): boolean {
        const hmac = crypto.createHmac("sha256", this.keySecret);
        hmac.update(orderId + "|" + paymentId);
        const generatedSignature = hmac.digest("hex");
        return generatedSignature === signature;
    }

    /**
     * Capture payment (if not automatic)
     */
    async capturePayment(paymentId: string, amount: number) {
        return await this.instance.payments.capture(paymentId, Math.round(amount * 100), "INR");
    }

    /**
     * Log payment events for auditing
     */
    async logEvent(txnId: string, event: string, level: "INFO" | "WARN" | "ERROR" = "INFO", message: string, metadata?: any) {
        try {
            await PaymentLog.create({
                txnId,
                event,
                level,
                message,
                metadata
            });
            console.log(`[Razorpay Log] ${event}: ${message}`);
        } catch (err) {
            console.error("Payment Logger Error:", err);
        }
    }
}
