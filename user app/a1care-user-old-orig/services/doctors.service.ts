import api from './api';
import { Endpoints } from '@/constants/api';
import type { ApiResponse, Doctor, Role, TimeSlot } from '@/types';

export const doctorsService = {
    getById: async (doctorId: string) => {
        const res = await api.get<ApiResponse<Doctor>>(
            Endpoints.DOCTOR_BY_ID(doctorId)
        );
        return res.data.data;
    },

    getByRole: async (roleId: string, specialization?: string) => {
        const res = await api.get<ApiResponse<Doctor[]>>(Endpoints.STAFF_BY_ROLE, {
            params: { roleId, specialization },
        });
        return res.data.data;
    },

    getSlots: async (doctorId: string, date: string) => {
        const res = await api.get<ApiResponse<TimeSlot[]>>(
            Endpoints.DOCTOR_SLOTS(doctorId, date)
        );
        return res.data.data;
    },

    getRoles: async () => {
        const res = await api.get<ApiResponse<Role[]>>(Endpoints.ROLES);
        return res.data.data;
    },
};
