import api from "./api";

export interface CreateOrderParams {
    amount: number;
    type: "WALLET_TOPUP" | "BOOKING";
    referenceId?: string;
}

export interface Order {
    _id: string;
    userId: string;
    amount: number;
    status: string;
    txnId: string;
    type: string;
}

export const paymentService = {
    createOrder: async (params: CreateOrderParams) => {
        // const res = await api.post("/payments/orders/create", params);
        // return res.data.data;
        throw new Error("Online payments are disabled. Please use COD.");
    },

    initiatePayment: async (orderId: string) => {
        // const res = await api.post("/payments/initiate", { orderId });
        // return res.data.data;
        throw new Error("Online payments are disabled. Please use COD.");
    },

    verifyPayment: async (orderId: string) => {
        // const res = await api.post("/payments/verify", { orderId });
        // return res.data.data;
        throw new Error("Online payments are disabled. Please use COD.");
    },

    getOrder: async (orderId: string): Promise<Order> => {
        const res = await api.get(`/payments/orders/${orderId}`);
        return res.data.data;
    }
};
