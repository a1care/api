import React from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { bookingsService } from '@/services/bookings.service';
import { Colors, Shadows } from '@/constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { FontSize } from '@/constants/spacing';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/EmptyState';
import { formatDateTime } from '@/utils/formatters';
import { MapPin, MessageSquare, XCircle } from 'lucide-react-native';
import type { Address, ServiceRequest } from '@/types';

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_STEPS: Array<{ status: string; label: string; icon: string; desc: string }> = [
    { status: 'PENDING', icon: '⏳', label: 'Pending', desc: 'Waiting to be broadcasted' },
    { status: 'BROADCASTED', icon: '📡', label: 'Finding', desc: 'Locating nearest provider' },
    { status: 'ACCEPTED', icon: '✅', label: 'Accepted', desc: 'Provider confirmed' },
    { status: 'IN_PROGRESS', icon: '🚗', label: 'In Progress', desc: 'Provider on the way' },
    { status: 'COMPLETED', icon: '🎉', label: 'Completed', desc: 'Service successfully done' },
];

const STATUS_ORDER = STATUS_STEPS.map((s) => s.status);

function formatAddress(address?: Address | string | null) {
    if (!address) return '';
    if (typeof address === 'string') return address;

    return [
        address.moreInfo,
        address.street,
        address.city,
        address.state,
        address.pincode,
    ].filter(Boolean).join(', ');
}

function getBookingAddress(booking: ServiceRequest) {
    const data = booking as ServiceRequest & {
        addressId?: Address | string;
        location?: { address?: string };
    };

    return (
        formatAddress(data.addressId) ||
        data.location?.address ||
        data.address ||
        'Not specified'
    );
}

// ─── Status progression banner ────────────────────────────────────────────────
const STATUS_BG: Record<string, string> = {
    PENDING: '#FEF9C3',
    BROADCASTED: '#F3E8FF',
    ACCEPTED: '#D1EFE0',
    IN_PROGRESS: '#DBEAFE',
    COMPLETED: '#D1FAE5',
    CANCELLED: '#FEE2E2',
};

function StatusHero({ status }: { status: string }) {
    const step = STATUS_STEPS.find((s) => s.status === status);
    const bg = STATUS_BG[status] ?? '#F3F4F6';
    return (
        <View style={[styles.statusHero, { backgroundColor: bg }]}>
            <Text style={styles.statusHeroIcon}>{step?.icon ?? '🔵'}</Text>
            <Text style={styles.statusHeroLabel}>{step?.label ?? status.replace('_', ' ')}</Text>
            <Text style={styles.statusHeroDesc}>{step?.desc ?? ''}</Text>
        </View>
    );
}

// ─── Timeline ─────────────────────────────────────────────────────────────────
function Timeline({ status }: { status: string }) {
    const currentIdx = STATUS_ORDER.indexOf(status);
    const isCancelled = status === 'CANCELLED';

    if (isCancelled) {
        return (
            <View style={[styles.card, styles.cancelledBox]}>
                <Text style={styles.cancelledText}>❌ This booking has been cancelled.</Text>
            </View>
        );
    }

    return (
        <View style={styles.card}>
            <Text style={styles.cardTitle}>Booking Progress</Text>
            {STATUS_STEPS.map((s, idx) => {
                const done = currentIdx > idx;
                const active = currentIdx === idx;
                return (
                    <View key={s.status} style={styles.timelineRow}>
                        <View style={styles.timelineLeft}>
                            <View
                                style={[
                                    styles.timelineDot,
                                    done ? styles.timelineDotDone : {},
                                    active ? styles.timelineDotActive : {},
                                ]}
                            >
                                {done ? (
                                    <Text style={styles.timelineCheck}>✓</Text>
                                ) : active ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : null}
                            </View>
                            {idx < STATUS_STEPS.length - 1 && (
                                <View style={[styles.timelineLine, done ? styles.timelineLineDone : {}]} />
                            )}
                        </View>
                        <View style={styles.timelineContent}>
                            <Text
                                style={[
                                    styles.timelineLabel,
                                    active ? styles.timelineLabelActive : {},
                                    done ? styles.timelineLabelDone : {},
                                ]}
                            >
                                {s.icon} {s.label}
                            </Text>
                            {active && (
                                <Text style={styles.timelineDesc}>{s.desc}</Text>
                            )}
                        </View>
                    </View>
                );
            })}
        </View>
    );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function BookingDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();

    const { data: booking, isLoading, isError, refetch } = useQuery({
        queryKey: ['service-booking', id],
        queryFn: () => bookingsService.getServiceBookingById(id!),
        refetchInterval: 12000, // Poll every 12 seconds for status updates
        retry: 2,
    });

    return (
        <SafeAreaView style={styles.root} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Text style={styles.backText}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Booking Details</Text>
                <TouchableOpacity onPress={() => refetch()} style={styles.refreshBtn}>
                    <Text style={styles.refreshText}>↻</Text>
                </TouchableOpacity>
            </View>

            {isLoading ? (
                <View style={styles.centerLoader}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                    <Text style={styles.loaderText}>Loading booking…</Text>
                </View>
            ) : isError || !booking ? (
                <ErrorState
                    message="Could not load booking details"
                    onRetry={() => refetch()}
                />
            ) : (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
                    {/* Status Hero */}
                    <StatusHero status={booking.status} />

                    {/* Info Card */}
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Booking Information</Text>
                        {(() => {
                            const isOnline = booking.paymentMode === 'ONLINE';
                            const isPaid = booking.paymentStatus === 'COMPLETED';
                            const paymentLabel = isOnline ? (isPaid ? '💵 Paid online' : '💵 Online (pending)') : '💵 Cash on Delivery';

                            return [
                                { label: 'Booking ID', value: `#${booking._id.slice(-10).toUpperCase()}` },
                                { label: 'Status', value: <StatusBadge status={booking.status} size="md" /> },
                                { label: 'Booked On', value: formatDateTime(booking.createdAt) },
                                { label: 'Address', value: getBookingAddress(booking) },
                                { label: 'Schedule', value: (booking as any).scheduledTime ?? 'ASAP' },
                                { label: 'Payment', value: paymentLabel },
                            ];
                        })().map((r) => (
                            <View key={r.label} style={styles.infoRow}>
                                <Text style={styles.infoLabel}>{r.label}</Text>
                                {typeof r.value === 'string' ? (
                                    <Text style={styles.infoValue} numberOfLines={3}>{r.value}</Text>
                                ) : (
                                    r.value
                                )}
                            </View>
                        ))}
                    </View>

                    {/* Timeline */}
                    <Timeline status={booking.status} />

                    {/* Polling indicator */}
                    <View style={styles.pollingNote}>
                        <Text style={styles.pollingText}>🔄 Status auto-updates every 12 seconds</Text>
                    </View>

                    {/* Live Support / Tracking */}
                    {booking.status === 'ACCEPTED' || booking.status === 'IN_PROGRESS' ? (
                        <View style={styles.card}>
                            <Text style={styles.cardTitle}>Live Support</Text>
                            <View style={styles.actionGrid}>
                                <TouchableOpacity 
                                    style={styles.actionBtn}
                                    onPress={() => router.push({
                                        pathname: '/booking/track' as any,
                                        params: { id: booking._id, providerId: (booking as any).assignedProviderId?._id || (booking as any).assignedProviderId }
                                    })}
                                >
                                    <View style={[styles.actionIcon, { backgroundColor: '#E0F2FE' }]}>
                                        <MapPin size={22} color="#0369A1" />
                                    </View>
                                    <Text style={styles.actionLabel}>Track Live</Text>
                                </TouchableOpacity>

                                <TouchableOpacity 
                                    style={styles.actionBtn}
                                    onPress={() => router.push({
                                        pathname: '/booking/chat' as any,
                                        params: { id: booking._id, name: (booking as any).assignedProviderId?.name || 'Provider' }
                                    })}
                                >
                                    <View style={[styles.actionIcon, { backgroundColor: '#F0FDF4' }]}>
                                        <MessageSquare size={22} color="#15803D" />
                                    </View>
                                    <Text style={styles.actionLabel}>Chat</Text>
                                </TouchableOpacity>

                                {booking.status === 'ACCEPTED' || booking.status === 'IN_PROGRESS' ? (
                                    <TouchableOpacity 
                                        style={styles.actionBtn}
                                        onPress={() => router.push({
                                            pathname: '/video-call' as any,
                                            params: { bookingId: booking._id, channelName: booking._id }
                                        })}
                                    >
                                        <View style={[styles.actionIcon, { backgroundColor: '#FFF7ED' }]}>
                                            <Ionicons name="videocam" size={22} color="#C2410C" />
                                        </View>
                                        <Text style={styles.actionLabel}>Video Call</Text>
                                    </TouchableOpacity>
                                ) : null}
                            </View>
                        </View>
                    ) : null}

                    {/* Actions */}
                    {booking.status === 'PENDING' || booking.status === 'BROADCASTED' || booking.status === 'ACCEPTED' ? (
                        <View style={styles.card}>
                            <Text style={styles.cardTitle}>Actions</Text>
                            <Button
                                label="Cancel Booking"
                                icon={<XCircle size={18} color="#fff" />}
                                onPress={() => {
                                    import('react-native').then(({ Alert }) => {
                                        Alert.alert(
                                            'Cancel Booking',
                                            'Are you sure you want to cancel this booking?',
                                            [
                                                { text: 'No', style: 'cancel' },
                                                {
                                                    text: 'Yes, Cancel',
                                                    style: 'destructive',
                                                    onPress: async () => {
                                                        try {
                                                            await bookingsService.updateServiceBookingStatus(booking._id, 'CANCELLED');
                                                            refetch();
                                                        } catch (error: any) {
                                                            Alert.alert('Error', error?.response?.data?.message || 'Failed to cancel booking');
                                                        }
                                                    }
                                                }
                                            ]
                                        );
                                    });
                                }}
                                variant="danger"
                                size="md"
                                fullWidth
                            />
                        </View>
                    ) : null}

                    {booking.status === 'COMPLETED' && (
                        <View style={styles.card}>
                            <Text style={styles.cardTitle}>Rate Your Experience</Text>
                            <Text style={styles.codReminderText}>
                                Your feedback helps us improve. Please share your experience!
                            </Text>
                            <Button
                                label="Write a Review"
                                onPress={() => router.push({
                                    pathname: '/booking/feedback',
                                    params: {
                                        bookingId: booking._id,
                                        bookingType: 'Service',
                                        childServiceId: (booking as any).childServiceId?._id || (booking as any).childServiceId,
                                        name: (booking as any).childServiceId?.name || 'Service'
                                    }
                                })}
                                variant="outline"
                                size="sm"
                                style={{ marginTop: 12 }}
                            />
                        </View>
                    )}

                    <View style={{ height: 40 }} />
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
        paddingVertical: 14,
        backgroundColor: Colors.card,
        ...Shadows.card,
    },
    backBtn: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: Colors.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    backText: { fontSize: 20, color: Colors.textPrimary },
    headerTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary },
    refreshBtn: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: Colors.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    refreshText: { fontSize: 20, color: Colors.primary, fontWeight: '700' },

    centerLoader: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
    loaderText: { color: Colors.textSecondary, fontSize: FontSize.base },

    scroll: { padding: 16, gap: 12 },

    // Status hero
    statusHero: {
        borderRadius: 22,
        padding: 28,
        alignItems: 'center',
    },
    statusHeroIcon: { fontSize: 52, marginBottom: 12 },
    statusHeroLabel: { fontSize: FontSize['2xl'], fontWeight: '700', color: Colors.textPrimary, marginBottom: 6 },
    statusHeroDesc: { fontSize: FontSize.sm, color: Colors.textSecondary },

    // Cards
    card: {
        backgroundColor: Colors.card,
        borderRadius: 16,
        padding: 16,
        ...Shadows.card,
    },
    cardTitle: { fontSize: FontSize.base, fontWeight: '700', color: Colors.textPrimary, marginBottom: 14 },

    // Info rows
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
        gap: 10,
    },
    infoLabel: { fontSize: FontSize.sm, color: Colors.textSecondary, flexShrink: 0, width: 85 },
    infoValue: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textPrimary, flex: 1, textAlign: 'right' },

    // Timeline
    timelineRow: { flexDirection: 'row', marginBottom: 4, minHeight: 40 },
    timelineLeft: { alignItems: 'center', width: 32 },
    timelineDot: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: Colors.border,
        justifyContent: 'center',
        alignItems: 'center',
    },
    timelineDotActive: { backgroundColor: Colors.primary },
    timelineDotDone: { backgroundColor: Colors.health },
    timelineCheck: { fontSize: 12, fontWeight: '700', color: '#fff' },
    timelineLine: { width: 2, flex: 1, backgroundColor: Colors.border, marginVertical: 2 },
    timelineLineDone: { backgroundColor: Colors.health },
    timelineContent: { flex: 1, paddingLeft: 12, paddingBottom: 8 },
    timelineLabel: { fontSize: FontSize.base, color: Colors.textSecondary, fontWeight: '500' },
    timelineLabelActive: { color: Colors.primary, fontWeight: '700' },
    timelineLabelDone: { color: Colors.health, fontWeight: '600' },
    timelineDesc: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },

    cancelledBox: { borderWidth: 1.5, borderColor: '#FDD8D8' },
    cancelledText: { fontSize: FontSize.base, color: Colors.emergency, fontWeight: '500', textAlign: 'center' },

    pollingNote: {
        backgroundColor: Colors.background,
        borderRadius: 10,
        padding: 10,
        alignItems: 'center',
    },
    pollingText: { fontSize: FontSize.xs, color: Colors.muted },

    codReminderText: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
    actionGrid: { flexDirection: 'row', gap: 12 },
    actionBtn: { flex: 1, alignItems: 'center', gap: 8 },
    actionIcon: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
    actionLabel: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.textPrimary },
});
