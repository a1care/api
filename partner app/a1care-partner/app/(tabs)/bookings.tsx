import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";

const TABS = ["Pending", "Confirmed", "Completed", "Cancelled"];

const statusColors: Record<string, { bg: string; text: string }> = {
    Pending: { bg: "#FEF9E7", text: "#D97706" },
    Confirmed: { bg: "#ECFDF5", text: "#047857" },
    Completed: { bg: "#EFF6FF", text: "#1D4ED8" },
    Cancelled: { bg: "#FEF2F2", text: "#B91C1C" },
};

export default function BookingsScreen() {
    const [activeTab, setActiveTab] = useState("Pending");
    const queryClient = useQueryClient();
    const primaryColor = "#2D935C";

    const { data: bookings = [], isLoading, refetch, isRefetching } = useQuery({
        queryKey: ["bookings", activeTab],
        queryFn: async () => {
            const res = await api.get("/appointment/provider/appointments", {
                params: { status: activeTab }
            });
            // Filter by activeTab if backend doesn't filter perfectly
            const all = res.data.data || [];
            if (activeTab === "Pending") return all.filter((b: any) => b.status === "Pending");
            if (activeTab === "Confirmed") return all.filter((b: any) => b.status === "Confirmed" || b.status === "Active");
            return all.filter((b: any) => b.status === activeTab);
        }
    });

    const updateStatusMutation = useMutation({
        mutationFn: async ({ id, status }: { id: string, status: string }) => {
            // Re-using the booking creation endpoint for updates if needed, 
            // but usually there's a patch endpoint. Let's assume /api/appointment/:id/status
            return api.patch(`/appointment/${id}/status`, { status });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["bookings"] });
            Alert.alert("Success", "Booking status updated");
        },
        onError: (err: any) => {
            Alert.alert("Error", err?.response?.data?.message || "Failed to update status");
        }
    });

    const filtered = bookings;

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: "#EBF1F5" }}>
            <View style={styles.headerBar}>
                <Text style={styles.title}>My Bookings</Text>
                <Text style={styles.sub}>Manage your service requests</Text>
            </View>

            {/* Status Tabs */}
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

            {/* Booking Cards */}
            <ScrollView
                contentContainerStyle={{ padding: 20, gap: 16 }}
                refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
            >
                {isLoading ? (
                    <ActivityIndicator size="large" color={primaryColor} style={{ marginTop: 40 }} />
                ) : filtered.length === 0 ? (
                    <View style={styles.empty}>
                        <Text style={{ fontSize: 40 }}>📭</Text>
                        <Text style={styles.emptyText}>No {activeTab.toLowerCase()} bookings</Text>
                    </View>
                ) : (
                    filtered.map((b: any) => (
                        <View key={b._id} style={styles.card}>
                            <View style={styles.cardHeader}>
                                <View>
                                    <Text style={styles.patientName}>{b.patientName || "Guest Patient"}</Text>
                                    <Text style={styles.service}>{b.serviceType || "General Consultation"}</Text>
                                </View>
                                <View style={[styles.statusBadge, { backgroundColor: statusColors[b.status]?.bg || "#EEE" }]}>
                                    <Text style={[styles.statusText, { color: statusColors[b.status]?.text || "#666" }]}>{b.status}</Text>
                                </View>
                            </View>

                            <View style={styles.infoRow}>
                                <Text style={styles.infoItem}>🕐 {b.timeSlot || "Standard Time"}</Text>
                                <Text style={styles.infoItem}>📍 {b.location?.address || "No address provided"}</Text>
                                <Text style={styles.amount}>₹{b.totalAmount || 0}</Text>
                            </View>

                            <View style={styles.actions}>
                                {b.status === "Pending" && (
                                    <>
                                        <TouchableOpacity
                                            style={styles.acceptBtn}
                                            onPress={() => updateStatusMutation.mutate({ id: b._id, status: "Confirmed" })}
                                        >
                                            <Text style={styles.acceptText}>✅ Accept</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.declineBtn}
                                            onPress={() => updateStatusMutation.mutate({ id: b._id, status: "Cancelled" })}
                                        >
                                            <Text style={styles.declineText}>✕ Decline</Text>
                                        </TouchableOpacity>
                                    </>
                                )}
                                {b.status === "Confirmed" && (
                                    <TouchableOpacity
                                        style={styles.acceptBtn}
                                        onPress={() => updateStatusMutation.mutate({ id: b._id, status: "Completed" })}
                                    >
                                        <Text style={styles.acceptText}>✔ Mark Complete</Text>
                                    </TouchableOpacity>
                                )}
                                <TouchableOpacity style={styles.viewBtn}>
                                    <Text style={styles.viewText}>View Details ›</Text>
                                </TouchableOpacity>
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
    actions: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
    acceptBtn: {
        backgroundColor: "#27AE60", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, flex: 1,
        alignItems: "center",
        justifyContent: "center"
    },
    acceptText: { fontSize: 13, fontWeight: "800", color: "#fff" },
    declineBtn: {
        backgroundColor: "#FDECEA", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14,
        alignItems: "center",
        justifyContent: "center"
    },
    declineText: { fontSize: 13, fontWeight: "800", color: "#E74C3C" },
    viewBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, alignItems: "center", justifyContent: "center" },
    viewText: { fontSize: 13, fontWeight: "700", color: "#2D935C" },
});
