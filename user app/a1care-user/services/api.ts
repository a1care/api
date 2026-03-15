import axios from 'axios';
import { tokenStorage } from '@/utils/storage';
import { API_BASE_URL } from '@/constants/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 15000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// ── Request interceptor — attach JWT token ──
api.interceptors.request.use(
    async (config) => {
        const token = await tokenStorage.getItem('auth_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// ── Response interceptor — handle 401 ──
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401) {
            await tokenStorage.removeItem('auth_token');
            // Navigation to login is handled by the root layout
        }
        return Promise.reject(error);
    }
);

export default api;
