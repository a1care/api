import api from './api';
import { Endpoints } from '@/constants/api';
import type { ApiResponse, Service, SubService, ChildService } from '@/types';

export const servicesService = {
    getAll: async () => {
        const res = await api.get<ApiResponse<Service[]>>(Endpoints.SERVICES);
        return res.data.data;
    },

    getSubServices: async (serviceId: string) => {
        const res = await api.get<ApiResponse<SubService[]>>(
            Endpoints.SUBSERVICES(serviceId)
        );
        return res.data.data;
    },

    getChildServices: async (subServiceId: string) => {
        const res = await api.get<ApiResponse<ChildService[]>>(
            Endpoints.CHILD_SERVICES(subServiceId)
        );
        return res.data.data;
    },

    getChildServiceById: async (id: string) => {
        const res = await api.get<ApiResponse<ChildService>>(
            Endpoints.CHILD_SERVICE_DETAIL(id)
        );
        return res.data.data;
    },
};
