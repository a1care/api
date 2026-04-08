import React, { useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    TextInput,
    StyleSheet,
    ActivityIndicator,
    RefreshControl,
    Image,
    Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { servicesService } from '@/services/services.service';
import { Colors, Shadows } from '@/constants/colors';
import { FontSize } from '@/constants/spacing';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { SkeletonListItem } from '@/components/ui/Skeleton';
import type { Service, SubService, ChildService } from '@/types';

// ─── Level types ──────────────────────────────────────────────────────────────
type DrillLevel = 'services' | 'sub' | 'child';

// ─── Service icon emoji map ───────────────────────────────────────────────────
const SERVICE_ICONS: Record<number, string> = {
    0: '🏥', 1: '💉', 2: '🚑', 3: '🧪', 4: '💊', 5: '🩺',
    6: '🧬', 7: '🫀', 8: '🧪', 9: '👁️',
};

function serviceEmoji(name: string, idx: number) {
    const n = (name || '').toLowerCase();
    if (n.includes('ambulance') || n.includes('emergency')) return '🚑';
    if (n.includes('nurse') || n.includes('nursing')) return '🩺';
    if (n.includes('lab') || n.includes('test')) return '🧪';
    if (n.includes('doctor') || n.includes('consult')) return '👨‍⚕️';
    if (n.includes('diagnostic')) return '🏥';
    return SERVICE_ICONS[idx % 10] ?? '⚕️';
}

function ServiceRow({
    emoji,
    imageUrl,
    name,
    subtitle,
    price,
    onPress,
    showCOD = false,
    showArrow = true,
}: {
    emoji: string;
    imageUrl?: string;
    name: string;
    subtitle?: string;
    price?: number;
    onPress: () => void;
    showCOD?: boolean;
    showArrow?: boolean;
}) {
    return (
        <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.88}>
            <View style={styles.rowIcon}>
                {imageUrl && imageUrl.trim().length > 0 ? (
                    <Image source={{ uri: imageUrl }} style={{ width: 36, height: 36, borderRadius: 10 }} />
                ) : (
                    <Text style={{ fontSize: 28 }}>{emoji}</Text>
                )}
            </View>
            <View style={styles.rowContent}>
                <Text style={styles.rowName} numberOfLines={1}>{name}</Text>
                {subtitle ? (
                    <Text style={styles.rowSub} numberOfLines={1}>{subtitle}</Text>
                ) : null}
            </View>
            <View style={styles.rowRight}>
                {price !== undefined && (
                    <Text style={styles.rowPrice}>₹{price}</Text>
                )}
                <View style={styles.arrowCircle}>
                    <Text style={styles.arrowIcon}>›</Text>
                </View>
            </View>
        </TouchableOpacity>
    );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function ServicesScreen() {
    const router = useRouter();
    const { category, serviceId } = useLocalSearchParams<{ category?: string; serviceId?: string }>();
    const [level, setLevel] = useState<DrillLevel>('services');
    const [selectedService, setSelectedService] = useState<Service | null>(null);
    const [selectedSub, setSelectedSub] = useState<SubService | null>(null);
    const [search, setSearch] = useState('');

    // ── Root services ──
    const {
        data: services,
        isLoading: servicesLoading,
        isError: servicesErr,
        refetch: refetchServices,
    } = useQuery({
        queryKey: ['services'],
        queryFn: servicesService.getAll,
        retry: 2,
    });

    // ── Sub-services ──
    const {
        data: subServices,
        isLoading: subLoading,
        isError: subErr,
        refetch: refetchSubs,
    } = useQuery({
        queryKey: ['sub-services', selectedService?._id],
        queryFn: () => servicesService.getSubServices(selectedService!._id),
        enabled: !!selectedService && level === 'sub',
        retry: 2,
    });

    // ── Child services ──
    const {
        data: childServices,
        isLoading: childLoading,
        isError: childErr,
        refetch: refetchChildren,
    } = useQuery({
        queryKey: ['child-services', selectedSub?._id],
        queryFn: () => servicesService.getChildServices(selectedSub!._id),
        enabled: !!selectedSub && level === 'child',
        retry: 2,
    });

    // ── Handle Initial Deep Link ──
    useEffect(() => {
        if (services && (category || serviceId)) {
            const target = services.find(s =>
                (serviceId && s._id === serviceId) ||
                (category && s.name.toLowerCase().includes(category.toLowerCase()))
            );
            if (target && (level === 'services' || selectedService?._id !== target._id)) {
                handleServicePress(target);
            }
        } else if (services && !category && !serviceId && level !== 'services') {
            // Explicit reset if navigating to services tab without specific target
            setLevel('services');
            setSelectedService(null);
            setSelectedSub(null);
            setSearch('');
        }
    }, [services, category, serviceId]);

    const [fastTrackLoading, setFastTrackLoading] = useState<string | null>(null);

    const handleServicePress = async (s: any) => {
        // Fast-track for Emergency / Ambulance (2-step booking)
        if (s.type === 'Emergency' || s.name.toLowerCase().includes('ambulance')) {
            try {
                setFastTrackLoading(s._id);
                const subs = await servicesService.getSubServices(s._id);
                if (subs && subs.length > 0) {
                    const children = await servicesService.getChildServices(subs[0]._id);
                    if (children && children.length > 0) {
                        const targetChild = children[0]; // Auto pick first (e.g., BLS)
                        setSelectedService(s);
                        setLevel('sub');
                        router.push({
                            pathname: '/service/[id]',
                            params: {
                                id: targetChild._id,
                                name: targetChild.name,
                                price: targetChild.price,
                                subName: subs[0].name
                            }
                        });
                        return;
                    }
                }
            } catch (err) {
                console.error("Fast track failed", err);
            } finally {
                setFastTrackLoading(null);
            }
        }

        // Normal Flow
        setSelectedService(s);
        setLevel('sub');
    };

    // ── Breadcrumb back ──
    const goBack = () => {
        if (level === 'child') { setLevel('sub'); setSelectedSub(null); }
        else if (level === 'sub') { setLevel('services'); setSelectedService(null); setSearch(''); }
    };

    // ── Filtered root services ──
    const filteredServices = services
        ? search.trim()
            ? services.filter((s) =>
                s.name.toLowerCase().includes(search.toLowerCase())
            )
            : services
        : [];

    // ── Breadcrumb display ──
    const breadcrumb =
        level === 'services'
            ? 'All Services'
            : level === 'sub'
                ? selectedService?.name ?? 'Services'
                : selectedSub?.name ?? 'Sub-services';

    const isLoading = servicesLoading || subLoading || childLoading;
    const isError = servicesErr || subErr || childErr;
    const onRetry = level === 'services' ? refetchServices : level === 'sub' ? refetchSubs : refetchChildren;

    return (
        <SafeAreaView style={styles.root} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                {level !== 'services' && (
                    <TouchableOpacity onPress={goBack} style={styles.backBtn}>
                        <Text style={styles.backText}>←</Text>
                    </TouchableOpacity>
                )}
                <View style={{ flex: 1 }}>
                    <Text style={styles.headerTitle}>
                        {level === 'services' ? 'Browse Services' : breadcrumb}
                    </Text>
                    {level !== 'services' && selectedService && (
                        <Text style={styles.headerSub}>{selectedService.name}</Text>
                    )}
                </View>
            </View>

            {/* Universal Search Bar */}
            <View style={styles.searchWrap}>
                <TextInput
                    style={styles.searchInput}
                    placeholder={`Search in ${level === 'services' ? 'Services' : level === 'sub' ? 'Categories' : 'Procedures'}…`}
                    placeholderTextColor={Colors.muted}
                    value={search}
                    onChangeText={setSearch}
                    returnKeyType="search"
                    clearButtonMode="while-editing"
                />
                {search.length > 0 && (
                    <TouchableOpacity onPress={() => setSearch('')} style={styles.searchClear}>
                        <Text style={styles.searchClearText}>✕</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Video consult banner */}
            {level === 'services' && (
                <TouchableOpacity style={styles.heroBanner} activeOpacity={0.9}>
                    <LinearGradient
                        colors={[Colors.primary, '#6366F1']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.heroGradient}
                    >
                        <View style={styles.heroContent}>
                            <View style={styles.heroLeft}>
                                <View style={styles.heroBadge}>
                                    <Text style={styles.heroBadgeText}>COMING SOON</Text>
                                </View>
                                <Text style={styles.heroTitleMain}>Online Video{"\n"}Consultation</Text>
                                <Text style={styles.heroSubText}>Talk to top doctors from comfort of your home</Text>
                            </View>
                            <View style={styles.heroRight}>
                                <View style={styles.videoIconBg}>
                                    <Text style={{ fontSize: 32 }}>📹</Text>
                                </View>
                            </View>
                        </View>
                    </LinearGradient>
                </TouchableOpacity>
            )}

            {/* Content */}
            {isError ? (
                <ErrorState message="Failed to load services. Please try again." onRetry={onRetry} />
            ) : isLoading ? (
                <ScrollView contentContainerStyle={styles.listContent}>
                    {[1, 2, 3, 4, 5].map((i) => <SkeletonListItem key={i} />)}
                </ScrollView>
            ) : (
                <ScrollView
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Level: Root services */}
                    {level === 'services' &&
                        filteredServices.map((s, idx) => (
                            <View key={s._id} style={{ opacity: fastTrackLoading === s._id ? 0.6 : 1 }}>
                                <ServiceRow
                                    emoji={serviceEmoji(s.name, idx)}
                                    imageUrl={s.imageUrl}
                                    name={s.name}
                                    subtitle={fastTrackLoading === s._id ? 'Directing...' : (s.title ?? s.type ?? undefined)}
                                    onPress={() => {
                                        setSearch('');
                                        handleServicePress(s);
                                    }}
                                />
                            </View>
                        ))}

                    {level === 'services' && filteredServices.length === 0 && !servicesLoading && (
                        <EmptyState
                            icon="🔍"
                            title="No services found"
                            subtitle={search ? `Try searching for something else` : 'No services available yet'}
                            actionLabel={search ? 'Clear Search' : undefined}
                            onAction={search ? () => setSearch('') : undefined}
                        />
                    )}

                    {/* Level: Sub-services */}
                    {level === 'sub' &&
                        (subServices ?? [])
                            .filter(s => search.trim() ? s.name.toLowerCase().includes(search.toLowerCase()) : true)
                            .map((s, idx) => (
                                <TouchableOpacity
                                    key={s._id}
                                    style={styles.childCard}
                                    onPress={() => {
                                        setSearch('');
                                        setSelectedSub(s);
                                        setLevel('child');
                                    }}
                                    activeOpacity={0.85}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                                        <View style={styles.childIconBg}>
                                            {s.imageUrl && s.imageUrl.trim().length > 0 ? (
                                                <Image source={{ uri: s.imageUrl }} style={{ width: 44, height: 44, borderRadius: 12 }} />
                                            ) : (
                                                <Text style={{ fontSize: 36 }}>{serviceEmoji(s.name, idx)}</Text>
                                            )}
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.childName}>{s.name}</Text>
                                            {s.description ? (
                                                <Text style={styles.childDesc} numberOfLines={2}>
                                                    {s.description}
                                                </Text>
                                            ) : null}
                                        </View>
                                        <View style={styles.arrowCircle}>
                                            <Text style={styles.arrowIcon}>›</Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            ))}

                    {level === 'sub' && !subLoading && (subServices ?? []).length === 0 && (
                        <EmptyState
                            icon="📋"
                            title="No categories found"
                            subtitle="There are no sub-categories for this service yet."
                            actionLabel="Back to All Services"
                            onAction={goBack}
                        />
                    )}

                    {/* Level: Child services — bookable items */}
                    {level === 'child' &&
                        (childServices ?? [])
                            .filter(c => search.trim() ? c.name.toLowerCase().includes(search.toLowerCase()) : true)
                            .map((c) => (
                                <TouchableOpacity
                                    key={c._id}
                                    style={[styles.childCard, { padding: 16 }]}
                                    onPress={() =>
                                        router.push({
                                            pathname: '/service/[id]',
                                            params: {
                                                id: c._id,
                                                name: c.name,
                                                price: c.price,
                                                subName: selectedSub?.name
                                            }
                                        })
                                    }
                                    activeOpacity={0.85}
                                >
                                    <View style={[styles.childTop, { marginBottom: 12 }]}>
                                        <View style={[styles.childIconBg, { width: 56, height: 56, borderRadius: 16 }]}>
                                            {c.imageUrl ? (
                                                <Image source={{ uri: c.imageUrl }} style={{ width: 40, height: 40, borderRadius: 10 }} />
                                            ) : (
                                                <Text style={{ fontSize: 24 }}>⚕️</Text>
                                            )}
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.childName, { fontSize: 18, marginBottom: 2 }]}>{c.name}</Text>
                                            <Text style={[styles.childDesc, { fontSize: 14 }]} numberOfLines={2}>
                                                {c.description || 'Professional healthcare service'}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.childBottom}>
                                        {c.price !== undefined && c.price > 0 ? (
                                            <Text style={styles.childPrice}>₹{c.price}</Text>
                                        ) : (
                                            <Text style={styles.childPriceNA}>Price on request</Text>
                                        )}
                                        <View style={styles.codTag}>
                                            <Text style={styles.codTagText}>💵 COD</Text>
                                        </View>
                                        <TouchableOpacity
                                            style={styles.bookBtn}
                                            onPress={() =>
                                                router.push({
                                                    pathname: '/service/[id]',
                                                    params: {
                                                        id: c._id,
                                                        name: c.name,
                                                        price: c.price,
                                                        subName: selectedSub?.name
                                                    }
                                                })
                                            }
                                        >
                                            <Text style={styles.bookBtnText}>Book Now</Text>
                                        </TouchableOpacity>
                                    </View>
                                </TouchableOpacity>
                            ))}

                    {level === 'child' && !childLoading && (childServices?.length ?? 0) === 0 && (
                        <EmptyState
                            icon="📋"
                            title="No services available"
                            subtitle="Check back later or try another category"
                            actionLabel="Go Back"
                            onAction={goBack}
                        />
                    )}

                    <View style={{ height: 100 }} />
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#F8FAFC' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: Colors.card,
        gap: 16,
    },
    backBtn: {
        width: 42,
        height: 42,
        borderRadius: 14,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    backText: { fontSize: 22, color: Colors.textPrimary, fontWeight: '600' },
    headerTitle: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -0.5 },
    headerSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2, fontWeight: '500' },

    // Search
    searchWrap: {
        paddingHorizontal: 20,
        marginVertical: 12,
    },
    searchInput: {
        backgroundColor: Colors.card,
        borderRadius: 20,
        paddingHorizontal: 20,
        paddingVertical: 14,
        fontSize: 16,
        color: Colors.textPrimary,
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        paddingRight: 45,
        ...Shadows.card,
        shadowOpacity: 0.05,
    },
    searchClear: {
        position: 'absolute',
        right: 32,
        top: 0,
        bottom: 0,
        justifyContent: 'center',
    },
    searchClearText: { fontSize: 14, color: Colors.muted, fontWeight: '700' },

    // Video hero banner
    heroBanner: {
        marginHorizontal: 20,
        marginBottom: 20,
        borderRadius: 24,
        overflow: 'hidden',
        ...Shadows.float,
    },
    heroGradient: {
        padding: 20,
    },
    heroContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    heroLeft: {
        flex: 1,
    },
    heroBadge: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        alignSelf: 'flex-start',
        marginBottom: 10,
    },
    heroBadgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1,
    },
    heroTitleMain: {
        fontSize: 20,
        fontWeight: '900',
        color: '#fff',
        lineHeight: 26,
    },
    heroSubText: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 6,
        lineHeight: 16,
    },
    heroRight: {
        marginLeft: 12,
    },
    videoIconBg: {
        width: 64,
        height: 64,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },

    // List
    listContent: { paddingHorizontal: 20, paddingBottom: 100 },

    // Row Styles (for Main Categories)
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.card,
        borderRadius: 24,
        padding: 16,
        marginBottom: 12,
        gap: 16,
        ...Shadows.card,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    rowIcon: {
        width: 60,
        height: 60,
        borderRadius: 18,
        backgroundColor: '#F0F7FF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    rowContent: { flex: 1 },
    rowName: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
    rowSub: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
    rowRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    rowPrice: { fontSize: 16, fontWeight: '800', color: Colors.primary },
    arrowCircle: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#F8FAFC',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    arrowIcon: { fontSize: 18, color: Colors.textSecondary, fontWeight: '600' },

    // Child service card
    childCard: {
        backgroundColor: Colors.card,
        borderRadius: 24,
        padding: 20,
        marginBottom: 16,
        ...Shadows.card,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    childTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 16, marginBottom: 16 },
    childIconBg: {
        width: 64,
        height: 64,
        borderRadius: 20,
        backgroundColor: Colors.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    childName: { fontSize: 19, fontWeight: '800', color: Colors.textPrimary, marginBottom: 6 },
    childDesc: { fontSize: 14, color: Colors.textSecondary, lineHeight: 22, fontWeight: '500' },
    childBottom: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        paddingTop: 16,
    },
    childPrice: { fontSize: 22, fontWeight: '900', color: Colors.primary, flex: 1 },
    childPriceNA: { fontSize: 14, color: Colors.textSecondary, flex: 1 },
    codTag: {
        backgroundColor: '#ECFDF5',
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: '#A7F3D0',
    },
    codTagText: { fontSize: 10, fontWeight: '900', color: '#065F46' },
    bookBtn: {
        backgroundColor: Colors.primary,
        borderRadius: 14,
        paddingHorizontal: 18,
        paddingVertical: 12,
        ...Shadows.float,
    },
    bookBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
});
