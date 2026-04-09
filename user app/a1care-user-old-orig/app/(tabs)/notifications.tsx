import React, { useState, useEffect } from 'react';
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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsService, Notification } from '@/services/notifications.service';
import {
    Bell,
    CheckCircle2,
    Tag,
    Stethoscope,
    ShieldAlert,
    Clock,
    CreditCard,
    Ticket,
    Activity,
    Users,
} from 'lucide-react-native';
import { Colors, Shadows } from '@/constants/colors';
import { LinearGradient } from 'expo-linear-gradient';
import { useNotificationStore } from '@/stores/notification.store';

// ── Icon/Color Mapping ───────────────────────────────────────────────────
const TYPE_META: Record<string, { icon: any; color: string; bgColor: string }> = {
    ServiceRequest:      { icon: Stethoscope, color: '#2F80ED', bgColor: '#EBF3FD' },
    DoctorAppointment:   { icon: Activity,    color: '#22C55E', bgColor: '#DCFCE7' },
    Wallet:              { icon: CreditCard,  color: '#F59E0B', bgColor: '#FEF3C7' },
    Ticket:              { icon: Ticket,      color: '#E11D48', bgColor: '#FFF1F2' },
    Broadcast:           { icon: Tag,         color: '#9B51E0', bgColor: '#F5EBFF' },
    Auth:                { icon: ShieldAlert, color: '#6366F1', bgColor: '#EEF2FF' },
    Partner:             { icon: Users,       color: '#0D9488', bgColor: '#CCFBF1' },
    default:             { icon: Bell,        color: Colors.primary, bgColor: '#EBF3FD' },
};

function getMeta(refType?: string) {
    return TYPE_META[refType ?? ''] ?? TYPE_META.default;
}

function timeAgo(dateStr: string) {
    try {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1)  return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24)  return `${hrs}h ago`;
        const days = Math.floor(hrs / 24);
        if (days < 7)  return `${days}d ago`;
        return new Date(dateStr).toLocaleDateString();
    } catch {
        return 'Recently';
    }
}

// Fallback data if API is empty
const DUMMY_FALLBACK: any[] = [];

export default function NotificationsScreen() {
    const qc = useQueryClient();
    const { setUnreadCount } = useNotificationStore();
    const [localList, setLocalList] = useState<any[]>([]);

    const { data, isLoading, isRefetching, refetch } = useQuery({
        queryKey: ['notifications'],
        queryFn: () => notificationsService.getAll(1),
        retry: 1,
    });

    useEffect(() => {
        if (data?.notifications) {
            setLocalList(data.notifications.length > 0 ? data.notifications : DUMMY_FALLBACK);
            setUnreadCount(data.unreadCount ?? 0);
        } else if (!isLoading) {
            setLocalList(DUMMY_FALLBACK);
            setUnreadCount(0);
        }
    }, [data, isLoading]);

    const unreadCount = localList.filter(n => !n.isRead).length;

    // Mutations
    const markAllMutation = useMutation({
        mutationFn: async () => {
            // Only call server if we have real IDs that are unread
            const realUnread = localList.filter(n => !n.isRead && !n._id.startsWith('d'));
            if (realUnread.length > 0) {
                await notificationsService.markAllRead();
            }
        },
        onMutate: () => {
            setLocalList(prev => prev.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
            qc.setQueryData(['notifications'], (prev: any) => prev ? { ...prev, unreadCount: 0, notifications: (prev.notifications || []).map((n: any) => ({ ...n, isRead: true })) } : prev);
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['notifications'] });
        },
    });

    const markOneMutation = useMutation({
        mutationFn: async (id: string) => {
            if (!id.startsWith('d')) {
                await notificationsService.markRead(id);
            }
        },
        onMutate: (id: string) => {
            setLocalList(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
            qc.setQueryData(['notifications'], (prev: any) => {
                if (!prev) return prev;
                const updated = (prev.notifications || []).map((n: any) => n._id === id ? { ...n, isRead: true } : n);
                const newUnreadCount = updated.filter((n: any) => !n.isRead).length;
                setUnreadCount(newUnreadCount);
                return { ...prev, notifications: updated, unreadCount: newUnreadCount };
            });
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['notifications'] });
        },
    });

    return (
        <SafeAreaView style={styles.root} edges={['top']}>
            <LinearGradient colors={['#F8FAFE', '#FFFFFF']} style={StyleSheet.absoluteFillObject} />

            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>Alerts & Updates</Text>
                    <Text style={styles.headerSub}>
                        {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
                    </Text>
                </View>

                <TouchableOpacity
                    style={[styles.markAllBtn, unreadCount === 0 && { opacity: 0.35 }]}
                    onPress={() => markAllMutation.mutate()}
                    disabled={unreadCount === 0 || markAllMutation.isPending}
                >
                    {markAllMutation.isPending 
                        ? <ActivityIndicator size="small" color={Colors.primary} />
                        : <>
                            <CheckCircle2 size={13} color={Colors.primary} />
                            <Text style={styles.markAllText}>Mark Read</Text>
                          </>
                    }
                </TouchableOpacity>
            </View>

            {isLoading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                </View>
            ) : (
                <ScrollView
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
                    }
                >
                    {localList.map((n) => {
                        const meta = getMeta(n.refType);
                        const Icon = meta.icon;
                        return (
                            <TouchableOpacity
                                key={n._id}
                                style={[styles.card, !n.isRead && styles.cardUnread]}
                                onPress={() => !n.isRead && markOneMutation.mutate(n._id)}
                            >
                                <View style={[styles.iconBox, { backgroundColor: meta.bgColor }]}>
                                    <Icon size={22} color={meta.color} />
                                </View>
                                <View style={styles.content}>
                                    <View style={styles.row}>
                                        <Text style={styles.title}>{n.title}</Text>
                                        {!n.isRead && <View style={styles.dot} />}
                                    </View>
                                    <Text style={styles.body} numberOfLines={2}>{n.body}</Text>
                                    <View style={styles.footer}>
                                        <Clock size={11} color={Colors.muted} />
                                        <Text style={styles.time}>{timeAgo(n.createdAt)}</Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                    <View style={{ height: 100 }} />
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    center: { flex: 1, justifyContent: 'center' },
    header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20 },
    headerTitle: { fontSize: 24, fontWeight: '900', color: '#0F172A' },
    headerSub: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
    markAllBtn: { 
        flexDirection: 'row', alignItems: 'center', gap: 6, 
        paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, 
        backgroundColor: '#EBF3FD' 
    },
    markAllText: { fontSize: 12, fontWeight: '700', color: Colors.primary },
    list: { paddingHorizontal: 20 },
    card: { 
        flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 20, 
        padding: 16, marginBottom: 12, elevation: 1 
    },
    cardUnread: { backgroundColor: '#F8FBFF', borderWidth: 1, borderColor: '#EBF3FD' },
    iconBox: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    content: { flex: 1, marginLeft: 12 },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    title: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary },
    body: { fontSize: 13, color: '#64748B', lineHeight: 18, marginBottom: 8 },
    footer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    time: { fontSize: 11, color: Colors.muted, fontWeight: '600' },
});
