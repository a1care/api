import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuthStore } from "../stores/auth";
import { useState } from "react";

export default function WalletHistoryScreen() {
    const router = useRouter();
    const { user } = useAuthStore() as any;
    const [activeTab, setActiveTab] = useState<"Withdrawn" | "Added">("Withdrawn");

    const { data: staffData } = useQuery({
        queryKey: ["profileStaffDetails"],
        queryFn: async () => {
            const res = await api.get("/doctor/auth/details");
            return res.data.data;
        }
    });

    const handleBack = () => {
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace("/(tabs)/profile");
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={handleBack}
                    style={styles.backButton}
                    hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                >
                    <Ionicons name="arrow-back" size={26} color="#1E293B" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Wallet History</Text>
            </View>

            <View style={styles.content}>
                {/* Balance Card */}
                <View style={styles.balanceCard}>
                    <Text style={styles.balanceLabel}>Available Balance</Text>
                    <Text style={styles.balanceAmount}>Rs {staffData?.walletBalance ?? "0"}</Text>
                </View>

                {/* Tabs */}
                <View style={styles.tabContainer}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === "Withdrawn" && styles.activeTab]}
                        onPress={() => setActiveTab("Withdrawn")}
                    >
                        <Text style={[styles.tabText, activeTab === "Withdrawn" && styles.activeTabText]}>Withdrawn</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === "Added" && styles.activeTab]}
                        onPress={() => setActiveTab("Added")}
                    >
                        <Text style={[styles.tabText, activeTab === "Added" && styles.activeTabText]}>Added</Text>
                    </TouchableOpacity>
                </View>

                {/* List Area */}
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No transactions found</Text>
                    </View>
                </ScrollView>
            </View>

            {/* Withdraw FAB */}
            <TouchableOpacity style={styles.fab}>
                <Ionicons name="arrow-up" size={24} color="#FFF" />
                <Text style={styles.fabText}>Withdraw</Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F3F4F9",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: "#FFFFFF",
        borderBottomWidth: 1,
        borderBottomColor: "#E2E8F0",
    },
    backButton: {
        marginRight: 16,
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#1E293B",
    },
    content: {
        flex: 1,
        padding: 20,
    },
    balanceCard: {
        backgroundColor: "#2D935C",
        borderRadius: 24,
        padding: 30,
        alignItems: "center",
        marginBottom: 25,
        elevation: 8,
        shadowColor: "#2D935C",
        shadowOpacity: 0.2,
        shadowRadius: 15,
    },
    balanceLabel: {
        color: "rgba(255, 255, 255, 0.9)",
        fontSize: 14,
        fontWeight: "600",
        marginBottom: 8,
    },
    balanceAmount: {
        color: "#FFFFFF",
        fontSize: 42,
        fontWeight: "900",
        letterSpacing: -1,
    },
    tabContainer: {
        flexDirection: "row",
        backgroundColor: "#FFFFFF",
        borderRadius: 30,
        padding: 4,
        marginBottom: 20,
        elevation: 2,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 5,
    },
    tab: {
        flex: 1,
        paddingVertical: 14,
        alignItems: "center",
        borderRadius: 26,
    },
    activeTab: {
        backgroundColor: "#2D935C",
    },
    tabText: {
        fontSize: 15,
        fontWeight: "700",
        color: "#64748B",
    },
    activeTabText: {
        color: "#FFFFFF",
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: "center",
    },
    emptyContainer: {
        alignItems: "center",
        justifyContent: "center",
        paddingBottom: 80,
    },
    emptyText: {
        color: "#94A3B8",
        fontSize: 16,
        fontWeight: "500",
    },
    fab: {
        position: "absolute",
        bottom: 30,
        right: 20,
        backgroundColor: "#2D935C",
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 24,
        paddingVertical: 16,
        borderRadius: 32,
        elevation: 10,
        shadowColor: "#2D935C",
        shadowOpacity: 0.3,
        shadowRadius: 20,
    },
    fabText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "800",
        marginLeft: 10,
    },
});
