import api from './api';

export interface Notification {
    _id: string;
    title: string;
    body: string;
    refType?: string;
    isRead: boolean;
    createdAt: string;
    data?: Record<string, string>;
}

export interface NotificationsResponse {
    notifications: Notification[];
    unreadCount: number;
    total: number;
    page: number;
    pages: number;
}

export const notificationsService = {
    /**
     * GET /notifications
     * Returns paginated notifications for the logged-in patient.
     * Backend: GET /api/notifications
     */
    getAll: async (page = 1): Promise<NotificationsResponse> => {
        const res = await api.get(`/notifications?page=${page}&limit=30`);
        return res.data.data;
    },

    /**
     * PUT /notifications/:id/read
     * Marks a single notification as read.
     * Backend: PUT /api/notifications/:id/read
     */
    markRead: async (id: string): Promise<void> => {
        await api.put(`/notifications/${id}/read`);
    },

    /**
     * PUT /notifications/read-all
     * Marks ALL unread notifications as read.
     * Backend: PUT /api/notifications/read-all
     */
    markAllRead: async (): Promise<void> => {
        await api.put('/notifications/read-all');
    },
};
