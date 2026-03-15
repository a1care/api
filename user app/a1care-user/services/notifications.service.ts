import api from './api';
import type { ApiResponse } from '@/types';

export const notificationsService = {
    /**
     * GET /notifications (Patient app specific)
     * TODO: Wire to real backend when endpoint is deployed
     */
    getAll: async () => {
        const res = await api.get<ApiResponse<any[]>>('/notifications');
        return res.data.data;
    },

    /**
     * PUT /notifications/read/:id
     */
    markRead: async (id: string) => {
        const res = await api.put<ApiResponse<any>>(`/notifications/read/${id}`);
        return res.data.data;
    },

    /**
     * PUT /notifications/read-all
     */
    markAllRead: async () => {
        const res = await api.put<ApiResponse<any>>('/notifications/read-all');
        return res.data.data;
    }
};
