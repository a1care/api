import { create } from 'zustand';
import type { Patient } from '@/types';
import { authService } from '@/services/auth.service';

interface AuthState {
    token: string | null;
    user: Patient | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    confirmationResult: any | null;

    setToken: (token: string) => void;
    setUser: (user: Patient) => void;
    setConfirmationResult: (result: any) => void;
    initialize: () => Promise<void>;
    logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
    token: null,
    user: null,
    isAuthenticated: false,
    isLoading: true,
    confirmationResult: null,

    setToken: (token) => set({ token, isAuthenticated: true }),
    setUser: (user) => set({ user }),
    setConfirmationResult: (result) => set({ confirmationResult: result }),

    initialize: async () => {
        set({ isLoading: true });
        try {
            const token = await authService.getToken();
            if (token) {
                const user = await authService.getProfile();
                set({ token, user, isAuthenticated: true });
            }
        } catch {
            // Token expired or invalid — reset
            await authService.logout();
            set({ token: null, user: null, isAuthenticated: false });
        } finally {
            set({ isLoading: false });
        }
    },

    logout: async () => {
        await authService.logout();
        set({ token: null, user: null, isAuthenticated: false });
    },
}));
