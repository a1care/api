import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    RefreshControl,
    ActivityIndicator,
    TouchableOpacity,
    TextInput,
    Linking,
    Dimensions,
    Image,
    Modal, // Re-added Modal as it's used in the component
    Platform, // Kept Platform as it's a common utility and not explicitly removed
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { useQuery } from '@tanstack/react-query';
import {
    Stethoscope,
    FlaskConical,
    Ambulance,
    Pill,
    LayoutGrid,
    Search,
    Bell,
    User as UserIcon,
    MapPin,
    ChevronDown,
    Star,
    ArrowRight,
    Crosshair,
    HeartPulse,
    Activity,
    ShieldCheck,
    X,
    BookOpen
} from 'lucide-react-native';

import { servicesService } from '@/services/services.service';
import { bookingsService } from '@/services/bookings.service';
import { doctorsService } from '@/services/doctors.service';
import api from '@/services/api';
import { useAuthStore } from '@/stores/auth.store';
import { Colors, Shadows } from '@/constants/colors';
import { Endpoints } from '@/constants/api';
import { FontSize } from '@/constants/spacing';
import { DoctorCard } from '@/components/ui/DoctorCard';
import { EmergencyFAB } from '@/components/ui/EmergencyFAB';

import { useConfigStore } from '@/stores/config.store';

const { width } = Dimensions.get('window');

// ── Service Icon Mapping (Maps DB names to Lucide icons & colors) ──
const SERVICE_THEMES: Record<string, { icon: any; color: string; bgColor: string }> = {
    'doctor':      { icon: Stethoscope,  color: '#2F80ED', bgColor: '#EBF3FD' },
    'nurse':       { icon: Pill,         color: '#9B51E0', bgColor: '#F5EBFF' },
    'lab':         { icon: FlaskConical, color: '#27AE60', bgColor: '#E9F7EF' },
    'diagnostics': { icon: FlaskConical, color: '#27AE60', bgColor: '#E9F7EF' },
    'ambulance':   { icon: Ambulance,    color: '#EB5757', bgColor: '#FEEFEF' },
    'emergency':   { icon: ShieldCheck,  color: '#EB5757', bgColor: '#FEEFEF' },
    'home':        { icon: HeartPulse,   color: '#D63384', bgColor: '#FFF0F5' },
    'care':        { icon: HeartPulse,   color: '#D63384', bgColor: '#FFF0F5' },
    'equipment':   { icon: ShieldCheck,  color: '#F2994A', bgColor: '#FFF7ED' },
    'pharmacy':    { icon: Pill,         color: '#FFC107', bgColor: '#FFF9E6' },
    'physio':      { icon: Star,         color: '#607D8B', bgColor: '#ECEFF1' },
    'default':     { icon: LayoutGrid,    color: '#64748B', bgColor: '#F1F5F9' },
};

const KNOWLEDGE_THEMES: Record<string, { icon: any; color: string; bgColor: string }> = {
    'Activity':    { icon: Activity,     color: '#FF6B6B', bgColor: '#FFF5F5' },
    'Flask':       { icon: FlaskConical, color: '#4DABF7', bgColor: '#E7F5FF' },
    'Heart':       { icon: HeartPulse,   color: '#51CF66', bgColor: '#EBFBEE' },
    'Mental':      { icon: ShieldCheck,  color: '#FCC419', bgColor: '#FFF9DB' },
    'default':     { icon: BookOpen,     color: '#64748B', bgColor: '#F1F5F9' },
};

function getServiceTheme(name: string) {
    const low = name.toLowerCase();
    const key = Object.keys(SERVICE_THEMES).find(k => low.includes(k)) || 'default';
    return SERVICE_THEMES[key];
}

const HERO_SLIDES = [
    {
        id: '1',
        tag: '24/7 AVAILABLE',
        title: 'Doctor Consultation\nat Home',
        subtitle: 'Book trusted doctors & nurses instantly.',
        cta: 'Consult Now',
        colors: ['#2F80ED', '#21BB7E'],
        path: '/(tabs)/services',
        params: { category: 'Doctor Consult' },
        secondaryIcon: Stethoscope
    },
    {
        id: '2',
        tag: 'SKIP THE LINE',
        title: 'Diagnostic Tests\nat Your Doorstep',
        subtitle: 'Get accurate results within 24 hours.',
        cta: 'Book Lab Test',
        colors: ['#9B51E0', '#2F80ED'],
        path: '/(tabs)/services',
        params: { category: 'Diagnostics' },
        secondaryIcon: FlaskConical
    },
    {
        id: '3',
        tag: 'PROFESSIONAL CARE',
        title: 'Nursing & Elderly\nCare Services',
        subtitle: 'Post-op & specialized home nursing care.',
        cta: 'Hire a Nurse',
        colors: ['#F2994A', '#EB5757'],
        path: '/(tabs)/services',
        params: { category: 'Nursing' },
        secondaryIcon: HeartPulse
    },
    {
        id: '4',
        tag: 'EMERGENCY HUB',
        title: 'Instant Ambulance\nResponse',
        subtitle: 'Fastest medical transit across the city.',
        cta: 'Call SOS',
        colors: ['#EB5757', '#000000'],
        path: '/(tabs)/services',
        params: { category: 'Ambulance' },
        secondaryIcon: Ambulance
    },
    {
        id: '5',
        tag: 'SMART BOOKING',
        title: 'Hospital OP Tokens\nMade Easy',
        subtitle: 'Skip queues at A1care Super-Speciality.',
        cta: 'Get Token',
        colors: ['#21BB7E', '#2F80ED'],
        path: '/(tabs)/services',
        params: { category: 'Hospital' },
        secondaryIcon: Activity
    },
    {
        id: '6',
        tag: 'DOORSTEP DELIVERY',
        title: 'Pharmacy &\nMedicines',
        subtitle: 'Get prescribed medicines delivered in 30 mins.',
        cta: 'Order Now',
        colors: ['#27AE60', '#11998E'],
        path: '/(tabs)/services',
        params: { category: 'Pharmacy' },
        secondaryIcon: Pill
    },
    {
        id: '7',
        tag: 'RENTAL HUB',
        title: 'Medical Equipment\non Rent',
        subtitle: 'Oxygen, wheelchairs & beds at best prices.',
        cta: 'Explore Gear',
        colors: ['#F2C94C', '#F2994A'],
        path: '/(tabs)/services',
        params: { category: 'Equipment' },
        secondaryIcon: ShieldCheck
    }
];

const KNOWLEDGE_BASE = [
    {
        id: '1',
        title: 'Managing Blood Pressure',
        author: 'Dr. Sarah Wilson',
        readTime: '5 min',
        icon: Activity,
        color: '#FF6B6B',
        bgColor: '#FFF5F5',
        description: 'Managing blood pressure is crucial for long-term heart health. Consistent monitoring, a low-sodium diet, and regular cardiovascular exercise are the pillars of hypertension management. Dr. Wilson recommends tracking your readings daily and avoiding processed foods which are often hidden sources of sodium.'
    },
    {
        id: '2',
        title: 'Post-Surgery Nutrition',
        author: 'Dr. James Chen',
        readTime: '8 min',
        icon: FlaskConical,
        color: '#4DABF7',
        bgColor: '#E7F5FF',
        description: 'Recovery from surgery requires a specific nutritional profile. High-quality proteins aid in tissue repair, while Vitamin C and Zinc support the immune system. Dr. Chen emphasizes staying hydrated and incorporating anti-inflammatory foods like berries and leafy greens to speed up the healing process.'
    },
    {
        id: '3',
        title: 'Exercise for Seniors',
        author: 'Dr. Maria Garcia',
        readTime: '6 min',
        icon: HeartPulse,
        color: '#51CF66',
        bgColor: '#EBFBEE',
        description: 'Staying active in your golden years doesn\'t have to be strenuous. Low-impact activities like swimming, walking, and light yoga help maintain joint mobility and balance. Dr. Garcia suggests at least 20 minutes of daily movement to improve circulation and cognitive function.'
    },
    {
        id: '4',
        title: 'Mental Health Awareness',
        author: 'Dr. Robert Brown',
        readTime: '10 min',
        icon: ShieldCheck,
        color: '#FCC419',
        bgColor: '#FFF9DB',
        description: 'Mental well-being is just as important as physical health. Stress management techniques, adequate sleep, and social connection are vital. Dr. Brown highlights the importance of seeking professional help when needed and practicing mindfulness to reduce daily anxiety.'
    }
];

const formatExperience = (exp: string | number) => {
    if (!exp) return "0 yrs";
    if (typeof exp === 'string' && (exp.includes('-') || exp.includes('/'))) {
        const start = new Date(exp);
        const now = new Date();
        const diff = now.getFullYear() - start.getFullYear();
        return `${diff > 0 ? diff : 0} yrs`;
    }
    return `${exp} yrs`;
};

export default function HomeScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user } = useAuthStore();
    const [refreshing, setRefreshing] = useState(false);
    const [activeHero, setActiveHero] = useState(0);
    const [activePopular, setActivePopular] = useState(0);
    const [activeBooking, setActiveBooking] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeKB, setActiveKB] = useState(0);
    const [selectedKB, setSelectedKB] = useState<any>(null);
    const [isKBModalOpen, setIsKBModalOpen] = useState(false);
    const { config, fetchConfig } = useConfigStore();
    const [locCity, setLocCity] = useState('Detecting...');
    const [locArea, setLocArea] = useState('');
    const [locLoading, setLocLoading] = useState(false);

    const heroScrollRef = useRef<ScrollView>(null);
    const popularScrollRef = useRef<ScrollView>(null);
    const kbScrollRef = useRef<ScrollView>(null);

    // Computed dynamic components
    const dynamicBanners = useMemo(() => {
        const festival = config?.landing.festivalBanners || [];
        const activeFestival = festival.filter(b => b.active);
        
        if (activeFestival.length > 0) {
            return activeFestival.map((b: any) => ({
                id: b.id,
                tag: 'DEAL OF THE DAY',
                title: b.title,
                subtitle: 'Exclusive online-only offer',
                cta: 'Grab Now',
                colors: ['#2F80ED', '#EC4899'],
                path: b.redirectUrl || '/(tabs)/services',
                params: {},
                secondaryIcon: HeartPulse,
                isDynamic: true,
                imageUrl: b.imageUrl
            }));
        }
        return HERO_SLIDES;
    }, [config?.landing.festivalBanners]);

    const dynamicKB = useMemo(() => {
        const cloudKB = config?.knowledgeBase || [];
        if (cloudKB.length === 0) return KNOWLEDGE_BASE;
        
        return cloudKB.map((item: any) => ({
            ...item,
            id: item.id || Math.random().toString(),
            icon: KNOWLEDGE_THEMES[item.refType]?.icon || Activity,
            color: KNOWLEDGE_THEMES[item.refType]?.color || '#FF6B6B',
            bgColor: KNOWLEDGE_THEMES[item.refType]?.bgColor || '#FFF5F5',
        }));
    }, [config?.knowledgeBase]);

    // Location fetcher
    const handleGetLocation = async () => {
        setLocLoading(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setLocCity('Permission Denied');
                setLocArea('Enable location in settings');
                setLocLoading(false);
                return;
            }
            const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            const [geo] = await Location.reverseGeocodeAsync({
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
            });
            setLocCity(geo.city || geo.region || 'Your City');
            setLocArea(geo.district || geo.subregion || geo.street || '');
        } catch (e) {
            setLocCity('Location Error');
            setLocArea('Tap to retry');
        } finally {
            setLocLoading(false);
        }
    };

    useEffect(() => {
        handleGetLocation();
    }, []);

    // Auto-slide logic for Hero section
    useEffect(() => {
        const slideCount = dynamicBanners.length;
        if (slideCount <= 1) return;

        const timer = setInterval(() => {
            let nextIndex = (activeHero + 1) % slideCount;
            setActiveHero(nextIndex);
            heroScrollRef.current?.scrollTo({ x: nextIndex * width, animated: true });
        }, 5000); // 5 second rotation

        return () => clearInterval(timer);
    }, [activeHero, dynamicBanners.length]);

    // Auto-slide for Knowledge Base
    useEffect(() => {
        const slideCount = dynamicKB.length;
        if (slideCount <= 1) return;
        
        const timer = setInterval(() => {
            let nextIndex = (activeKB + 1) % slideCount;
            setActiveKB(nextIndex);
            kbScrollRef.current?.scrollTo({ x: nextIndex * (width - 40), animated: true });
        }, 7000); // 7 second rotation

        return () => clearInterval(timer);
    }, [activeKB, dynamicKB.length]);

    const { data: services, refetch: refetchServices } = useQuery({
        queryKey: ['services'],
        queryFn: servicesService.getAll,
    });

    const { data: featured, refetch: refetchFeatured } = useQuery({
        queryKey: ['services-featured'],
        queryFn: servicesService.getFeatured,
    });

    const { data: ongoingBookings, refetch: refetchBookings } = useQuery({
        queryKey: ['pending-bookings'],
        queryFn: bookingsService.getPendingServiceBookings,
    });

    const { data: roles } = useQuery({
        queryKey: ['roles'],
        queryFn: doctorsService.getRoles,
    });

    const doctorRoleId = roles?.find(r => r.name.toLowerCase().includes('doctor'))?._id;

    const { data: allDoctors, refetch: refetchDoctors } = useQuery({
        queryKey: ['doctors', doctorRoleId],
        queryFn: () => doctorsService.getByRole(doctorRoleId!),
        enabled: !!doctorRoleId,
    });

    const { data: healthPackages, refetch: refetchPackages } = useQuery({
        queryKey: ['health-packages'],
        queryFn: async () => {
            const res = await api.get(Endpoints.HEALTH_PACKAGES);
            return res.data.data as any[];
        },
    });

    const topDoctors = useMemo(() => {
        if (!allDoctors) return [];
        if (!searchQuery.trim()) return allDoctors.slice(0, 6);
        return allDoctors.filter(d =>
            d.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            d.specialization?.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
        );
    }, [allDoctors, searchQuery]);

    const matchedServices = useMemo(() => {
        if (!services || !searchQuery.trim()) return [];
        return services.filter(s => 
            s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.title?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [services, searchQuery]);

    const isSearching = searchQuery.trim().length > 0;

    const dynamicQuickServices = useMemo(() => {
        if (!services) return [];
        return services.map((s) => {
            const theme = getServiceTheme(s.name);
            return {
                id: s._id,
                icon: theme.icon,
                label: s.name,
                color: theme.color,
                sub: s.title || 'Professional care',
                bgColor: theme.bgColor
            };
        }).slice(0, 8);
    }, [services]);

    const onRefresh = async () => {
        setRefreshing(true);
        await Promise.all([
            refetchServices(), 
            refetchFeatured(),
            refetchBookings(), 
            refetchDoctors(),
            refetchPackages(),
            fetchConfig()
        ]);
        setRefreshing(false);
    };

    const handleEmergency = () => Linking.openURL('tel:112');

    // Dynamic Hospital OP Link - Ultra-fast separate booking flow
    const handleHospitalBooking = async () => {
        // 1. Try to find the specific Hospital service
        let hSrv = services?.find(s =>
            s.name.toLowerCase().includes('hospital') ||
            s.title?.toLowerCase().includes('op booking')
        );

        // 2. Fallback: Try to find 'Doctor Consult' if Hospital isn't in DB yet
        if (!hSrv) {
            hSrv = services?.find(s => s.name.toLowerCase().includes('doctor'));
        }

        if (hSrv) {
            try {
                const subs = await servicesService.getSubServices(hSrv._id);
                if (subs && subs.length > 0) {
                    // Look for an OP-related sub-service or just pick the first one
                    const opSub = subs.find(sub =>
                        sub.name.toLowerCase().includes('op') ||
                        sub.name.toLowerCase().includes('general')
                    ) || subs[0];

                    const children = await servicesService.getChildServices(opSub._id);
                    if (children && children.length > 0) {
                        const target = children[0];
                        router.push({
                            pathname: '/hospital/book',
                            params: { id: target._id }
                        });
                        return;
                    }
                }
            } catch (err) {
                console.error("Hospital fast-track failed", err);
            }

            // Fallback to services list with category filter if quick-book fails
            router.push({
                pathname: '/(tabs)/services',
                params: { category: hSrv.name }
            });
        } else {
            // Last resort: basic services list
            router.push('/(tabs)/services');
        }
    };

    return (
        <View style={styles.root}>
            {/* ── 1. Sticky Top Bar ── */}
            <View style={[styles.stickyHeader, { paddingTop: insets.top + 8 }]}>
                <View style={styles.headerTop}>
                    <TouchableOpacity style={styles.locationSelector} onPress={handleGetLocation} disabled={locLoading}>
                        <View style={styles.locIconContainer}>
                            {locLoading
                                ? <ActivityIndicator size="small" color={Colors.primary} />
                                : <MapPin size={16} color={Colors.primary} />
                            }
                        </View>
                        <View>
                            <Text style={styles.locCity} numberOfLines={1}>{locCity}</Text>
                            <View style={styles.locRow}>
                                <Text style={styles.locSub} numberOfLines={1}>{locArea || 'Tap to update'}</Text>
                                <ChevronDown size={12} color={Colors.textSecondary} />
                            </View>
                        </View>
                    </TouchableOpacity>

                    <View style={styles.headerActions}>
                        <TouchableOpacity style={styles.iconCircle} onPress={() => router.push('/(tabs)/notifications')}>
                            <Bell size={20} color={Colors.textPrimary} />
                            <View style={styles.notifDot} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => router.push('/(tabs)/profile')}>
                            <View style={styles.avatarCircle}>
                                {user?.profileImage ? (
                                    <Image 
                                        source={{ uri: user.profileImage }} 
                                        style={{ width: '100%', height: '100%', borderRadius: 100 }} 
                                    />
                                ) : (
                                    <Text style={styles.avatarInitial}>{user?.name?.charAt(0) ?? 'U'}</Text>
                                )}
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Search integrated into sticky header area */}
                <View style={styles.searchWrapper}>
                    <View style={styles.searchBar}>
                        <Search size={18} color={Colors.muted} style={{ marginRight: 10 }} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search symptoms, doctors..."
                            placeholderTextColor={Colors.muted}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearIcon}>
                                <X size={18} color={Colors.muted} />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
                <View style={styles.headerDivider} />
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
                }
                contentContainerStyle={{ paddingTop: insets.top + 148 }}
            >
                {isSearching ? (
                    <View style={styles.searchResultsContainer}>
                        <View style={styles.searchHeader}>
                            <Text style={styles.searchTitle}>Search Results</Text>
                            <Text style={styles.searchCount}>{topDoctors.length + matchedServices.length} matches found</Text>
                        </View>

                        {/* Matched Services */}
                        {matchedServices.length > 0 && (
                            <View style={styles.searchSection}>
                                <Text style={styles.searchSectionTitle}>Services & Categories</Text>
                                {matchedServices.map(s => (
                                    <TouchableOpacity 
                                        key={s._id} 
                                        style={styles.searchResultRow}
                                        onPress={() => router.push({ pathname: '/(tabs)/services', params: { category: s.name, serviceId: s._id } })}
                                    >
                                        <View style={styles.searchResultIcon}>
                                            <LayoutGrid size={18} color={Colors.primary} />
                                        </View>
                                        <Text style={styles.searchResultText}>{s.name}</Text>
                                        <ArrowRight size={14} color={Colors.muted} />
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}

                        {/* Matched Doctors */}
                        {topDoctors.length > 0 ? (
                            <View style={styles.searchSection}>
                                <Text style={styles.searchSectionTitle}>Doctors & Specialists</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 10 }}>
                                    {topDoctors.map(d => (
                                        <DoctorCard
                                            key={d._id}
                                            name={d.name || "Doctor"}
                                            specialization={d.specialization?.join(", ") || "Specialist"}
                                            rating={d.rating || 4.8}
                                            experience={formatExperience(d.startExperience ?? 0)}
                                            price={d.consultationFee || 650}
                                            onPress={() => router.push(`/doctor/${d._id}`)}
                                        />
                                    ))}
                                </ScrollView>
                            </View>
                        ) : !matchedServices.length && (
                            <View style={styles.noResults}>
                                <Search size={48} color={Colors.muted} style={{ marginBottom: 16, opacity: 0.5 }} />
                                <Text style={styles.noResultsText}>No matches found for "{searchQuery}"</Text>
                                <TouchableOpacity style={styles.resetBtn} onPress={() => setSearchQuery('')}>
                                    <Text style={styles.resetBtnText}>Clear Search</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                        <View style={{ height: 200 }} />
                    </View>
                ) : (
                    <>
                        {/* ── 2. Strong Hero Section ── */}
                        <View style={styles.heroContainer}>
                            <ScrollView
                                ref={heroScrollRef}
                                horizontal
                                pagingEnabled
                                showsHorizontalScrollIndicator={false}
                                onScroll={(e) => {
                                    const slide = Math.round(e.nativeEvent.contentOffset.x / width);
                                    if (slide !== activeHero) setActiveHero(slide);
                                }}
                                scrollEventThrottle={16}
                            >
                        {dynamicBanners.map((slide) => (
                            <View key={slide.id} style={styles.heroCard}>
                                <TouchableOpacity 
                                    activeOpacity={0.9} 
                                    onPress={() => router.push({
                                        pathname: (slide as any).path as any,
                                        params: (slide as any).params
                                    })}
                                    style={{ flex: 1 }}
                                >
                                    <LinearGradient
                                        colors={slide.colors as any}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={styles.heroGradient}
                                    >
                                        <View style={styles.heroTextContent}>
                                            <Text style={styles.heroTag}>{slide.tag}</Text>
                                            <Text style={styles.heroTitle}>{slide.title}</Text>
                                            <Text style={styles.heroSubtitle}>{slide.subtitle}</Text>
    
                                            <View style={styles.heroCta}>
                                                <Text style={styles.heroCtaText}>{slide.cta}</Text>
                                                <ArrowRight size={16} color={Colors.primary} />
                                            </View>
    
                                            <View style={styles.heroLink}>
                                                <Text style={styles.heroLinkText}>Explore Services</Text>
                                            </View>
                                        </View>
    
                                        {/* Dynamic Image or decoration icon */}
                                        <View style={styles.heroDecorationContainer}>
                                            {(slide as any).imageUrl ? (
                                                <Image 
                                                    source={{ uri: (slide as any).imageUrl }} 
                                                    style={{ width: 140, height: 140, borderRadius: 20, opacity: 0.8 }} 
                                                />
                                            ) : (
                                                <slide.secondaryIcon size={140} color="rgba(255,255,255,0.15)" strokeWidth={1.5} />
                                            )}
                                        </View>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        ))}
                    </ScrollView>
                    <View style={styles.paginationDots}>
                        {dynamicBanners.map((_, i) => (
                            <View key={i} style={[styles.dot, activeHero === i && styles.dotActive]} />
                        ))}
                    </View>
                </View>

                {/* ── 3. Quick Services Grid ── */}
                <View style={styles.servicesGridContainer}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Our Services</Text>
                        <TouchableOpacity onPress={() => router.push('/(tabs)/services')}>
                            <Text style={styles.seeAll}>View All</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.grid}>
                        {dynamicQuickServices.length > 0 ? (
                            dynamicQuickServices.map((item) => (
                                <TouchableOpacity
                                    key={item.id}
                                    style={styles.gridItem}
                                    onPress={() => router.push({
                                        pathname: '/(tabs)/services',
                                        params: { category: item.label, serviceId: item.id }
                                    })}
                                >
                                    <View style={[styles.iconBox, { backgroundColor: item.bgColor }]}>
                                        <item.icon size={24} color={item.color} />
                                    </View>
                                    <Text style={styles.gridLabel} numberOfLines={1}>{item.label}</Text>
                                    <Text style={styles.gridSubLabel} numberOfLines={1}>{item.sub}</Text>
                                </TouchableOpacity>
                            ))
                        ) : (
                            [1, 2, 3, 4].map(i => (
                                <View key={i} style={styles.gridItem}>
                                    <View style={[styles.iconBox, { backgroundColor: '#F1F5F9' }]} />
                                </View>
                            ))
                        )}
                    </View>
                </View>

                {/* ── 4. Hospital Visit Section ── */}
                <View style={styles.hospitalSection}>
                    <TouchableOpacity activeOpacity={0.9} style={styles.hospitalContainer} onPress={handleHospitalBooking}>
                        <Image
                            source={require('@/assets/images/hospital_facade_modern.png')}
                            style={styles.hospitalBgImage}
                        />
                        <LinearGradient
                            colors={['transparent', 'rgba(0,0,0,0.85)']}
                            style={styles.hospitalOverlay}
                        >
                            <View style={styles.hospitalInfo}>
                                <View style={styles.hBadge}>
                                    <Text style={styles.hBadgeText}>HOSPITAL PARTNER</Text>
                                </View>
                                <Text style={styles.hTitle}>A1care Super-Speciality</Text>
                                <Text style={styles.hDesc}>Skip the paper queue. Book your OP token online for faster consultation.</Text>
                                <View style={styles.hCta}>
                                    <Text style={styles.hCtaText}>Reserve OP Token</Text>
                                    <ArrowRight size={14} color="#fff" />
                                </View>
                            </View>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                {/* ── 5. Smart Recommendations (Horizontal) ── */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Popular Near You</Text>
                    </View>
                    <ScrollView
                        ref={popularScrollRef}
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        onScroll={(e) => {
                            const slide = Math.round(e.nativeEvent.contentOffset.x / width);
                            if (slide !== activePopular) setActivePopular(slide);
                        }}
                        scrollEventThrottle={16}
                    >
                        {featured && featured.length > 0 ? (
                            featured.slice(0, 3).map((item) => {
                                const theme = getServiceTheme(item.name);
                                const IconComp = theme.icon;
                                return (
                                    <TouchableOpacity 
                                        key={item._id} 
                                        style={styles.recommendCard} 
                                        activeOpacity={0.9}
                                        onPress={() => router.push(`/service/${item._id}`)}
                                    >
                                        <View style={styles.recommendLeft}>
                                            <View style={[styles.badge, { backgroundColor: theme.bgColor }]}>
                                                <Text style={[styles.badgeText, { color: theme.color }]}>RECOMMENDED</Text>
                                            </View>
                                            <Text style={styles.recommendTitle}>{item.name}</Text>
                                            <Text style={styles.recommendDesc} numberOfLines={2}>{item.description}</Text>
                                            <View style={styles.recommendFooter}>
                                                <Text style={styles.recommendPrice}>₹{item.price}</Text>
                                                <View style={styles.bookBadge}>
                                                    <Text style={styles.bookBadgeText}>Book</Text>
                                                </View>
                                            </View>
                                        </View>
                                        <View style={styles.recommendRight}>
                                            <IconComp size={40} color={theme.color} opacity={0.6} />
                                        </View>
                                    </TouchableOpacity>
                                );
                            })
                        ) : (
                            <View style={styles.recommendCard}>
                                <Text style={styles.recommendTitle}>Loading top deals...</Text>
                            </View>
                        )}
                    </ScrollView>

                    <View style={styles.miniPagination}>
                        {(featured?.slice(0, 3) ?? [1, 2]).map((_, i) => (
                            <View key={i} style={[styles.miniDot, activePopular === i && styles.miniDotActive]} />
                        ))}
                    </View>
                </View>

                {/* ── 6. Top Doctors Section ── */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View>
                            <Text style={styles.sectionTitle}>
                                {searchQuery ? 'Search Results' : 'Top Doctors'}
                            </Text>
                            <Text style={styles.sectionSub}>
                                {searchQuery ? `${topDoctors.length} matched professionals` : 'Available experts near you'}
                            </Text>
                        </View>
                        <TouchableOpacity onPress={() => router.push('/doctor/list')}>
                            <Text style={styles.seeAll}>See All</Text>
                        </TouchableOpacity>
                    </View>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.doctorScroll}
                        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 10 }}
                    >
                        {topDoctors.length > 0 ? topDoctors.map(d => (
                            <DoctorCard
                                key={d._id}
                                name={d.name || "Doctor"}
                                specialization={d.specialization?.join(", ") || "Specialist"}
                                rating={d.rating || 4.8}
                                experience={formatExperience(d.startExperience ?? 0)}
                                price={d.consultationFee || 650}
                                workingHours={d.workingHours}
                                onPress={() => router.push(`/doctor/${d._id}`)}
                            />
                        )) : (
                            <View style={styles.emptyCard}>
                                <Text style={styles.emptyText}>Loading experts...</Text>
                            </View>
                        )}
                    </ScrollView>
                </View>

                {/* ── 7. Health Packages (Dynamic) ── */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View>
                            <Text style={styles.sectionTitle}>Health Packages</Text>
                            <Text style={styles.sectionSub}>Bundled checkups at best prices</Text>
                        </View>
                    </View>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ paddingHorizontal: 20, gap: 14 }}
                    >
                        {healthPackages && healthPackages.length > 0 ? (
                            healthPackages.map((pkg: any) => {
                                const discountPct = pkg.originalPrice > pkg.price
                                    ? Math.round(((pkg.originalPrice - pkg.price) / pkg.originalPrice) * 100)
                                    : 0;
                                return (
                                    <TouchableOpacity
                                        key={pkg._id}
                                        activeOpacity={0.88}
                                        style={styles.pkgCard}
                                        onPress={() => router.push({
                                            pathname: '/package/[id]',
                                            params: { id: pkg._id }
                                        })}
                                    >
                                        {/* Color top bar */}
                                        <LinearGradient
                                            colors={[pkg.color || '#2F80ED', (pkg.color || '#2F80ED') + 'AA']}
                                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                                            style={styles.pkgHeader}
                                        >
                                            {pkg.badge && (
                                                <View style={styles.pkgBadge}>
                                                    <Text style={styles.pkgBadgeText}>{pkg.badge}</Text>
                                                </View>
                                            )}
                                            <Text style={styles.pkgName}>{pkg.name}</Text>
                                            <View style={styles.pkgPriceRow}>
                                                <Text style={styles.pkgPrice}>₹{pkg.price}</Text>
                                                {discountPct > 0 && (
                                                    <View style={styles.pkgDiscountBadge}>
                                                        <Text style={styles.pkgDiscountText}>{discountPct}% OFF</Text>
                                                    </View>
                                                )}
                                            </View>
                                            {pkg.originalPrice > pkg.price && (
                                                <Text style={styles.pkgOriginalPrice}>₹{pkg.originalPrice}</Text>
                                            )}
                                        </LinearGradient>

                                        {/* Tests */}
                                        <View style={styles.pkgBody}>
                                            <Text style={styles.pkgTestsLabel}>{(pkg.testsIncluded || []).length} Tests Included</Text>
                                            <View style={styles.pkgTestsTags}>
                                                {(pkg.testsIncluded || []).slice(0, 3).map((t: string) => (
                                                    <View key={t} style={styles.pkgTag}>
                                                        <Text style={styles.pkgTagText}>{t}</Text>
                                                    </View>
                                                ))}
                                                {(pkg.testsIncluded || []).length > 3 && (
                                                    <View style={styles.pkgTag}>
                                                        <Text style={styles.pkgTagText}>+{(pkg.testsIncluded || []).length - 3} more</Text>
                                                    </View>
                                                )}
                                            </View>
                                            <TouchableOpacity style={[styles.pkgBtn, { backgroundColor: pkg.color || '#2F80ED' }]}>
                                                <Text style={styles.pkgBtnText}>Book Package</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })
                        ) : (
                            // Static fallback while loading or if no packages
                            [{ name: 'Basic Health Checkup', price: 999, color: '#2F80ED', badge: 'BEST VALUE' },
                             { name: 'Diabetes Care Pack', price: 1499, color: '#9B51E0', badge: 'POPULAR' },
                             { name: 'Full Body Checkup', price: 2999, color: '#F2994A', badge: 'COMPREHENSIVE' }].map((p, i) => (
                                <TouchableOpacity key={i} activeOpacity={0.88} style={styles.pkgCard}>
                                    <LinearGradient colors={[p.color, p.color + 'AA']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.pkgHeader}>
                                        <View style={styles.pkgBadge}><Text style={styles.pkgBadgeText}>{p.badge}</Text></View>
                                        <Text style={styles.pkgName}>{p.name}</Text>
                                        <Text style={styles.pkgPrice}>₹{p.price}</Text>
                                    </LinearGradient>
                                    <View style={styles.pkgBody}>
                                        <Text style={styles.pkgTestsLabel}>Loading tests...</Text>
                                    </View>
                                </TouchableOpacity>
                            ))
                        )}
                    </ScrollView>
                </View>


                {/* ── 9. Ongoing / Upcoming Bookings (Horizontal) ── */}
                {ongoingBookings && ongoingBookings.length > 0 && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Ongoing Bookings</Text>
                        </View>
                        <ScrollView
                            horizontal
                            pagingEnabled
                            showsHorizontalScrollIndicator={false}
                            onScroll={(e) => {
                                const slide = Math.round(e.nativeEvent.contentOffset.x / width);
                                if (slide !== activeBooking) setActiveBooking(slide);
                            }}
                            scrollEventThrottle={16}
                        >
                            {ongoingBookings.map((b: any) => (
                                <View key={b._id} style={{ width: width }}>
                                    <TouchableOpacity
                                        style={styles.bookingCard}
                                        onPress={() => router.push({ pathname: '/booking/[id]', params: { id: b._id } })}
                                        activeOpacity={0.9}
                                    >
                                        <View style={styles.bookingLeft}>
                                            <View style={styles.bookingTag}>
                                                <Text style={styles.bookingTagText}>Active</Text>
                                            </View>
                                            <Text style={styles.bookingTitle}>{b.childServiceId?.name ?? 'Service'}</Text>
                                            <View style={styles.bookingInfoRow}>
                                                <ShieldCheck size={14} color={Colors.health} />
                                                <Text style={styles.bookingSub}>
                                                    {b.scheduledTime
                                                        ? `For ${new Date(b.scheduledTime).toLocaleDateString()} at ${new Date(b.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                                                        : `Booked on ${new Date(b.createdAt).toLocaleDateString()}`
                                                    }
                                                </Text>
                                            </View>
                                            <TouchableOpacity style={styles.trackBtn}>
                                                <Text style={styles.trackText}>Track Status</Text>
                                                <ArrowRight size={14} color="#fff" />
                                            </TouchableOpacity>
                                        </View>
                                        <View style={styles.bookingRight}>
                                            <Activity size={40} color={Colors.primary} opacity={0.2} />
                                        </View>
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </ScrollView>

                        {ongoingBookings.length > 1 && (
                            <View style={styles.miniPagination}>
                                {ongoingBookings.map((_: any, i: number) => (
                                    <View key={i} style={[styles.miniDot, activeBooking === i && styles.miniDotActive]} />
                                ))}
                            </View>
                        )}
                    </View>
                )}

                {/* ── 10. Knowledge Base (Horizontal Auto-Slide) ── */}
                <View style={[styles.section, { marginBottom: 20 }]}>
                    <View style={styles.sectionHeader}>
                        <View>
                            <Text style={styles.sectionTitle}>Knowledge Base</Text>
                            <Text style={styles.sectionSub}>Expert health tips and articles</Text>
                        </View>
                        <TouchableOpacity>
                            <Text style={styles.seeAll}>Read All</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.kbHorizontalWrapper}>
                        <ScrollView
                            ref={kbScrollRef}
                            pagingEnabled
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            onScroll={(e) => {
                                const slide = Math.round(e.nativeEvent.contentOffset.x / (width - 40));
                                if (slide !== activeKB) setActiveKB(slide);
                            }}
                            scrollEventThrottle={16}
                        >
                            {dynamicKB.map((item: any) => (
                                <TouchableOpacity
                                    key={item.id}
                                    style={[styles.kbItem, { width: width - 40, backgroundColor: item.bgColor }]}
                                    activeOpacity={0.8}
                                    onPress={() => {
                                        setSelectedKB(item);
                                        setIsKBModalOpen(true);
                                    }}
                                >
                                    <View style={[styles.kbIconBox, { backgroundColor: 'rgba(255,255,255,0.7)' }]}>
                                        <item.icon size={28} color={item.color} />
                                    </View>
                                    <View style={styles.kbContent}>
                                        <Text style={styles.kbTitle}>{item.title}</Text>
                                        <View style={styles.kbMeta}>
                                            <Text style={styles.kbAuthor}>{item.author}</Text>
                                            <View style={styles.kbDividerDot} />
                                            <Text style={styles.kbReadTime}>{item.readTime} read</Text>
                                        </View>
                                    </View>
                                    <ArrowRight size={18} color={Colors.muted} />
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        {/* Slide Indicator Overlay */}
                        <View style={styles.kbIndicatorLine}>
                            {dynamicKB.map((_: any, i: number) => (
                                <View key={i} style={[styles.kbMiniDot, activeKB === i && styles.kbMiniDotActive]} />
                            ))}
                        </View>
                    </View>
                </View>

                {/* ── 11. Knowledge Base Detail Modal ── */}
                <Modal
                    visible={isKBModalOpen}
                    transparent
                    animationType="slide"
                    onRequestClose={() => setIsKBModalOpen(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            {selectedKB && (
                                <>
                                    <View style={styles.modalHeader}>
                                        <View style={[styles.kbIconBox, { backgroundColor: selectedKB.bgColor }]}>
                                            <selectedKB.icon size={32} color={selectedKB.color} />
                                        </View>
                                        <TouchableOpacity
                                            onPress={() => setIsKBModalOpen(false)}
                                            style={styles.modalCloseBtn}
                                        >
                                            <X size={24} color={Colors.textPrimary} />
                                        </TouchableOpacity>
                                    </View>

                                    <Text style={styles.modalTitle}>{selectedKB.title}</Text>

                                    <View style={styles.modalMeta}>
                                        <UserIcon size={14} color={Colors.primary} />
                                        <Text style={styles.modalAuthor}>{selectedKB.author}</Text>
                                        <View style={styles.kbDividerDot} />
                                        <BookOpen size={14} color={Colors.muted} />
                                        <Text style={styles.modalReadTime}>{selectedKB.readTime} read</Text>
                                    </View>

                                    <ScrollView style={styles.modalScroll}>
                                        <Text style={styles.modalDesc}>{selectedKB.description}</Text>
                                        <Text style={styles.modalNote}>
                                            Disclaimer: This information is for educational purposes only. Always consult a qualified medical professional for personal health advice.
                                        </Text>
                                    </ScrollView>

                                    <TouchableOpacity
                                        style={styles.modalCta}
                                        onPress={() => setIsKBModalOpen(false)}
                                    >
                                        <Text style={styles.modalCtaText}>Got it, thanks!</Text>
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>
                    </View>
                </Modal>

                <View style={{ height: 120 }} />
                </>
                )}
            </ScrollView>

            {/* ── 8. Emergency Floating Widget ── */}
            <EmergencyFAB bottom={100} />
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: Colors.background },
    // scrollContent paddingTop is now set inline via insets.top + 148

    // 1. Sticky Top Bar
    stickyHeader: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: Colors.white,
        zIndex: 100,
        paddingHorizontal: 20,
        paddingBottom: 16,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    locationSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    locIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: Colors.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    locCity: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    locRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    locSub: {
        fontSize: 12,
        color: Colors.textSecondary,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#F8FAFC',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#EDF2F7',
        position: 'relative',
    },
    notifDot: {
        position: 'absolute',
        top: 12,
        right: 13,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: Colors.emergency,
        borderWidth: 2,
        borderColor: Colors.white,
    },
    avatarCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 4,
    },
    avatarInitial: {
        color: Colors.white,
        fontWeight: '800',
        fontSize: 16,
    },
    searchWrapper: {
        marginTop: 4,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F1F5F9',
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 52,
    },
    searchPlaceholder: {
        fontSize: 15,
        color: Colors.muted,
        fontWeight: '500',
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: Colors.textPrimary,
        fontWeight: '500',
        paddingVertical: 8,
    },
    clearIcon: {
        padding: 4,
    },
    clearText: {
        fontSize: 16,
        color: Colors.muted,
        fontWeight: '700',
    },
    headerDivider: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 1,
        backgroundColor: '#F1F5F9',
    },

    // 2. Strong Hero Section
    heroContainer: {
        marginBottom: 24,
    },
    heroCard: {
        width: width,
        paddingHorizontal: 20,
    },
    heroGradient: {
        borderRadius: 24,
        padding: 24,
        flexDirection: 'row',
        minHeight: 180,
        overflow: 'hidden',
    },
    heroTextContent: {
        flex: 1,
        zIndex: 2,
    },
    heroDecorationContainer: {
        position: 'absolute',
        right: -20,
        bottom: -30,
        zIndex: 1,
        transform: [{ rotate: '-15deg' }]
    },
    heroTag: {
        fontSize: 10,
        fontWeight: '900',
        color: 'rgba(255,255,255,0.7)',
        marginBottom: 8,
        letterSpacing: 1,
    },
    heroTitle: {
        fontSize: 22,
        fontWeight: '900',
        color: Colors.white,
        lineHeight: 28,
        marginBottom: 8,
    },
    heroSubtitle: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.85)',
        marginBottom: 20,
        fontWeight: '500',
    },
    heroCta: {
        backgroundColor: Colors.white,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        alignSelf: 'flex-start',
        marginBottom: 12,
        ...Shadows.float,
    },
    heroCtaText: {
        color: Colors.primary,
        fontWeight: '800',
        fontSize: 14,
    },
    heroLink: {
        paddingVertical: 4,
    },
    heroLinkText: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 12,
        fontWeight: '700',
        textDecorationLine: 'underline',
    },
    heroImage: {
        position: 'absolute',
        right: -30,
        bottom: -20,
        width: 180,
        height: 220,
        opacity: 0.9,
    },
    paginationDots: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 6,
        marginTop: 12,
    },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#E2E8F0' },
    dotActive: { width: 18, backgroundColor: Colors.primary },

    // 3. Quick Services Grid
    servicesGridContainer: {
        marginBottom: 16,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 16,
    },
    gridItem: {
        width: '25%',
        alignItems: 'center',
        marginBottom: 12,
        paddingHorizontal: 2,
    },
    iconBox: {
        width: 58,
        height: 58,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 4,
        backgroundColor: '#fff',
        ...Shadows.card,
        shadowOpacity: 0.1,
        elevation: 3,
    },
    gridLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: '#1F2937',
        textAlign: 'center',
        marginBottom: 1,
    },
    gridSubLabel: {
        fontSize: 8,
        color: '#6B7280',
        textAlign: 'center',
        fontWeight: '500',
    },

    // 4. Sections & Top Doctors
    section: {
        marginBottom: 32,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 8,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: Colors.textPrimary,
    },
    sectionSub: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    seeAll: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.primary,
    },
    doctorScroll: {
        marginTop: 4,
    },
    emptyCard: {
        width: 200,
        height: 120,
        borderRadius: 20,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        color: Colors.muted,
        fontSize: 13,
    },

    // 5. Recommendations
    recommendationContainer: {
        paddingHorizontal: 0,
    },
    recommendCard: {
        width: width - 40,
        marginHorizontal: 20,
        flexDirection: 'row',
        backgroundColor: Colors.white,
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        ...Shadows.card,
    },
    recommendLeft: { flex: 1 },
    badge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        marginBottom: 10,
    },
    badgeText: {
        fontSize: 9,
        fontWeight: '900',
    },
    recommendTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: Colors.textPrimary,
        marginBottom: 4,
    },
    recommendDesc: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginBottom: 14,
        lineHeight: 16,
    },
    recommendFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    recommendPrice: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    bookBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        backgroundColor: Colors.primary,
        borderRadius: 8,
    },
    bookBadgeText: {
        color: Colors.white,
        fontSize: 12,
        fontWeight: '700',
    },
    recommendRight: {
        width: 60,
        alignItems: 'flex-end',
        justifyContent: 'center',
    },

    // 6. Featured Offers
    offerCard: {
        width: 240,
        marginRight: 16,
        backgroundColor: '#EBF3FD',
        borderRadius: 20,
        padding: 20,
        position: 'relative',
        overflow: 'hidden',
    },
    offerBadge: {
        position: 'absolute',
        top: 0,
        right: 0,
        backgroundColor: '#3B82F6',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderBottomLeftRadius: 12,
    },
    offerBadgeText: {
        color: Colors.white,
        fontSize: 10,
        fontWeight: '900',
    },
    offerTitle: {
        fontSize: 18,
        fontWeight: '900',
        color: Colors.textPrimary,
        marginBottom: 4,
    },
    offerSubtitle: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginBottom: 16,
        lineHeight: 16,
    },
    offerPriceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    offerPrice: {
        fontSize: 16,
        fontWeight: '800',
        color: Colors.textPrimary,
    },
    offerOldPrice: {
        fontSize: 13,
        color: Colors.muted,
        textDecorationLine: 'line-through',
    },

    // 7. Hospital Section
    hospitalSection: {
        marginTop: 8,
        paddingHorizontal: 20,
    },
    hospitalContainer: {
        height: 200,
        borderRadius: 28,
        overflow: 'hidden',
        backgroundColor: '#111',
        ...Shadows.float,
    },
    hospitalBgImage: {
        width: '100%',
        height: '100%',
        position: 'absolute',
    },
    hospitalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        padding: 24,
    },
    hospitalInfo: {
        zIndex: 5,
    },
    hBadge: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        alignSelf: 'flex-start',
        marginBottom: 12,
    },
    hBadgeText: {
        color: Colors.white,
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1,
    },
    hTitle: {
        fontSize: 22,
        fontWeight: '900',
        color: Colors.white,
        marginBottom: 6,
    },
    hDesc: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.7)',
        lineHeight: 18,
        marginBottom: 16,
    },
    hCta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    hCtaText: {
        color: Colors.white,
        fontWeight: '800',
        fontSize: 14,
    },

    emergencyPulse: {
        opacity: 0.8,
    },

    // Ongoing booking refined
    bookingCard: {
        marginHorizontal: 20,
        backgroundColor: Colors.white,
        borderRadius: 24,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#F1F5F9',
        ...Shadows.card
    },
    bookingLeft: { flex: 1 },
    bookingTag: { backgroundColor: '#E9F7EF', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginBottom: 12 },
    bookingTagText: { color: Colors.health, fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
    bookingTitle: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary, marginBottom: 6 },
    bookingInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
    bookingSub: { fontSize: 13, color: Colors.textSecondary },
    trackBtn: { backgroundColor: Colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6 },
    trackText: { color: '#fff', fontWeight: '800', fontSize: 12 },
    bookingRight: { width: 60, alignItems: 'center' },
    miniPagination: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 6,
        marginTop: 16,
    },
    miniDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#E2E8F0',
    },
    miniDotActive: {
        width: 16,
        backgroundColor: Colors.primary,
        borderRadius: 3,
    },

    // 10. Knowledge Base Horizontal List
    kbHorizontalWrapper: {
        marginHorizontal: 0,
        position: 'relative'
    },
    kbItem: {
        height: 160,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginHorizontal: 20,
        gap: 20,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.03)',
        ...Shadows.card,
    },
    kbIconBox: {
        width: 70,
        height: 110,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    kbContent: {
        flex: 1,
    },
    kbTitle: {
        fontSize: 18,
        fontWeight: '900',
        color: Colors.textPrimary,
        marginBottom: 8,
    },
    kbMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    kbAuthor: {
        fontSize: 13,
        fontWeight: '700',
        color: Colors.textSecondary,
    },
    kbDividerDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: Colors.muted,
        opacity: 0.5
    },
    kbReadTime: {
        fontSize: 12,
        color: Colors.muted,
        fontWeight: '500',
    },
    kbIndicatorLine: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 6,
        marginTop: 12
    },
    kbMiniDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#E2E8F0'
    },
    kbMiniDotActive: {
        width: 12,
        backgroundColor: Colors.primary,
        borderRadius: 2
    },

    // 11. Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: Colors.white,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 24,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20,
    },
    modalCloseBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F8FAFC',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: '900',
        color: Colors.textPrimary,
        marginBottom: 12,
        lineHeight: 32,
    },
    modalMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 24,
        paddingBottom: 24,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    modalAuthor: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.textSecondary,
    },
    modalReadTime: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.muted,
    },
    modalScroll: {
        marginBottom: 24,
    },
    modalDesc: {
        fontSize: 16,
        color: Colors.textPrimary,
        lineHeight: 26,
        fontWeight: '500',
    },
    modalNote: {
        marginTop: 24,
        fontSize: 12,
        color: Colors.muted,
        fontStyle: 'italic',
        lineHeight: 18,
    },
    modalCta: {
        backgroundColor: Colors.primary,
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
        ...Shadows.float,
    },
    modalCtaText: {
        color: Colors.white,
        fontSize: 16,
        fontWeight: '800',
    },

    // Search Results Styles
    searchResultsContainer: {
        paddingHorizontal: 20,
        paddingTop: 10,
    },
    searchHeader: {
        marginBottom: 24,
    },
    searchTitle: {
        fontSize: 24,
        fontWeight: '900',
        color: Colors.textPrimary,
        letterSpacing: -0.5,
    },
    searchCount: {
        fontSize: 14,
        color: Colors.textSecondary,
        marginTop: 4,
        fontWeight: '600',
    },
    searchSection: {
        marginBottom: 32,
    },
    searchSectionTitle: {
        fontSize: 13,
        fontWeight: '900',
        color: Colors.muted,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 16,
        paddingLeft: 4,
    },
    searchResultRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: Colors.white,
        borderRadius: 16,
        marginBottom: 10,
        ...Shadows.card,
    },
    searchResultIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: Colors.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    searchResultText: {
        flex: 1,
        fontSize: 16,
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    noResults: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 60,
        paddingHorizontal: 40,
    },
    noResultsText: {
        fontSize: 16,
        color: Colors.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
        fontWeight: '600',
        marginBottom: 24,
    },
    resetBtn: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        backgroundColor: Colors.primary,
        borderRadius: 100,
        ...Shadows.float,
    },
    resetBtnText: {
        color: Colors.white,
        fontWeight: '800',
        fontSize: 14,
    },

    // ── Health Package Card Styles ──
    pkgCard: {
        width: 240,
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: Colors.white,
        ...Shadows.card,
    },
    pkgHeader: {
        padding: 16,
        paddingBottom: 14,
    },
    pkgBadge: {
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(255,255,255,0.25)',
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 3,
        marginBottom: 8,
    },
    pkgBadgeText: {
        color: '#fff',
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 1,
    },
    pkgName: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '800',
        lineHeight: 20,
    },
    pkgPriceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 8,
    },
    pkgPrice: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '900',
    },
    pkgDiscountBadge: {
        backgroundColor: '#22c55e',
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 2,
    },
    pkgDiscountText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '800',
    },
    pkgOriginalPrice: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 12,
        textDecorationLine: 'line-through',
        marginTop: 2,
    },
    pkgBody: {
        padding: 14,
        gap: 10,
    },
    pkgTestsLabel: {
        fontSize: 11,
        fontWeight: '800',
        color: Colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    pkgTestsTags: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    pkgTag: {
        backgroundColor: '#f1f5f9',
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    pkgTagText: {
        fontSize: 10,
        color: '#475569',
        fontWeight: '600',
    },
    pkgBtn: {
        borderRadius: 12,
        paddingVertical: 10,
        alignItems: 'center',
        marginTop: 4,
    },
    pkgBtnText: {
        color: '#fff',
        fontWeight: '800',
        fontSize: 13,
    },
});




