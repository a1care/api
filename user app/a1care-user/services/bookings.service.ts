import api from './api';
import { Endpoints } from '@/constants/api';
import type { ApiResponse, DoctorAppointment, ServiceRequest } from '@/types';

export const bookingsService = {
    // Doctor appointments
    bookDoctor: async (
        doctorId: string,
        data: { date: string; startingTime: string; endingTime: string; totalAmount?: number; paymentMode?: 'ONLINE' | 'OFFLINE' | 'WALLET'; isGatewayPayment?: boolean }
    ) => {
        const payload = { 
            ...data, 
            paymentMode: data.paymentMode === 'WALLET' ? 'ONLINE' : data.paymentMode, 
            isGatewayPayment: data.isGatewayPayment || data.paymentMode === 'ONLINE',
            paymentStatus: (data.paymentMode === 'ONLINE' || data.paymentMode === 'WALLET') ? 'COMPLETED' : 'PENDING' 
        };
        const res = await api.post<ApiResponse<DoctorAppointment>>(
            Endpoints.BOOK_DOCTOR(doctorId),
            payload
        );
        return res.data.data;
    },

    getMyAppointments: async () => {
        const res = await api.get<ApiResponse<DoctorAppointment[]>>(
            Endpoints.MY_APPOINTMENTS
        );
        return res.data.data;
    },

    getAppointmentById: async (id: string) => {
        const res = await api.get<ApiResponse<DoctorAppointment>>(
            `/appointment/${id}`
        );
        return res.data.data;
    },

    updateAppointmentStatus: async (id: string, status: string) => {
        const res = await api.patch<ApiResponse<DoctorAppointment>>(
            Endpoints.UPDATE_APPOINTMENT_STATUS(id),
            { status }
        );
        return res.data.data;
    },

    // Service bookings
    createServiceBooking: async (data: {
        childServiceId?: string;
        healthPackageId?: string;
        addressId?: string;
        location?: { lat: number; lng: number };
        assignedProviderId?: string;
        scheduledTime?: string;
        bookingType: string;
        fulfillmentMode: string;
        price: number;
        paymentMode?: 'ONLINE' | 'OFFLINE' | 'WALLET';
        isGatewayPayment?: boolean;
        notes?: string;
    }) => {
        const payload = {
            childServiceId: data.childServiceId,
            healthPackageId: data.healthPackageId,
            addressId: data.addressId,
            location: data.location,
            assignedProviderId: data.assignedProviderId,
            scheduledSlot: data.scheduledTime ? { startTime: data.scheduledTime, endTime: data.scheduledTime } : undefined,
            bookingType: data.bookingType,
            fulfillmentMode: data.fulfillmentMode,
            price: data.price,
            paymentMode: data.paymentMode === 'WALLET' ? 'ONLINE' : (data.paymentMode || 'OFFLINE'),
            isGatewayPayment: data.isGatewayPayment || data.paymentMode === 'ONLINE',
            notes: data.notes
        };
        const res = await api.post<ApiResponse<ServiceRequest>>(
            Endpoints.CREATE_SERVICE_BOOKING,
            payload
        );
        return res.data.data;
    },

    updateServiceBookingStatus: async (id: string, status: string) => {
        const res = await api.patch<ApiResponse<ServiceRequest>>(
            Endpoints.UPDATE_SERVICE_BOOKING_STATUS(id),
            { status }
        );
        return res.data.data;
    },

    getMyServiceBookings: async () => {
        const res = await api.get<ApiResponse<ServiceRequest[]>>(
            Endpoints.MY_SERVICE_BOOKINGS
        );
        return res.data.data;
    },

    getPendingServiceBookings: async () => {
        const res = await api.get<ApiResponse<ServiceRequest[]>>(
            Endpoints.PENDING_SERVICE_BOOKINGS
        );
        return res.data.data;
    },

    getServiceBookingById: async (id: string) => {
        const res = await api.get<ApiResponse<ServiceRequest>>(
            Endpoints.SERVICE_BOOKING_BY_ID(id)
        );
        return res.data.data;
    },

    // Live Tracking & Chat
    getProviderLocation: async (providerId: string) => {
        const res = await api.get<ApiResponse<{ latitude: number, longitude: number, heading: number }>>(
            `/appointment/location/${providerId}`
        );
        return res.data.data;
    },

    getBookingMessages: async (bookingId: string) => {
        const res = await api.get<ApiResponse<any[]>>(
            `/chat/${bookingId}`
        );
        return res.data.data;
    },

    sendBookingMessage: async (bookingId: string, message: string) => {
        // Logic similar to partner app: actual persistence in socket
        return {
            _id: Math.random().toString(),
            bookingId,
            message,
            senderType: 'User',
            createdAt: new Date().toISOString()
        };
    },
};
