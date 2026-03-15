import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, RefreshControl, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import { useAuthStore } from "../../stores/auth";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons";

export default function ProfileScreen() {
    const { user, logout } = useAuthStore() as any;
    const router = useRouter();

    const { data: staffData, isLoading: loadingStaff } = useQuery({
        queryKey: ["profileStaffDetails"],
        queryFn: async () => {
            const res = await api.get("/doctor/auth/details");
            return res.data.data;
        }
    });

    const { data: bookings = [] } = useQuery({
        queryKey: ["profileBookings"],
        queryFn: async () => {
            const res = await api.get("/appointment/provider/appointments");
            return res.data.data || [];
        }
    });

    const pendingCount = bookings.filter((b: any) => b.status === "Pending").length;
    const confirmedCount = bookings.filter((b: any) => b.status === "Confirmed" || b.status === "Active").length;



    const handleLogout = () => {
        Alert.alert("Logout", "Are you sure you want to log out?", [
            { text: "Cancel", style: "cancel" },
            { text: "Logout", style: "destructive", onPress: () => { logout(); router.replace("/onboarding"); } },
        ]);
    };

    const handleNavigation = (path: string) => {
        if (path === "profile") {
            router.push("/profile_edit");
        } else if (path === "subscriptions") {
            router.push("/subscriptions");
        } else if (path === "bank") {
            router.push("/bank_details");
        } else if (path === "raise-ticket") {
            router.push("/raise_ticket");
        } else if (path === "faq") {
            router.push("/faq");
        } else if (path === "privacy") {
            router.push("/privacy");
        } else if (path === "terms") {
            router.push("/terms");
        }
    };

    return (
        <SafeAreaView style={styles.container}>


            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* User Info Section - Removed Card Background */}
                <View style={styles.userInfoRow}>
                    <View style={styles.userInfoText}>
                        <Text style={styles.greetingText}>Hello, {user?.name ?? "Partner"}</Text>
                        <Text style={styles.infoSubText}>Mobile: {user?.mobileNumber ?? "—"}</Text>
                        <Text style={styles.infoSubText}>{user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) + " A1care Partner" : "A1care Partner"}</Text>
                    </View>
                    <View style={styles.avatarPlaceholder}>
                        {staffData?.profileImage || user?.profileImage ? (
                            <Image
                                source={{ uri: staffData?.profileImage || user?.profileImage }}
                                style={{ width: "100%", height: "100%", borderRadius: 40 }}
                            />
                        ) : (
                            <Ionicons name="person" size={40} color="#CBD5E1" />
                        )}
                    </View>
                </View>

                {/* Wallet Card - Matched Gradient to Mockup */}
                <TouchableOpacity onPress={() => router.push("/wallet_history")}>
                    <LinearGradient
                        colors={["#417D77", "#9EBB58"]}
                        start={{ x: 0, y: 0.5 }}
                        end={{ x: 1, y: 0.5 }}
                        style={styles.walletCard}
                    >
                        <Text style={styles.walletTitle}>A1Care Wallet</Text>
                        <Text style={styles.balanceLabel}>Balance</Text>
                        <Text style={styles.balanceAmount}>₹{staffData?.walletBalance ?? "0"}</Text>

                        <View style={styles.walletFooter}>
                            <View>
                                <Text style={styles.walletId}>WLT-{user?.id?.slice(-12).toUpperCase() ?? "A1C8B2E9F1D0"}</Text>
                                <Text style={styles.walletUserName}>{user?.name ?? "Vamsi Reddy"}</Text>
                            </View>
                            <Text style={styles.disaText}>A1CARE</Text>
                        </View>
                    </LinearGradient>
                </TouchableOpacity>

                {/* Quick Access - Matched Mockup */}
                <Text style={styles.sectionTitle}>Quick Actions</Text>
                <View style={styles.quickActionsGrid}>
                    <TouchableOpacity style={styles.actionCard} onPress={() => router.push("/(tabs)/bookings")}>
                        <View style={styles.actionIconBg}>
                            <Ionicons name="calendar-outline" size={30} color="#15803D" />
                        </View>
                        <Text style={styles.actionLabel}>Upcoming</Text>
                        <View style={styles.actionBadge}>
                            <Text style={styles.actionBadgeText}>{confirmedCount}</Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionCard} onPress={() => handleNavigation("subscriptions")}>
                        <View style={styles.actionIconBg}>
                            <Ionicons name="ribbon-outline" size={30} color="#15803D" />
                        </View>
                        <Text style={styles.actionLabel}>Subscriptions</Text>
                        <View style={styles.actionBadge}>
                            <Text style={styles.actionBadgeText}>0</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Documents Section - Updated Title */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, marginTop: 10 }}>
                    <Text style={[styles.sectionTitle, { marginBottom: 0, marginTop: 0, marginRight: 8 }]}>Verified Documents</Text>
                    <Ionicons name="checkmark-circle" size={18} color="#15803D" />
                </View>
                <View style={styles.docsContainer}>
                    {staffData?.documents && staffData.documents.length > 0 ? (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 5 }}>
                            {staffData.documents.map((doc: any, idx: number) => (
                                <TouchableOpacity key={idx} style={styles.docItem}>
                                    <View style={styles.docIconBox}>
                                        <Ionicons name="document-attach" size={24} color="#15803D" />
                                    </View>
                                    <Text style={styles.docName} numberOfLines={1}>{doc.type}</Text>
                                    <Text style={styles.docStatus}>Verified</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    ) : (
                        <View style={styles.emptyDocs}>
                            <Text style={styles.emptyDocsText}>No documents uploaded yet.</Text>
                        </View>
                    )}
                </View>

                {/* Main Menu - Updated with Subscription Management */}
                <Text style={styles.sectionTitle}>Account & Settings</Text>
                <View style={styles.menuContainer}>
                    <MenuLink
                        icon={<Ionicons name="person-outline" size={22} color="#15803D" />}
                        title="My Profile"
                        subtitle="Manage personal information"
                        onPress={() => handleNavigation("profile")}
                    />
                    <MenuLink
                        icon={<Ionicons name="ribbon-outline" size={22} color="#15803D" />}
                        title="Subscription Management"
                        subtitle="Manage your platform plans"
                        onPress={() => handleNavigation("subscriptions")}
                    />
                    <MenuLink
                        icon={<Ionicons name="card-outline" size={22} color="#15803D" />}
                        title="Bank Details"
                        subtitle="Configure your payout method"
                        onPress={() => handleNavigation("bank")}
                    />
                </View>

                {/* Support Section - Matched Request */}
                <Text style={styles.sectionTitle}>Support & Help</Text>
                <View style={styles.menuContainer}>
                    <MenuLink
                        icon={<MaterialCommunityIcons name="ticket-confirmation-outline" size={22} color="#15803D" />}
                        title="Raise Ticket"
                        subtitle="Report an issue or get assistance"
                        onPress={() => handleNavigation("raise-ticket")}
                    />

                    <MenuLink
                        icon={<Ionicons name="help-circle-outline" size={22} color="#15803D" />}
                        title="FAQ"
                        subtitle="Frequently asked questions"
                        onPress={() => handleNavigation("faq")}
                    />
                </View>

                {/* Legal Section - Added per Request */}
                <Text style={styles.sectionTitle}>Legal</Text>
                <View style={styles.menuContainer}>
                    <MenuLink
                        icon={<Ionicons name="shield-checkmark-outline" size={22} color="#15803D" />}
                        title="Privacy Policy"
                        subtitle="How we protect your data"
                        onPress={() => handleNavigation("privacy")}
                    />
                    <MenuLink
                        icon={<Ionicons name="document-text-outline" size={22} color="#15803D" />}
                        title="Terms & Conditions"
                        subtitle="Platform usage agreement"
                        onPress={() => handleNavigation("terms")}
                    />
                </View>

                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                    <Ionicons name="log-out-outline" size={20} color="#EF4444" />
                    <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>

                <View style={{ height: 60 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

function MenuLink({ icon, title, subtitle, onPress, hideArrow = false }: { icon: any, title: string, subtitle: string, onPress: () => void, hideArrow?: boolean }) {
    return (
        <TouchableOpacity style={styles.menuItem} onPress={onPress}>
            <View style={styles.menuIconBox}>
                {icon}
            </View>
            <View style={styles.menuTextContainer}>
                <Text style={styles.menuTitle}>{title}</Text>
                <Text style={styles.menuSubtitle}>{subtitle}</Text>
            </View>
            {!hideArrow && <Ionicons name="chevron-forward" size={18} color="#94A3B8" />}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#EBF1F5",
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 10,
    },
    userInfoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        paddingVertical: 10,
    },
    userInfoText: {
        flex: 1,
    },
    greetingText: {
        fontSize: 22,
        fontWeight: '800',
        color: "#1E293B",
        marginBottom: 2,
    },
    infoSubText: {
        fontSize: 14,
        color: "#64748B",
        marginBottom: 2,
    },
    avatarPlaceholder: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: "#F1F5F9",
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    walletCard: {
        borderRadius: 28,
        padding: 24,
        height: 190,
        marginBottom: 30,
        elevation: 10,
        shadowColor: "#417D77",
        shadowOpacity: 0.3,
        shadowRadius: 20,
    },
    walletTitle: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 16,
        fontWeight: '700',
    },
    balanceLabel: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 13,
        marginTop: 18,
    },
    balanceAmount: {
        color: '#FFF',
        fontSize: 48,
        fontWeight: '900',
        lineHeight: 56,
        letterSpacing: -1,
    },
    walletFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginTop: 'auto',
    },
    walletId: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 11,
        fontWeight: '500',
    },
    walletUserName: {
        color: '#FFF',
        fontSize: 15,
        fontWeight: '700',
        marginTop: 2,
    },
    disaText: {
        color: 'rgba(255,255,255,0.25)',
        fontSize: 36,
        fontWeight: '900',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: "#334155",
        marginBottom: 16,
        marginTop: 10,
    },
    quickActionsGrid: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 30,
    },
    actionCard: {
        flex: 1,
        backgroundColor: '#FFF',
        borderRadius: 24,
        padding: 18,
        alignItems: 'center',
        position: 'relative',
        borderWidth: 1,
        borderColor: '#F1F5F9',
        elevation: 2,
    },
    actionIconBg: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#F0FDF4',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    actionLabel: {
        fontSize: 15,
        fontWeight: '700',
        color: '#334155',
    },
    actionBadge: {
        position: 'absolute',
        top: 15,
        right: 15,
        backgroundColor: '#15803D',
        width: 26,
        height: 26,
        borderRadius: 13,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#FFF',
    },
    actionBadgeText: {
        color: '#FFF',
        fontSize: 11,
        fontWeight: 'bold',
    },
    docsContainer: {
        marginBottom: 30,
        backgroundColor: '#FFF',
        padding: 16,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    docItem: {
        width: 100,
        alignItems: 'center',
    },
    docIconBox: {
        width: 50,
        height: 50,
        borderRadius: 16,
        backgroundColor: '#F0FDF4',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    docName: {
        fontSize: 12,
        fontWeight: '700',
        color: '#475569',
        textAlign: 'center',
    },
    docStatus: {
        fontSize: 10,
        color: '#15803D',
        fontWeight: '600',
        marginTop: 2,
    },
    emptyDocs: {
        padding: 20,
        alignItems: 'center',
    },
    emptyDocsText: {
        color: '#94A3B8',
        fontSize: 13,
    },
    menuContainer: {
        backgroundColor: '#FFF',
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#F1F5F9',
        marginBottom: 25,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 18,
        borderBottomWidth: 1,
        borderBottomColor: '#F8FAFC',
    },
    menuIconBox: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: '#F8FAFC',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    menuTextContainer: {
        flex: 1,
    },
    menuTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1E293B',
    },
    menuSubtitle: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 2,
    },
    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 18,
        backgroundColor: '#FFF',
        borderRadius: 24,
        borderWidth: 1,
        borderColor: '#FEE2E2',
        gap: 10,
    },
    logoutText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#EF4444',
    },

});

