import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { useMemo } from "react";

export default function EarningsScreen() {
    const { data: bookings = [], isLoading, refetch, isRefetching } = useQuery({
        queryKey: ["earnings"],
        queryFn: async () => {
            const res = await api.get("/appointment/patient/appointments/pending");
            return res.data.data || [];
        }
    });

    const { total, fees, net, transactions, weekData } = useMemo(() => {
        const completed = bookings.filter((b: any) => b.status === "Completed");
        const totalAmount = completed.reduce((s: number, b: any) => s + (b.totalAmount || 0), 0);
        const platformFees = totalAmount * 0.1; // 10% commission
        const netAmount = totalAmount - platformFees;

        const txs = completed.map((b: any) => ({
            id: b._id,
            patient: b.patientName || "Guest Patient",
            service: b.serviceType || "Service",
            date: new Date(b.updatedAt).toLocaleDateString(),
            amount: b.totalAmount || 0,
            type: "credit"
        }));

        // Add commission as a debit transaction
        if (platformFees > 0) {
            txs.push({
                id: "commission",
                patient: "A1Care Platform",
                service: "Platform Commission (10%)",
                date: "Today",
                amount: platformFees,
                type: "debit"
            });
        }

        // Generate simple week data
        const days = ["S", "M", "T", "W", "T", "F", "S"];
        const weekly = days.map((day, i) => {
            const dayAmount = completed
                .filter((b: any) => new Date(b.updatedAt).getDay() === i)
                .reduce((s: number, b: any) => s + (b.totalAmount || 0), 0);
            return { day, amount: dayAmount };
        });

        return { total: totalAmount, fees: platformFees, net: netAmount, transactions: txs, weekData: weekly };
    }, [bookings]);

    const maxAmount = Math.max(...weekData.map(d => d.amount), 1);

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: "#EBF1F5" }}>
            <ScrollView
                contentContainerStyle={{ paddingBottom: 24 }}
                refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
            >
                {/* Hero Card */}
                <LinearGradient colors={["#2D935C", "#1E8449"]} style={styles.hero}>
                    <Text style={styles.heroLabel}>Total Earnings</Text>
                    <Text style={styles.heroAmount}>₹{net.toLocaleString()}</Text>
                    <View style={styles.heroRow}>
                        <View>
                            <Text style={styles.heroSub}>Gross</Text>
                            <Text style={styles.heroVal}>₹{total.toLocaleString()}</Text>
                        </View>
                        <View style={styles.divider} />
                        <View>
                            <Text style={styles.heroSub}>Fee (10%)</Text>
                            <Text style={[styles.heroVal, { color: "#FFB3B3" }]}>-₹{fees.toLocaleString()}</Text>
                        </View>
                        <View style={styles.divider} />
                        <View>
                            <Text style={styles.heroSub}>Net Payout</Text>
                            <Text style={[styles.heroVal, { color: "#A8F5C4" }]}>₹{net.toLocaleString()}</Text>
                        </View>
                    </View>
                </LinearGradient>

                {/* Bar Chart */}
                <View style={styles.chartCard}>
                    <Text style={styles.sectionTitle}>Performance</Text>
                    <View style={styles.bars}>
                        {weekData.map((d, i) => (
                            <View key={i} style={styles.barCol}>
                                <View style={styles.barTrack}>
                                    <LinearGradient
                                        colors={d.amount > 0 ? ["#2D935C", "#34D399"] : ["#E2E8F0", "#E2E8F0"]}
                                        style={[styles.bar, { height: `${(d.amount / maxAmount) * 100}%` || "5%" }]}
                                    />
                                </View>
                                <Text style={styles.barLabel}>{d.day}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Transactions */}
                <Text style={[styles.sectionTitle, { paddingHorizontal: 20, marginTop: 20 }]}>Recent History</Text>
                <View style={{ paddingHorizontal: 20, gap: 12 }}>
                    {isLoading ? (
                        <ActivityIndicator color="#2D935C" />
                    ) : transactions.length === 0 ? (
                        <Text style={{ textAlign: "center", color: "#6B8A9E" }}>No transactions yet</Text>
                    ) : (
                        transactions.map((t: any) => (
                            <View key={t.id} style={styles.txCard}>
                                <View style={[styles.txIcon, { backgroundColor: t.type === "credit" ? "#E8F8EF" : "#FDECEA" }]}>
                                    <Text style={{ fontSize: 16 }}>{t.type === "credit" ? "💰" : "📤"}</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.txTitle}>{t.patient}</Text>
                                    <Text style={styles.txSub}>{t.service} · {t.date}</Text>
                                </View>
                                <Text style={[styles.txAmount, { color: t.type === "credit" ? "#27AE60" : "#E74C3C" }]}>
                                    {t.type === "credit" ? "+" : "-"}₹{t.amount}
                                </Text>
                            </View>
                        ))
                    )}
                </View>

                {/* Payout Button */}
                <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
                    <TouchableOpacity activeOpacity={0.85}>
                        <LinearGradient
                            colors={["#2D935C", "#1E8449"]}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                            style={styles.payoutBtn}
                        >
                            <Text style={styles.payoutText}>💳  Request Payout</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                    <Text style={styles.payoutNote}>Next payout cycle: Monday, 9:00 AM</Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    hero: {
        margin: 20, borderRadius: 28, padding: 24,
        shadowColor: "#2D935C", shadowOpacity: 0.3, shadowRadius: 16, elevation: 10,
    },
    heroLabel: { fontSize: 12, color: "rgba(255,255,255,0.7)", fontWeight: "700", marginBottom: 4 },
    heroAmount: { fontSize: 36, fontWeight: "900", color: "#FFFFFF", marginBottom: 16 },
    heroRow: { flexDirection: "row", justifyContent: "space-around" },
    heroSub: { fontSize: 11, color: "rgba(255,255,255,0.6)", textAlign: "center" },
    heroVal: { fontSize: 15, fontWeight: "800", color: "#FFFFFF", textAlign: "center", marginTop: 2 },
    divider: { width: 1, backgroundColor: "rgba(255,255,255,0.2)" },
    chartCard: {
        marginHorizontal: 20, backgroundColor: "#FFFFFF", borderRadius: 24, padding: 20,
        shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 10, elevation: 4,
    },
    sectionTitle: { fontSize: 16, fontWeight: "800", color: "#1E293B", marginBottom: 16 },
    bars: { flexDirection: "row", gap: 8, height: 100, alignItems: "flex-end" },
    barCol: { flex: 1, alignItems: "center", gap: 6 },
    barTrack: { flex: 1, width: "100%", justifyContent: "flex-end" },
    bar: { width: "100%", borderRadius: 8, minHeight: 4 },
    barLabel: { fontSize: 11, fontWeight: "700", color: "#64748B" },
    txCard: {
        flexDirection: "row", alignItems: "center", gap: 14,
        backgroundColor: "#FFFFFF", borderRadius: 18, padding: 14,
        shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
    },
    txIcon: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
    txTitle: { fontSize: 14, fontWeight: "700", color: "#1E293B" },
    txSub: { fontSize: 11, color: "#64748B", marginTop: 2 },
    txAmount: { fontSize: 16, fontWeight: "900" },
    payoutBtn: {
        height: 58, borderRadius: 29, alignItems: "center", justifyContent: "center",
        shadowColor: "#2D935C", shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
    },
    payoutText: { fontSize: 17, fontWeight: "800", color: "#fff" },
    payoutNote: { fontSize: 12, color: "#64748B", textAlign: "center", marginTop: 10 },
});

