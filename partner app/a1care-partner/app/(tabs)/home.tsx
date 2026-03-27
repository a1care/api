import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Switch, ActivityIndicator, RefreshControl, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useState, useMemo, useEffect } from "react";
import { useAuthStore } from "../../stores/auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Toast } from "../../components/CustomToast";

export default function HomeScreen() {
    const router = useRouter();
    const { user, setUser } = useAuthStore() as any;
    const [isOnline, setIsOnline] = useState(user?.status === "Active");
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const role = user?.role ?? "doctor";
    const primaryColor = "#2D935C";
    const queryClient = useQueryClient();

    const { data: staffData, isLoading: loadingUser, refetch: refetchUser } = useQuery({
        queryKey: ["staffDetails"],
        queryFn: async () => {
            const res = await api.get("/doctor/auth/details");
            return res.data.data;
        }
    });

    useEffect(() => {
        if (staffData) {
            setIsOnline(staffData.status === "Active");
            console.log("DEBUG: Home loaded staffData", {
                hasImage: !!staffData.profileImage,
                url: staffData.profileImage?.slice(0, 30) + "..."
            });
        }
    }, [staffData]);

    useEffect(() => {
        if (user) {
            console.log("DEBUG: Home user store", {
                name: user?.name,
                hasImage: !!user?.profileImage
            });
        }
    }, [user]);

    const { data: bookings = [], isLoading: loadingStats, refetch: refetchStats, isRefetching } = useQuery({
        queryKey: ["homeStats"],
        queryFn: async () => {
            const res = await api.get("/appointment/patient/appointments/pending");
            return res.data.data || [];
        }
    });

    const stats = useMemo(() => {
        const pending = bookings.filter((b: any) => b.status === "Pending").length;
        const completed = bookings.filter((b: any) => b.status === "Completed").length;
        const earnings = bookings
            .filter((b: any) => b.status === "Completed")
            .reduce((acc: number, b: any) => acc + (b.totalAmount || 0), 0);

        return [
            { label: "Bookings", value: bookings.length.toString(), icon: "calendar-outline", color: "#6366F1" },
            { label: "Earning", value: `₹${earnings}`, icon: "cash-outline", color: "#2D935C" },
            { label: "Completed", value: completed.toString(), icon: "checkmark-circle-outline", color: "#10B981" },
            { label: "Rating", value: "4.8", icon: "star-outline", color: "#F59E0B" },
        ];
    }, [bookings]);

    const handleToggleOnline = async (val: boolean) => {
        if (isUpdatingStatus) return;

        setIsUpdatingStatus(true);
        const previousStatus = isOnline;
        setIsOnline(val); // Optimistic update

        try {
            const newStatus = val ? "Active" : "Inactive";
            const res = await api.put("/doctor/auth/register", { status: newStatus });

            if (res.data.success) {
                // Update local store to keep everything in sync
                setUser({ ...user, status: newStatus });

                Toast.show({
                    type: "success",
                    text1: val ? "You are now Online" : "You are now Offline",
                    text2: val ? "Patients can now book your services" : "You are currently hidden from searches"
                });
            }
        } catch (err) {
            setIsOnline(previousStatus); // Rollback
            console.error("Failed to update status", err);
            Toast.show({
                type: "error",
                text1: "Status Update Failed",
                text2: "Please check your internet connection"
            });
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    const onRefresh = () => {
        refetchUser();
        refetchStats();
    };

    if (loadingUser && !user) {
        return (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F3F4F9" }}>
                <ActivityIndicator size="large" color={primaryColor} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {staffData?.status === "Pending" && (
                <View style={styles.kycOverlay}>
                    <LinearGradient colors={["#FFFFFF", "#F8FAFC"]} style={styles.kycContent}>
                        <View style={styles.kycHeader}>
                            <View style={styles.kyclIconBox}>
                                <LinearGradient colors={["#ECFDF5", "#D1FAE5"]} style={StyleSheet.absoluteFill} />
                                <Ionicons name="shield-checkmark" size={42} color="#10B981" />
                            </View>
                            <Text style={styles.kycTitle}>Verification in Progress</Text>
                            <Text style={styles.kycDesc}>
                                We are reviewing your certificates and credentials. This usually takes <Text style={{fontWeight:'800', color:'#1E293B'}}>24-48 hours</Text>.
                            </Text>
                        </View>

                        <View style={styles.stepBox}>
                            <View style={styles.step}>
                                <View style={[styles.stepDot, { backgroundColor: "#10B981" }]}>
                                    <Ionicons name="checkmark" size={12} color="#FFF" />
                                </View>
                                <View style={styles.stepLine} />
                                <Text style={styles.stepText}>Documents Submitted</Text>
                            </View>
                            <View style={[styles.step, { opacity: 1 }]}>
                                <View style={[styles.stepDot, { backgroundColor: "#3B82F6", borderWidth: 0 }]}>
                                    <ActivityIndicator size="small" color="#FFF" />
                                </View>
                                <View style={[styles.stepLine, { backgroundColor: "#E2E8F0" }]} />
                                <Text style={[styles.stepText, { color: "#3B82F6" }]}>Admin Reviewing</Text>
                            </View>
                            <View style={[styles.step, { opacity: 0.5 }]}>
                                <View style={[styles.stepDot, { backgroundColor: "#FFF", borderWidth: 2, borderColor: "#CBD5E1" }]} />
                                <Text style={styles.stepText}>Go Live & Earn</Text>
                            </View>
                        </View>

                        <TouchableOpacity style={styles.kycCta} onPress={onRefresh} activeOpacity={0.8}>
                            <LinearGradient colors={["#1E293B", "#0F172A"]} style={StyleSheet.absoluteFill} />
                            <Ionicons name="refresh" size={20} color="#FFF" />
                            <Text style={styles.kycCtaText}>Check Update</Text>
                        </TouchableOpacity>
                        
                        <Text style={styles.kycFooter}>A1Care Security Verification</Text>
                    </LinearGradient>
                </View>
            )}

            <ScrollView
                refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={primaryColor} />}
                showsVerticalScrollIndicator={false}
            >
                {/* Modern Header */}
                <View style={styles.header}>
                    <View style={styles.headerContent}>
                        <View>
                            <Text style={styles.greetingText}>Welcome back,</Text>
                            <Text style={styles.nameText}>{user?.name ?? "Partner"}</Text>
                        </View>
                        <TouchableOpacity style={styles.profileBtn} onPress={() => router.push("/profile_edit")}>
                            <View style={styles.avatarBorder}>
                                {staffData?.profileImage || user?.profileImage ? (
                                    <Image
                                        key={staffData?.profileImage || user?.profileImage}
                                        source={{ uri: staffData?.profileImage || user?.profileImage }}
                                        style={{ width: "100%", height: "100%" }}
                                        resizeMode="cover"
                                    />
                                ) : (
                                    <Ionicons name="person" size={24} color="#64748B" />
                                )}
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* Online Card */}
                    <View style={[styles.statusCard, { borderLeftColor: isOnline ? "#2D935C" : "#94A3B8" }]}>
                        <View style={styles.statusInfo}>
                            <View style={styles.statusIndicator}>
                                <View style={[styles.statusDot, { backgroundColor: isOnline ? "#2D935C" : "#94A3B8" }]} />
                                <Text style={[styles.statusText, { color: isOnline ? "#2D935C" : "#64748B" }]}>
                                    {isOnline ? "Currently Active" : "Currently Offline"}
                                </Text>
                            </View>
                            <Text style={styles.statusSubText}>
                                {isOnline ? "You are visible to patients" : "You are hidden from searches"}
                            </Text>
                        </View>
                        <Switch
                            value={isOnline}
                            onValueChange={handleToggleOnline}
                            trackColor={{ false: "#CBD5E1", true: "#2D935C" }}
                            thumbColor={"#FFF"}
                            disabled={isUpdatingStatus}
                        />
                    </View>
                </View>

                {/* Dashboard Stats */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Dashboard</Text>
                    <TouchableOpacity><Text style={styles.viewAllText}>This Month</Text></TouchableOpacity>
                </View>

                <View style={styles.statsGrid}>
                    {stats.map((s, idx) => (
                        <View key={idx} style={styles.statBox}>
                            <View style={[styles.statIconContainer, { backgroundColor: s.color + '10' }]}>
                                <Ionicons name={s.icon as any} size={22} color={s.color} />
                            </View>
                            <View>
                                <Text style={styles.statValText}>{s.value}</Text>
                                <Text style={styles.statLabelText}>{s.label}</Text>
                            </View>
                        </View>
                    ))}
                </View>

                {/* Quick Access Restore */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Quick Access</Text>
                </View>

                <View style={styles.actionGrid}>
                    <TouchableOpacity style={styles.actionItem} onPress={() => router.push("/(tabs)/bookings")}>
                        <LinearGradient colors={["#ECFDF5", "#F0FDF4"]} style={styles.actionIconBox}>
                            <MaterialCommunityIcons name="calendar-check" size={28} color="#2D935C" />
                        </LinearGradient>
                        <Text style={styles.actionLabel}>Schedule</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionItem} onPress={() => router.push("/customers")}>
                        <LinearGradient colors={["#EEF2FF", "#F5F3FF"]} style={styles.actionIconBox}>
                            <MaterialCommunityIcons name="account-group" size={28} color="#6366F1" />
                        </LinearGradient>
                        <Text style={styles.actionLabel}>Customers</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionItem} onPress={() => router.push("/(tabs)/earnings")}>
                        <LinearGradient colors={["#FFFBEB", "#FEF3C7"]} style={styles.actionIconBox}>
                            <MaterialCommunityIcons name="chart-bell-curve" size={28} color="#F59E0B" />
                        </LinearGradient>
                        <Text style={styles.actionLabel}>Analytics</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionItem} onPress={() => router.push("/tools")}>
                        <LinearGradient colors={["#FEF2F2", "#FFF1F1"]} style={styles.actionIconBox}>
                            <MaterialCommunityIcons name="tools" size={28} color="#EF4444" />
                        </LinearGradient>
                        <Text style={styles.actionLabel}>Tools</Text>
                    </TouchableOpacity>
                </View>

                {/* Recent Requests - Fills the empty space */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Recent Requests</Text>
                    <TouchableOpacity onPress={() => router.push("/(tabs)/bookings")}>
                        <Text style={styles.viewAllText}>View All</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.requestsContainer}>
                    {bookings.length > 0 ? (
                        bookings.slice(0, 3).map((item: any, index: number) => (
                            <TouchableOpacity
                                key={index}
                                style={styles.requestCard}
                                onPress={() => router.push("/(tabs)/bookings")}
                            >
                                <View style={styles.requestIconBox}>
                                    <Ionicons name="calendar" size={20} color="#2D935C" />
                                </View>
                                <View style={styles.requestMainInfo}>
                                    <Text style={styles.requestName}>{item.patientName || "New Patient"}</Text>
                                    <Text style={styles.requestTime}>{new Date(item.appointmentDate).toDateString()} • {item.appointmentTime}</Text>
                                </View>
                                <View style={styles.requestStatusBox}>
                                    <View style={styles.statusBadge}>
                                        <Text style={styles.statusBadgeText}>Pending</Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        ))
                    ) : (
                        <View style={styles.emptyRequestsCard}>
                            <Ionicons name="mail-open-outline" size={40} color="#CBD5E1" />
                            <Text style={styles.emptyRequestsText}>Your schedule is clear for now</Text>
                            <Text style={styles.emptyRequestsSubText}>New patient requests will appear here</Text>
                        </View>
                    )}
                </View>

                <View style={{ height: 60 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#EBF1F5",
    },
    header: {
        backgroundColor: "#FFF",
        paddingHorizontal: 20,
        paddingBottom: 25,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
        elevation: 4,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 10,
    },
    headerContent: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 20,
        marginBottom: 25,
    },
    greetingText: {
        fontSize: 14,
        color: "#64748B",
        fontWeight: "600",
    },
    nameText: {
        fontSize: 24,
        fontWeight: "900",
        color: "#1E293B",
        marginTop: 2,
    },
    profileBtn: {
        width: 48,
        height: 48,
        borderRadius: 24,
        overflow: 'hidden',
    },
    avatarBorder: {
        flex: 1,
        backgroundColor: "#F1F5F9",
        borderWidth: 2,
        borderColor: "#E2E8F0",
        justifyContent: 'center',
        alignItems: 'center',
    },
    statusCard: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "#FFF",
        borderRadius: 20,
        padding: 16,
        paddingLeft: 20,
        borderLeftWidth: 5,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        elevation: 2,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 5,
    },
    statusInfo: {
        flex: 1,
    },
    statusIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    statusText: {
        fontSize: 14,
        fontWeight: "700",
    },
    statusSubText: {
        fontSize: 12,
        color: "#94A3B8",
        marginTop: 4,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginTop: 30,
        marginBottom: 15,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "800",
        color: "#1E293B",
    },
    viewAllText: {
        fontSize: 13,
        color: "#2D935C",
        fontWeight: "700",
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 15,
        gap: 12,
    },
    statBox: {
        width: '47%',
        backgroundColor: '#FFF',
        borderRadius: 24,
        padding: 15,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        elevation: 1,
    },
    statIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statValText: {
        fontSize: 18,
        fontWeight: '900',
        color: '#1E293B',
    },
    statLabelText: {
        fontSize: 11,
        color: '#64748B',
        fontWeight: '600',
    },
    actionGrid: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        justifyContent: 'space-between',
        gap: 10,
    },
    actionItem: {
        alignItems: 'center',
        gap: 8,
    },
    actionIconBox: {
        width: 64,
        height: 64,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 5,
    },
    actionLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#475569',
    },
    requestsContainer: {
        paddingHorizontal: 20,
        gap: 12,
    },
    requestCard: {
        backgroundColor: '#FFF',
        borderRadius: 20,
        padding: 15,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#F1F5F9',
        elevation: 2,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 5,
    },
    requestIconBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#F0FDF4',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    requestMainInfo: {
        flex: 1,
    },
    requestName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: 2,
    },
    requestTime: {
        fontSize: 12,
        color: '#64748B',
    },
    requestStatusBox: {
        alignItems: 'flex-end',
    },
    statusBadge: {
        backgroundColor: '#FEF3C7',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
    },
    statusBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#92400E',
    },
    emptyRequestsCard: {
        backgroundColor: '#FFF',
        borderRadius: 28,
        padding: 30,
        alignItems: 'center',
        borderStyle: 'dashed',
        borderWidth: 2,
        borderColor: '#E2E8F0',
    },
    emptyRequestsText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#475569',
        marginTop: 15,
    },
    emptyRequestsSubText: {
        fontSize: 13,
        color: '#94A3B8',
        marginTop: 5,
        textAlign: 'center',
    },
    // KYC Styles
    kycOverlay: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 10000,
        backgroundColor: "rgba(15, 23, 42, 0.6)",
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
    },
    kycContent: {
        width: "100%",
        borderRadius: 40,
        padding: 32,
        alignItems: "center",
        elevation: 20,
        shadowColor: "#000",
        shadowOpacity: 0.3,
        shadowRadius: 20,
    },
    kycHeader: { alignItems: 'center', marginBottom: 32 },
    kyclIconBox: {
        width: 86,
        height: 86,
        borderRadius: 30,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 20,
        overflow: 'hidden'
    },
    kycTitle: {
        fontSize: 24,
        fontWeight: "900",
        color: "#1E293B",
        marginBottom: 10,
        textAlign: "center",
        letterSpacing: -0.5
    },
    kycDesc: {
        fontSize: 15,
        color: "#64748B",
        lineHeight: 22,
        textAlign: "center",
        paddingHorizontal: 10
    },
    stepBox: {
        width: "100%",
        gap: 0,
        marginBottom: 32,
    },
    step: {
        flexDirection: "row",
        alignItems: "center",
        height: 40,
        gap: 16
    },
    stepDot: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2
    },
    stepLine: {
        position: 'absolute',
        left: 13,
        top: 28,
        width: 2,
        height: 20,
        backgroundColor: '#10B981',
        zIndex: 1
    },
    stepText: {
        fontSize: 15,
        fontWeight: "700",
        color: "#475569",
    },
    kycCta: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: 'center',
        height: 60,
        width: '100%',
        borderRadius: 20,
        gap: 10,
        overflow: 'hidden',
        elevation: 8,
        shadowColor: '#1E293B',
        shadowOpacity: 0.3,
        shadowRadius: 10,
        marginBottom: 20
    },
    kycCtaText: {
        fontSize: 16,
        fontWeight: "800",
        color: "#FFF",
    },
    kycFooter: {
        fontSize: 11,
        color: "#94A3B8",
        fontWeight: "600",
        textTransform: 'uppercase',
        letterSpacing: 1
    }
});

