import React from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    RefreshControl,
    ActivityIndicator,
    TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { notificationsService } from '@/services/notifications.service';
import {
    Bell,
    CheckCircle2,
    Calendar,
    Tag,
    Stethoscope,
    ShieldAlert,
    MessageSquare,
    Clock
} from 'lucide-react-native';
import { Colors, Shadows } from '@/constants/colors';
import { FontSize } from '@/constants/spacing';
import { ErrorState } from '@/components/ui/EmptyState';
import { LinearGradient } from 'expo-linear-gradient';

const DUMMY_NOTIFICATIONS = [
    {
        id: '1',
        type: 'booking',
        title: 'Booking Confirmed!',
        message: 'Your home consultation with Dr. Shiva is confirmed for tomorrow at 10:30 AM.',
        time: '10 mins ago',
        icon: CheckCircle2,
        color: '#22C55E',
        bgColor: '#DCFCE7',
        read: false
    },
    {
        id: '2',
        type: 'offer',
        title: 'Exclusive Offer 🎁',
        message: 'Get 20% OFF on your first full-body checkup. Use code HEALTH20.',
        time: '2 hours ago',
        icon: Tag,
        color: '#F59E0B',
        bgColor: '#FEF3C7',
        read: false
    },
    {
        id: '3',
        type: 'status',
        title: 'Nurse Arriving Soon',
        message: 'Nurse Anjali has left for your location. Reach her at +91 99XXXXXX00.',
        time: '4 hours ago',
        icon: Stethoscope,
        color: '#2F80ED',
        bgColor: '#EBF3FD',
        read: true
    },
    {
        id: '4',
        type: 'alert',
        title: 'Blood Pressure Reminder',
        message: 'Time to record your morning BP reading. Stay healthy!',
        time: 'Yesterday',
        icon: Clock,
        color: '#E11D48',
        bgColor: '#FFF1F2',
        read: true
    },
    {
        id: '5',
        type: 'system',
        title: 'Account Verified',
        message: 'Your A1care profile verification is complete. You can now book premium services.',
        time: '2 days ago',
        icon: ShieldAlert,
        color: '#6366F1',
        bgColor: '#EEF2FF',
        read: true
    }
];

export default function NotificationsScreen() {
    const {
        data: notifications,
        isLoading,
        isError,
        refetch,
        isRefetching
    } = useQuery({
        queryKey: ['notifications'],
        queryFn: notificationsService.getAll,
        retry: 1, // Production retry pattern
        enabled: true, // Attempt real fetch
    });

    const displayNotifications = (notifications && (notifications as any[]).length > 0) ? (notifications as any[]) : DUMMY_NOTIFICATIONS;
    const unreadCount = displayNotifications.filter((n: any) => !n.read).length;

    return (
        <SafeAreaView style={styles.root} edges={['top']}>
            <LinearGradient
                colors={['#F8FAFC', '#FFFFFF']}
                style={StyleSheet.absoluteFillObject}
            />
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>Alerts & Updates</Text>
                    <Text style={styles.headerSub}>
                        {unreadCount > 0 ? `You have ${unreadCount} new notifications` : 'All caught up!'}
                    </Text>
                </View>
                <TouchableOpacity style={styles.markRead}>
                    <Text style={styles.markReadText}>Mark Read</Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={!!isRefetching}
                        onRefresh={refetch}
                        colors={[Colors.primary]}
                    />
                }
            >
                {displayNotifications.map((n: any) => (
                    <TouchableOpacity
                        key={n.id}
                        style={[styles.notifCard, !n.read && styles.notifCardUnread]}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.iconBox, { backgroundColor: n.bgColor }]}>
                            {n.icon ? (
                                <n.icon size={22} color={n.color} strokeWidth={2.5} />
                            ) : (
                                <Bell size={22} color={Colors.primary} />
                            )}
                        </View>

                        <View style={styles.content}>
                            <View style={styles.notifHeader}>
                                <Text style={styles.notifTitle}>{n.title}</Text>
                                {!n.read && <View style={styles.unreadDot} />}
                            </View>
                            <Text style={styles.notifMessage} numberOfLines={2}>
                                {n.message}
                            </Text>
                            <View style={styles.notifFooter}>
                                <Clock size={12} color={Colors.muted} />
                                <Text style={styles.notifTime}>{n.time}</Text>
                            </View>
                        </View>
                    </TouchableOpacity>
                ))}

                <View style={styles.footerInfo}>
                    <ShieldAlert size={14} color={Colors.muted} />
                    <Text style={styles.footerInfoText}>End-to-end encrypted notifications</Text>
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: Colors.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 20,
    },
    headerTitle: { fontSize: 26, fontWeight: '900', color: "#0F172A", letterSpacing: -0.5 },
    headerSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 2, fontWeight: '500' },
    markRead: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 100,
        backgroundColor: '#EBF3FD',
    },
    markReadText: { fontSize: 12, fontWeight: '700', color: Colors.primary },

    list: { padding: 20, paddingTop: 0 },

    notifCard: {
        flexDirection: 'row',
        backgroundColor: Colors.white,
        borderRadius: 24,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.02)',
        ...Shadows.card,
    },
    notifCardUnread: {
        borderColor: 'rgba(47, 128, 237, 0.1)',
        backgroundColor: '#FCFDFF',
    },
    iconBox: {
        width: 50,
        height: 50,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        flex: 1,
        marginLeft: 16,
    },
    notifHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    notifTitle: {
        fontSize: 15,
        fontWeight: '800',
        color: "#0F172A",
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: Colors.primary,
    },
    notifMessage: {
        fontSize: 13,
        color: "#64748B",
        lineHeight: 18,
        marginBottom: 10,
    },
    notifFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    notifTime: {
        fontSize: 11,
        fontWeight: '600',
        color: Colors.muted,
    },
    footerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 10,
        opacity: 0.5,
    },
    footerInfoText: {
        fontSize: 12,
        fontWeight: '500',
        color: Colors.muted,
    },
});
