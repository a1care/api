import api from './api';
import { Endpoints } from '@/constants/api';
import type { ApiResponse } from '@/types';

export interface WalletTransaction {
    amount: number;
    type: 'Credit' | 'Debit';
    description: string;
    date: string;
    _id: string;
}

export interface Wallet {
    _id: string;
    userId: string;
    balance: number;
    transactions: WalletTransaction[];
}

export const walletService = {
    getWallet: async () => {
        const res = await api.get<ApiResponse<Wallet>>(
            Endpoints.WALLET
        );
        return res.data.data;
    },

    addMoney: async (amount: number, description?: string) => {
        const res = await api.post<ApiResponse<Wallet>>(
            Endpoints.ADD_MONEY,
            { amount, description }
        );
        return res.data.data;
    },
};
