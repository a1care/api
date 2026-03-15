import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Alert,
    ActivityIndicator,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    Modal,
    FlatList,
    Animated,
    Easing,
} from 'react-native';
import { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/stores/auth.store';

const GENDERS = ['Male', 'Female', 'Other'] as const;

// Constants for Date Picker
const YEARS = Array.from({ length: 100 }, (_, i) => (new Date().getFullYear() - i).toString());
const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];
const DAYS = Array.from({ length: 31 }, (_, i) => (i + 1).toString().padStart(2, '0'));

export default function OnboardingScreen() {
    const router = useRouter();
    const { setUser } = useAuthStore();

    const [name, setName] = useState('');
    const [gender, setGender] = useState<'Male' | 'Female' | 'Other' | ''>('');
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);

    // Custom Date State
    const [selectedDay, setSelectedDay] = useState('');
    const [selectedMonth, setSelectedMonth] = useState('');
    const [selectedYear, setSelectedYear] = useState('');
    const [showDateModal, setShowDateModal] = useState(false);
    const [pickingType, setPickingType] = useState<'day' | 'month' | 'year'>('day');

    // Thinking Sequence State
    const [showThinking, setShowThinking] = useState(false);
    const [phraseIndex, setPhraseIndex] = useState(0);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;

    const phrases = [
        "Analyzing preferences...",
        "Syncing with A1Care",
        "Personalizing your dashboard"
    ];

    useEffect(() => {
        if (showThinking) {
            // Pulse animation for the "AI Glow"
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.3, duration: 800, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
                ])
            ).start();

            // Cycle through phrases
            let timer: NodeJS.Timeout;
            const runSequence = (index: number) => {
                if (index >= phrases.length) return;

                setPhraseIndex(index);
                // Fade In
                Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();

                timer = setTimeout(() => {
                    // Fade Out
                    Animated.timing(fadeAnim, { toValue: 0, duration: 600, useNativeDriver: true }).start(() => {
                        runSequence(index + 1);
                    });
                }, 1200);
            };

            runSequence(0);
            return () => clearTimeout(timer);
        }
    }, [showThinking]);

    const handleComplete = async () => {
        if (!name.trim()) {
            Alert.alert('Name Required', 'Please enter your full name.');
            return;
        }

        const dobString = selectedDay && selectedMonth && selectedYear
            ? `${selectedYear}-${(MONTHS.indexOf(selectedMonth) + 1).toString().padStart(2, '0')}-${selectedDay.padStart(2, '0')}`
            : undefined;

        // Start Premium Thinking Sequence immediately
        setShowThinking(true);

        try {
            // Run API call and sequence timer in parallel
            const [updated] = await Promise.all([
                authService.updateProfile({
                    name: name.trim(),
                    gender: gender || undefined,
                    dateOfBirth: dobString as any,
                    email: email.trim() || undefined,
                    isRegistered: true
                } as any),
                new Promise(resolve => setTimeout(resolve, 4500))
            ]);

            setUser(updated);
            router.replace('/(tabs)');

        } catch (err: any) {
            setShowThinking(false);
            Alert.alert('Error', err?.response?.data?.message ?? 'Failed to save profile.');
        }
    };

    const handleSkip = async () => {
        setLoading(true);
        try {
            // Signal to backend that user has "registered" even if profile is incomplete
            const updated = await authService.updateProfile({
                isRegistered: true
            } as any);
            setUser(updated);
            router.replace('/(tabs)');
        } catch (err) {
            // If API fails, still try to navigate to avoid blocking the user
            router.replace('/(tabs)');
        } finally {
            setLoading(false);
        }
    };

    const renderPickerModal = () => (
        <Modal visible={showDateModal} transparent animationType="slide">
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Select {pickingType.toUpperCase()}</Text>
                        <TouchableOpacity onPress={() => setShowDateModal(false)}>
                            <Text style={{ color: '#1A7FD4', fontWeight: '700' }}>Done</Text>
                        </TouchableOpacity>
                    </View>
                    <FlatList
                        data={pickingType === 'day' ? DAYS : pickingType === 'month' ? MONTHS : YEARS}
                        keyExtractor={(item) => item}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.pickerItem}
                                onPress={() => {
                                    if (pickingType === 'day') setSelectedDay(item);
                                    else if (pickingType === 'month') setSelectedMonth(item);
                                    else setSelectedYear(item);
                                    setShowDateModal(false);
                                }}
                            >
                                <Text style={styles.pickerItemText}>{item}</Text>
                            </TouchableOpacity>
                        )}
                    />
                </View>
            </View>
        </Modal>
    );

    return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <LinearGradient colors={["#C8E6F9", "#EBF5FB", "#FFFFFF"]} style={StyleSheet.absoluteFill} />
            <StatusBar style="dark" />

            <ScrollView contentContainerStyle={{ padding: 28, paddingTop: 60, paddingBottom: 100 }}>
                {/* Back */}
                <TouchableOpacity onPress={() => router.replace('/(auth)/login')} style={{ marginBottom: 20 }}>
                    <Text style={styles.back}>← Back</Text>
                </TouchableOpacity>

                {/* Logo */}
                <Text style={styles.logo}>
                    <Text style={{ color: "#1A7FD4" }}>A1</Text>
                    <Text style={{ color: "#27AE60" }}>Care</Text>
                    <Text style={{ color: "#1A7FD4" }}> 24/7</Text>
                </Text>

                <Text style={styles.heading}>Complete Your Profile</Text>
                <Text style={styles.sub}>Help us personalize your healthcare experience</Text>

                <View style={{ gap: 16, marginTop: 8 }}>
                    {/* Name */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Full Name *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter your full name"
                            placeholderTextColor="#9CB3C4"
                            value={name}
                            onChangeText={setName}
                            autoCapitalize="words"
                        />
                    </View>

                    {/* Email */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Email Address</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="you@example.com"
                            placeholderTextColor="#9CB3C4"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                    </View>

                    {/* DOB Custom */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Date of Birth</Text>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                            <TouchableOpacity
                                style={[styles.input, { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 0 }]}
                                onPress={() => { setPickingType('day'); setShowDateModal(true); }}
                            >
                                <Text style={{ color: selectedDay ? '#0D2E4D' : '#9CB3C4' }}>{selectedDay || 'DD'}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.input, { flex: 2, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 0 }]}
                                onPress={() => { setPickingType('month'); setShowDateModal(true); }}
                            >
                                <Text style={{ color: selectedMonth ? '#0D2E4D' : '#9CB3C4' }}>{selectedMonth || 'Month'}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.input, { flex: 1.5, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 0 }]}
                                onPress={() => { setPickingType('year'); setShowDateModal(true); }}
                            >
                                <Text style={{ color: selectedYear ? '#0D2E4D' : '#9CB3C4' }}>{selectedYear || 'YYYY'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Gender */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Gender</Text>
                        <View style={styles.genderRow}>
                            {GENDERS.map((g) => (
                                <TouchableOpacity
                                    key={g}
                                    style={[styles.genderBtn, gender === g && styles.genderBtnActive]}
                                    onPress={() => setGender(g)}
                                >
                                    <Text style={[styles.genderText, gender === g && styles.genderTextActive]}>{g}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* CTA */}
                    <TouchableOpacity onPress={handleComplete} disabled={loading} activeOpacity={0.85} style={{ marginTop: 20 }}>
                        <LinearGradient
                            colors={["#1A7FD4", "#0D5FA0"]}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                            style={styles.cta}
                        >
                            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.ctaText}>Complete Setup</Text>}
                        </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={handleSkip} disabled={loading} style={{ alignItems: 'center', marginTop: 10 }}>
                        <Text style={{ color: '#4A6E8A', fontWeight: '600' }}>Skip for now</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
            {renderPickerModal()}

            {/* Premium Thinking Overlay */}
            {showThinking && (
                <Modal transparent animationType="fade" visible={showThinking}>
                    <View style={styles.thinkingOverlay}>
                        <LinearGradient
                            colors={['rgba(255,255,255,0.95)', '#FFFFFF']}
                            style={StyleSheet.absoluteFill}
                        />

                        <View style={styles.thinkingContent}>
                            <Animated.View style={[styles.aiGlow, { transform: [{ scale: pulseAnim }] }]}>
                                <LinearGradient
                                    colors={['#1A7FD4', '#4FACFE']}
                                    style={StyleSheet.absoluteFill}
                                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                                />
                            </Animated.View>

                            <Animated.View style={{ opacity: fadeAnim, alignItems: 'center' }}>
                                <Text style={styles.thinkingText}>{phrases[phraseIndex]}</Text>
                                <View style={styles.dotContainer}>
                                    {[0, 1, 2].map(i => (
                                        <View key={i} style={styles.typingDot} />
                                    ))}
                                </View>
                            </Animated.View>
                        </View>
                    </View>
                </Modal>
            )}
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    back: { fontSize: 16, color: "#1A7FD4", fontWeight: "600" },
    logo: { fontSize: 26, fontWeight: "900", textAlign: "center", marginBottom: 8 },
    heading: { fontSize: 24, fontWeight: "800", color: "#0D2E4D", textAlign: "center" },
    sub: { fontSize: 14, color: "#4A6E8A", textAlign: "center", marginTop: 6, marginBottom: 16 },
    inputGroup: { gap: 8 },
    label: { fontSize: 14, fontWeight: "800", color: "#0D2E4D", marginLeft: 4 },
    input: {
        height: 52, backgroundColor: "#FFFFFF", borderRadius: 16,
        paddingHorizontal: 18, fontSize: 15, color: "#0D2E4D",
        shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
        borderWidth: 1.5, borderColor: "#D8EAF5",
    },
    genderRow: { flexDirection: 'row', gap: 10 },
    genderBtn: {
        flex: 1, height: 52, backgroundColor: "#FFFFFF", borderRadius: 16,
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 1.5, borderColor: "#D8EAF5",
    },
    genderBtnActive: { borderColor: "#1A7FD4", backgroundColor: "#EBF5FB" },
    genderText: { fontSize: 14, color: "#4A6E8A", fontWeight: "600" },
    genderTextActive: { color: "#1A7FD4", fontWeight: "800" },
    cta: {
        height: 58, borderRadius: 29, alignItems: "center", justifyContent: "center",
        shadowColor: "#1A7FD4", shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
    },
    ctaText: { fontSize: 17, fontWeight: "800", color: "#fff" },
    modalOverlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '60%',
    },
    modalHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#EBF5FB',
    },
    modalTitle: { fontSize: 18, fontWeight: '800', color: '#0D2E4D' },
    pickerItem: {
        paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F5F9FC', alignItems: 'center',
    },
    pickerItemText: { fontSize: 16, color: '#4A6E8A', fontWeight: '600' },

    // Thinking Overlay Styles
    thinkingOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    thinkingContent: {
        alignItems: 'center',
        gap: 40,
    },
    aiGlow: {
        width: 80,
        height: 80,
        borderRadius: 40,
        elevation: 20,
        shadowColor: '#1A7FD4',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 20,
        overflow: 'hidden',
    },
    thinkingText: {
        fontSize: 20,
        fontWeight: '700',
        color: '#0D2E4D',
        textAlign: 'center',
        letterSpacing: -0.5,
    },
    dotContainer: {
        flexDirection: 'row',
        gap: 6,
        marginTop: 12,
    },
    typingDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#1A7FD4',
        opacity: 0.4,
    },
});

