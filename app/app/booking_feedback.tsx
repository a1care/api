import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const PRIMARY = "#2D935C";

export default function BookingFeedbackScreen() {
    const router = useRouter();
    const { name, amount } = useLocalSearchParams<{ id?: string; type?: string; name?: string; amount?: string }>();
    const earned = Number(amount || 0);

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <LinearGradient colors={["#ECFDF5", "#D1FAE5"]} style={styles.iconBox}>
                    <MaterialCommunityIcons name="check-decagram" size={72} color={PRIMARY} />
                </LinearGradient>

                <Text style={styles.title}>Service Completed!</Text>
                <Text style={styles.subtitle}>
                    Great work{ name ? ` with ${name}` : "" }. This job has been marked complete and added to your earnings.
                </Text>

                <View style={styles.summaryCard}>
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Job value</Text>
                        <Text style={styles.summaryValue}>₹{earned}</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.summaryRow}>
                        <View style={styles.statusPill}>
                            <MaterialCommunityIcons name="star-circle" size={16} color="#0369A1" />
                            <Text style={styles.statusPillText}>Completed</Text>
                        </View>
                        <Text style={styles.summaryHint}>Settled to your wallet</Text>
                    </View>
                </View>
            </View>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={styles.primaryBtn}
                    onPress={() => router.replace({ pathname: "/(tabs)/bookings" as any, params: { status: "Completed" } })}
                >
                    <Text style={styles.primaryBtnText}>Back to Jobs</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.replace("/(tabs)/earnings" as any)}>
                    <Text style={styles.secondaryBtnText}>View Earnings</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#FFFFFF", justifyContent: "space-between" },
    content: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 16 },
    iconBox: { width: 140, height: 140, borderRadius: 70, justifyContent: "center", alignItems: "center", marginBottom: 8 },
    title: { fontSize: 28, fontWeight: "900", color: "#1E293B", textAlign: "center" },
    subtitle: { fontSize: 15, color: "#64748B", textAlign: "center", lineHeight: 22, fontWeight: "500" },
    summaryCard: { width: "100%", backgroundColor: "#F8FAFC", borderRadius: 24, padding: 22, marginTop: 16, gap: 14, borderWidth: 1, borderColor: "#F1F5F9" },
    summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    summaryLabel: { fontSize: 14, color: "#64748B", fontWeight: "700" },
    summaryValue: { fontSize: 22, color: "#1E293B", fontWeight: "900" },
    divider: { height: 1, backgroundColor: "#E2E8F0" },
    statusPill: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#F0F9FF", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
    statusPillText: { fontSize: 12, fontWeight: "800", color: "#0369A1" },
    summaryHint: { fontSize: 12, color: "#94A3B8", fontWeight: "600" },
    footer: { padding: 24, gap: 12 },
    primaryBtn: { height: 54, backgroundColor: PRIMARY, borderRadius: 16, justifyContent: "center", alignItems: "center" },
    primaryBtnText: { color: "#FFF", fontSize: 16, fontWeight: "800" },
    secondaryBtn: { height: 54, backgroundColor: "#F1F5F9", borderRadius: 16, justifyContent: "center", alignItems: "center" },
    secondaryBtnText: { color: "#475569", fontSize: 16, fontWeight: "800" },
});
