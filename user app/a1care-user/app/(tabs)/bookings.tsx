import React, { useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    StyleSheet,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { bookingsService } from '@/services/bookings.service';
import { Colors, Shadows } from '@/constants/colors';
import { FontSize } from '@/constants/spacing';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { SkeletonBookingCard } from '@/components/ui/Skeleton';
import { formatDateTime } from '@/utils/formatters';
import type { ServiceRequest, DoctorAppointment } from '@/types';

// ─── Tabs ─────────────────────────────────────────────────────────────────────
type TabId = 'upcoming' | 'ongoing' | 'completed' | 'cancelled';

const TABS: { id: TabId; label: string }[] = [
    { id: 'upcoming', label: 'Upcoming' },
    { id: 'ongoing', label: 'Ongoing' },
    { id: 'completed', label: 'Completed' },
    { id: 'cancelled', label: 'Cancelled' },
];

// Map statuses to tabs
const SERVICE_TAB: Record<string, TabId> = {
    PENDING: 'upcoming',
    BROADCASTED: 'upcoming',
    ACCEPTED: 'ongoing',
    IN_PROGRESS: 'ongoing',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
};

const APPT_TAB: Record<string, TabId> = {
    Pending: 'upcoming',
    Confirmed: 'ongoing',
    Completed: 'completed',
    Cancelled: 'cancelled',
};

// ─── Booking card ──────────────────────────────────────────────────────────────
function ServiceCard({ booking, onPress }: { booking: ServiceRequest; onPress: () => void }) {
    const name =
        typeof booking.childServiceId === 'object' && booking.childServiceId
            ? (booking.childServiceId as any).name ?? 'Home Service'
            : 'Home Service';

    const isOnline = booking.paymentMode === 'ONLINE';
    const isPaid = booking.paymentStatus === 'COMPLETED';
    const paymentLabel = isOnline ? (isPaid ? 'Paid online' : 'Online (pending)') : 'Cash on delivery';

    return (
        <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
            <View style={styles.cardTop}>
                <View style={styles.cardIconBg}>
                    <Text style={{ fontSize: 22 }}>⚕️</Text>
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.cardName} numberOfLines={1}>{name}</Text>
                    <Text style={styles.cardType}>Home Healthcare Service</Text>
                </View>
                <StatusBadge status={booking.status} />
            </View>
            <View style={styles.cardDivider} />
            <View style={styles.cardBottom}>
                <Text style={styles.cardMeta}>
                    📅 {formatDateTime(booking.createdAt)}
                </Text>
                <Text style={styles.cardMeta}>💵 {paymentLabel}</Text>
            </View>
        </TouchableOpacity>
    );
}

function AppointmentCard({ appt, onPress }: { appt: DoctorAppointment; onPress?: () => void }) {
    const isOnline = appt.paymentMode === 'ONLINE';
    const isPaid = appt.paymentStatus === 'COMPLETED';
    const paymentLabel = isOnline ? (isPaid ? 'Paid online' : 'Online (pending)') : 'Cash on delivery';

    return (
        <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
            <View style={styles.cardTop}>
                <View style={[styles.cardIconBg, { backgroundColor: '#E9F7EF' }]}>
                    <Text style={{ fontSize: 22 }}>🩺</Text>
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.cardName} numberOfLines={1}>Doctor Appointment</Text>
                    <Text style={styles.cardType}>Doctor Consult</Text>
                </View>
                <StatusBadge status={appt.status ?? 'Pending'} />
            </View>
            <View style={styles.cardDivider} />
            <View style={styles.cardBottom}>
                <Text style={styles.cardMeta}>
                    📅 {appt.date} · {appt.timeSlot ?? '—'}
                </Text>
                <Text style={styles.cardMeta}>💵 {paymentLabel}</Text>
            </View>
        </TouchableOpacity>
    );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function BookingsScreen() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<TabId>('upcoming');
    const [refreshing, setRefreshing] = useState(false);

    const {
        data: serviceBookings,
        isLoading: sbLoading,
        isError: sbErr,
        refetch: refetchSB,
    } = useQuery({
        queryKey: ['service-bookings-all'],
        queryFn: bookingsService.getMyServiceBookings,
        retry: 2,
    });

    const {
        data: appointments,
        isLoading: apptLoading,
        isError: apptErr,
        refetch: refetchAppt,
    } = useQuery({
        queryKey: ['appointments'],
        queryFn: bookingsService.getMyAppointments,
        retry: 2,
    });

    const onRefresh = async () => {
        setRefreshing(true);
        await Promise.all([refetchSB(), refetchAppt()]);
        setRefreshing(false);
    };

    const isLoading = sbLoading || apptLoading;
    const isError = sbErr || apptErr;

    // Filter by tab
    const filteredServiceBookings = (serviceBookings ?? []).filter(
        (b) => SERVICE_TAB[b.status] === activeTab
    );
    const filteredAppts = (appointments ?? []).filter(
        (a) => APPT_TAB[a.status ?? 'Pending'] === activeTab
    );

    const isEmpty = filteredServiceBookings.length === 0 && filteredAppts.length === 0 && !isLoading;

    return (
        <SafeAreaView style={styles.root} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>My Bookings</Text>
                <Text style={styles.headerCount}>
                    {(serviceBookings?.length ?? 0) + (appointments?.length ?? 0)} total
                </Text>
            </View>

            {/* Tabs */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tabsRow}
                style={styles.tabsScroll}
            >
                {TABS.map((t) => {
                    const sbCount = (serviceBookings ?? []).filter((b) => SERVICE_TAB[b.status] === t.id).length;
                    const apptCount = (appointments ?? []).filter((a) => APPT_TAB[a.status ?? 'Pending'] === t.id).length;
                    const count = sbCount + apptCount;
                    return (
                        <TouchableOpacity
                            key={t.id}
                            style={[styles.tab, activeTab === t.id ? styles.tabActive : {}]}
                            onPress={() => setActiveTab(t.id)}
                        >
                            <Text style={[styles.tabText, activeTab === t.id ? styles.tabTextActive : {}]}>
                                {t.label}
                            </Text>
                            {count > 0 && (
                                <View style={[styles.tabBadge, activeTab === t.id ? styles.tabBadgeActive : {}]}>
                                    <Text style={[styles.tabBadgeText, activeTab === t.id ? styles.tabBadgeTextActive : {}]}>
                                        {count}
                                    </Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            {/* Content */}
            {isError ? (
                <ErrorState message="Failed to load bookings" onRetry={onRefresh} />
            ) : (
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.list}
                    refreshControl={
                        <RefreshControl
                            refreshing={!!refreshing}
                            onRefresh={onRefresh}
                            colors={[Colors.primary]}
                        />
                    }
                >
                    {isLoading ? (
                        <>
                            <SkeletonBookingCard />
                            <SkeletonBookingCard />
                            <SkeletonBookingCard />
                        </>
                    ) : isEmpty ? (
                        <EmptyState
                            icon={
                                activeTab === 'upcoming' ? '📅'
                                    : activeTab === 'ongoing' ? '🔄'
                                        : activeTab === 'completed' ? '✅'
                                            : '❌'
                            }
                            title={`No ${activeTab} bookings`}
                            subtitle={
                                activeTab === 'upcoming'
                                    ? 'Book a home-care service to get started'
                                    : activeTab === 'ongoing'
                                        ? 'No active bookings right now'
                                        : `Your ${activeTab} bookings will appear here`
                            }
                            actionLabel={activeTab === 'upcoming' ? 'Browse Services' : undefined}
                            onAction={activeTab === 'upcoming' ? () => router.push('/(tabs)/services') : undefined}
                        />
                    ) : (
                        <>
                            {filteredAppts.map((a) => (
                                <AppointmentCard key={a._id} appt={a} onPress={() => Alert.alert('Appointment Details', `Date: ${a.date}\nTime: ${a.timeSlot ?? '—'}\nStatus: ${a.status ?? 'Pending'}\n\nDetailed tracking coming in V2.`)} />
                            ))}
                            {filteredServiceBookings.map((b) => (
                                <ServiceCard
                                    key={b._id}
                                    booking={b}
                                    onPress={() =>
                                        router.push({ pathname: '/booking/[id]', params: { id: b._id } })
                                    }
                                />
                            ))}
                        </>
                    )}
                    <View style={{ height: 80 }} />
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: Colors.background },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 16,
        backgroundColor: Colors.card,
        ...Shadows.card,
    },
    headerTitle: { fontSize: FontSize['2xl'], fontWeight: '700', color: Colors.textPrimary },
    headerCount: { fontSize: FontSize.sm, color: Colors.textSecondary },

    tabsScroll: {
        backgroundColor: Colors.card,
        height: 64, // Explicitly set height to prevent vertical clipping
    },
    tabsRow: {
        paddingHorizontal: 16,
        paddingVertical: 0,
        height: '100%',
        gap: 10,
        alignItems: 'center',
    },
    tab: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 16,
        height: 38, // Fixed height for consistent look
        borderRadius: 19,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    tabActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    tabText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary },
    tabTextActive: { color: '#fff' },
    tabBadge: {
        backgroundColor: Colors.border,
        borderRadius: 10,
        minWidth: 18,
        height: 18,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 5,
    },
    tabBadgeActive: { backgroundColor: 'rgba(255,255,255,0.3)' },
    tabBadgeText: { fontSize: 10, fontWeight: '700', color: Colors.textSecondary },
    tabBadgeTextActive: { color: '#fff' },

    list: { padding: 16 },

    card: {
        backgroundColor: Colors.card,
        borderRadius: 16,
        marginBottom: 12,
        overflow: 'hidden',
        ...Shadows.card,
    },
    cardTop: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        gap: 12,
    },
    cardIconBg: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: Colors.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardName: {
        fontSize: FontSize.base,
        fontWeight: '700',
        color: Colors.textPrimary,
        marginBottom: 3,
    },
    cardType: { fontSize: FontSize.xs, color: Colors.textSecondary },
    cardDivider: { height: 1, backgroundColor: Colors.border, marginHorizontal: 14 },
    cardBottom: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    cardMeta: { fontSize: FontSize.xs, color: Colors.textSecondary },
});
