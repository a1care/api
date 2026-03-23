import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { useRouter } from "expo-router";
import * as Location from 'expo-location';
import { partnerBookingService } from '../../lib/bookings';
import { MessageCircle, MapPin, Navigation, Calendar } from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';
import { io, Socket } from 'socket.io-client';

const TABS = ["Pending", "Confirmed", "Completed", "Cancelled"];

const statusColors: Record<string, { bg: string; text: string }> = {
    Pending: { bg: "#FEF9E7", text: "#D97706" },
    Broadcasted: { bg: "#F5F3FF", text: "#7C3AED" },
    ACCEPTED: { bg: "#ECFDF5", text: "#059669" },
    Confirmed: { bg: "#ECFDF5", text: "#047857" },
    Active: { bg: "#ECFDF5", text: "#047857" },
    IN_PROGRESS: { bg: "#EFF6FF", text: "#3B82F6" },
    Completed: { bg: "#F0F9FF", text: "#0369A1" },
    COMPLETED: { bg: "#F0F9FF", text: "#0369A1" },
    Cancelled: { bg: "#FEF2F2", text: "#B91C1C" },
};

const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace('/api', '') || 'https://api.a1carehospital.in';

export default function BookingsScreen() {
    const queryClient = useQueryClient();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState("All");
    const primaryColor = "#2D935C";

    const [isTracking, setIsTracking] = useState<string | null>(null);
    const trackingInterval = useRef<any>(null);
    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        socketRef.current = io(API_URL);
        return () => {
            socketRef.current?.disconnect();
        };
    }, []);

    const { data: bookings = [], isLoading, refetch, isRefetching } = useQuery({
        queryKey: ["bookings", activeTab],
        queryFn: async () => {
            const res = await api.get("/appointment/provider/feed", {
                params: { status: activeTab }
            });
            return res.data.data || [];
        }
    });

    const updateStatusMutation = useMutation({
        mutationFn: ({ id, status, bookingType }: { id: string, status: string, bookingType: 'Doctor' | 'Service' }) => 
            partnerBookingService.updateStatus(id, status, bookingType),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["bookings"] });
            Alert.alert("Success", "Status updated");
        },
        onError: (err: any) => {
            Alert.alert("Error", err?.response?.data?.message || "Action failed");
        }
    });

    const acceptServiceMutation = useMutation({
        mutationFn: (id: string) => partnerBookingService.acceptServiceRequest(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["bookings"] });
            Alert.alert("Claimed!", "You have accepted this request");
        },
        onError: (err: any) => {
            Alert.alert("Busy!", err?.response?.data?.message || "Someone else might have claimed this just now.");
        }
    });

    const startTracking = async (id: string) => {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert("Permission Denied", "Location permission is required to track journey.");
            return;
        }

        setIsTracking(id);
        trackingInterval.current = setInterval(async () => {
            try {
                const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                const coords = {
                    latitude: loc.coords.latitude,
                    longitude: loc.coords.longitude,
                    heading: loc.coords.heading || 0,
                    speed: loc.coords.speed || 0,
                };

                // 1. Sync with DB (Persistent)
                await partnerBookingService.updateLocation(coords);

                // 2. Broadcast via Socket (Real-time)
                socketRef.current?.emit('update_location', {
                    roomId: id,
                    ...coords
                });

            } catch (err) {
                console.error("Tracking error", err);
            }
        }, 10000);
    };

    const stopTracking = () => {
        setIsTracking(null);
        if (trackingInterval.current) clearInterval(trackingInterval.current);
    };

    useEffect(() => {
        return () => {
            if (trackingInterval.current) clearInterval(trackingInterval.current);
        };
    }, []);

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: "#EBF1F5" }}>
            <View style={styles.headerBar}>
                <Text style={styles.title}>My Bookings</Text>
                <Text style={styles.sub}>Manage your service requests</Text>
            </View>

            <View style={{ height: 60 }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll} contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}>
                    {TABS.map(t => (
                        <TouchableOpacity
                            key={t}
                            onPress={() => setActiveTab(t)}
                            style={[styles.tab, activeTab === t && styles.tabActive]}
                        >
                            <Text style={[styles.tabText, activeTab === t && styles.tabTextActive]}>{t}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <ScrollView
                contentContainerStyle={{ padding: 20, gap: 16 }}
                refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
            >
                {isLoading ? (
                    <ActivityIndicator size="large" color={primaryColor} style={{ marginTop: 40 }} />
                ) : bookings.length === 0 ? (
                    <View style={styles.empty}>
                        <Text style={{ fontSize: 40 }}>📭</Text>
                        <Text style={styles.emptyText}>No {activeTab.toLowerCase()} bookings</Text>
                    </View>
                ) : (
                    bookings.map((b: any) => (
                        <View key={b._id} style={styles.card}>
                            <View style={styles.cardHeader}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.patientName}>{b.patientName || "Guest Patient"}</Text>
                                    <Text style={[styles.service, { color: b.bookingType === 'Doctor' ? '#3B82F6' : '#8B5CF6' }]}>
                                        {b.bookingType === 'Doctor' ? '🩺 ' : '🧪 '}{b.serviceType}
                                    </Text>
                                </View>
                                <View style={[styles.statusBadge, { backgroundColor: statusColors[b.status]?.bg || "#EEF2FF" }]}>
                                    <Text style={[styles.statusText, { color: statusColors[b.status]?.text || "#6366F1" }]}>{b.status}</Text>
                                </View>
                            </View>

                            <View style={styles.infoRow}>
                                <Text style={styles.infoItem}>🕐 {b.timeSlot || "Standard Time"}</Text>
                                <Text style={styles.infoItem}>📍 {b.location?.address || "No address provided"}</Text>
                                <Text style={styles.amount}>₹{b.totalAmount || 0}</Text>
                            </View>

                            <View style={styles.actions}>
                                {b.status === "Broadcasted" && (
                                    <TouchableOpacity
                                        style={[styles.acceptBtn, { backgroundColor: '#8B5CF6' }]}
                                        onPress={() => acceptServiceMutation.mutate(b._id)}
                                    >
                                        <Text style={styles.acceptText}>⚡ Claim Job</Text>
                                    </TouchableOpacity>
                                )}

                                {b.status === "Pending" && (
                                    <>
                                        <TouchableOpacity
                                            style={styles.acceptBtn}
                                            onPress={() => updateStatusMutation.mutate({ id: b._id, status: "Confirmed", bookingType: b.bookingType })}
                                        >
                                            <Text style={styles.acceptText}>✅ Accept</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.declineBtn}
                                            onPress={() => updateStatusMutation.mutate({ id: b._id, status: "Cancelled", bookingType: b.bookingType })}
                                        >
                                            <Text style={styles.declineText}>✕ Decline</Text>
                                        </TouchableOpacity>
                                    </>
                                )}
                                
                                {(b.status === "Confirmed" || b.status === "ACCEPTED" || b.status === "IN_PROGRESS") && (
                                    <View style={{ flexDirection: 'row', gap: 10, flex: 1 }}>
                                        {isTracking !== b._id ? (
                                            <TouchableOpacity
                                                style={[styles.acceptBtn, { backgroundColor: '#3498DB' }]}
                                                onPress={() => startTracking(b._id)}
                                            >
                                                <Text style={styles.acceptText}>Track Live</Text>
                                            </TouchableOpacity>
                                        ) : (
                                            <TouchableOpacity
                                                style={[styles.acceptBtn, { backgroundColor: '#E74C3C' }]}
                                                onPress={stopTracking}
                                            >
                                                <Text style={styles.acceptText}>Stop</Text>
                                            </TouchableOpacity>
                                        )}
                                        <TouchableOpacity
                                            style={styles.acceptBtn}
                                            onPress={() => updateStatusMutation.mutate({ 
                                                id: b._id, 
                                                status: b.bookingType === 'Doctor' ? "Completed" : "COMPLETED", 
                                                bookingType: b.bookingType 
                                            })}
                                        >
                                            <Text style={styles.acceptText}>Complete</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}

                                {b.status !== "Pending" && b.status !== "Broadcasted" && (
                                    <View style={{ flexDirection: 'row', gap: 10 }}>
                                        <TouchableOpacity 
                                            style={styles.iconBtn}
                                            onPress={() => router.push({
                                                pathname: '/booking_chat' as any,
                                                params: { id: b._id, name: b.patientName || 'Patient' }
                                            })}
                                        >
                                            <MessageCircle size={24} color="#2D935C" />
                                        </TouchableOpacity>

                                        {(b.status === "Confirmed" || b.status === "ACCEPTED" || b.status === "IN_PROGRESS") && (
                                            <TouchableOpacity 
                                                style={[styles.iconBtn, { backgroundColor: '#FFF7ED' }]}
                                                onPress={() => router.push({
                                                    pathname: '/video-call' as any,
                                                    params: { bookingId: b._id, channelName: b._id }
                                                })}
                                            >
                                                <Ionicons name="videocam" size={24} color="#C2410C" />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                )}
                            </View>
                        </View>
                    ))
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    headerBar: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
    title: { fontSize: 24, fontWeight: "800", color: "#0D2E4D" },
    sub: { fontSize: 13, color: "#6B8A9E", marginTop: 2 },
    tabsScroll: { maxHeight: 56, marginTop: 8 },
    tab: {
        paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20,
        backgroundColor: "#FFFFFF",
        shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
    },
    tabActive: { backgroundColor: "#2D935C" },
    tabText: { fontSize: 13, fontWeight: "700", color: "#6B8A9E" },
    tabTextActive: { color: "#FFFFFF" },
    empty: { alignItems: "center", paddingTop: 60, gap: 12 },
    emptyText: { fontSize: 15, color: "#9CB3C4", fontWeight: "600" },
    card: {
        backgroundColor: "#FFFFFF", borderRadius: 20, padding: 18,
        shadowColor: "#000", shadowOpacity: 0.07, shadowRadius: 10, elevation: 4,
        gap: 12,
    },
    cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
    patientName: { fontSize: 16, fontWeight: "800", color: "#0D2E4D" },
    service: { fontSize: 13, color: "#6B8A9E", marginTop: 2 },
    statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
    statusText: { fontSize: 11, fontWeight: "800" },
    infoRow: { gap: 4, borderTopWidth: 1, borderTopColor: "#F0F7FC", paddingTop: 12 },
    infoItem: { fontSize: 12, color: "#4A6E8A" },
    amount: { fontSize: 18, fontWeight: "900", color: "#27AE60", marginTop: 4 },
    actions: { flexDirection: "row", gap: 10, alignItems: 'center' },
    acceptBtn: {
        backgroundColor: "#27AE60", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, flex: 1,
        alignItems: "center", justifyContent: "center"
    },
    acceptText: { fontSize: 13, fontWeight: "800", color: "#fff" },
    declineBtn: {
        backgroundColor: "#FDECEA", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14,
        alignItems: "center", justifyContent: "center"
    },
    declineText: { fontSize: 13, fontWeight: "800", color: "#E74C3C" },
    iconBtn: { padding: 10, backgroundColor: '#ECFDF5', borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
});
