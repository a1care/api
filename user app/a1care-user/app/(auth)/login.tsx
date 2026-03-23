import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    Alert,
    ActivityIndicator,
    ScrollView,
    StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
// Firebase Imports - handled safely for Expo Go
import { useAuthStore } from '@/stores/auth.store';

export default function LoginScreen() {
    const router = useRouter();
    const [mobile, setMobile] = useState('');
    const [loading, setLoading] = useState(false);
    const { setConfirmationResult } = useAuthStore();
    
    const handleSendOtp = async () => {
        const cleaned = mobile.replace(/\D/g, '');
        if (cleaned.length < 10) {
            Alert.alert('Invalid Number', 'Please enter a valid 10-digit mobile number.');
            return;
        }
        setLoading(true);
        try {
            // STEP 1: Dev Bypass (Enabled for Development/Expo/Testing)
            // Redirect straight to OTP screen with bypass flag
            if (true) {
                console.log("[Login] Using Bypass for:", cleaned);
                router.push({ pathname: '/(auth)/otp', params: { mobile: cleaned, isBypass: "true" } });
                return;
            }

            // STEP 2: Use Native Firebase (will throw if in Expo Go)
            let auth;
            try {
                auth = require('@react-native-firebase/auth').default;
            } catch (e) {
                throw new Error("Phone OTP requires a Development Build. Please ensure you are using a signed release APK.");
            }

            const e164PhoneNumber = `+91${cleaned}`;
            const confirmation = await auth().signInWithPhoneNumber(e164PhoneNumber);
            
            setConfirmationResult(confirmation);
            router.push({ pathname: '/(auth)/otp', params: { mobile: cleaned, verificationId: confirmation.verificationId } });
        } catch (err: any) {
            console.error(err);
            Alert.alert('Error', err?.message ?? 'Failed to send OTP. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <StatusBar style="dark" />
            <LinearGradient colors={["#C8E6F9", "#EBF5FB", "#FFFFFF"]} style={StyleSheet.absoluteFill} />

            <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 28 }}>
                {/* Back */}
                {router.canGoBack() && (
                    <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 20 }}>
                        <Text style={styles.back}>← Back</Text>
                    </TouchableOpacity>
                )}

                {/* Logo */}
                <Text style={styles.logo}>
                    <Text style={{ color: "#1A7FD4" }}>A1</Text>
                    <Text style={{ color: "#27AE60" }}>Care</Text>
                    <Text style={{ color: "#1A7FD4" }}> 24/7</Text>
                </Text>

                <Text style={styles.heading}>Welcome Back</Text>
                <Text style={styles.sub}>Sign in to your healthcare account</Text>

                <View style={styles.form}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Mobile Number</Text>
                        <View style={styles.inputWrapper}>
                            <Text style={styles.prefix}>+91</Text>
                            <TextInput
                                style={styles.flexInput}
                                placeholder="98765 43210"
                                keyboardType="phone-pad"
                                value={mobile}
                                onChangeText={setMobile}
                                maxLength={10}
                                placeholderTextColor="#9CB3C4"
                            />
                        </View>
                    </View>

                        <TouchableOpacity onPress={handleSendOtp} disabled={loading} activeOpacity={0.85}>
                            <LinearGradient
                                colors={["#1A7FD4", "#0D5FA0"]}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                style={styles.cta}
                            >
                                {loading ? (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                        <ActivityIndicator color="#fff" />
                                        <Text style={styles.ctaText}>Contacting Server...</Text>
                                    </View>
                                ) : (
                                    <Text style={styles.ctaText}>Send OTP</Text>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>

                    <Text style={styles.disclaimer}>
                        By continuing, you agree to our <Text onPress={() => router.push('/terms')} style={{ color: "#1A7FD4", fontWeight: "700" }}>Terms</Text> and <Text onPress={() => router.push('/privacy')} style={{ color: "#1A7FD4", fontWeight: "700" }}>Privacy Policy</Text>
                    </Text>
                </View>

                {/* Trust badges */}
                <View style={styles.badges}>
                    {['🔒 100% Secure', '⚡ 24/7 Available'].map((b) => (
                        <View key={b} style={styles.badge}>
                            <Text style={styles.badgeText}>{b}</Text>
                        </View>
                    ))}
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    back: { fontSize: 16, color: "#1A7FD4", fontWeight: "600" },
    logo: { fontSize: 26, fontWeight: "900", textAlign: "center", marginBottom: 8 },
    heading: { fontSize: 26, fontWeight: "800", color: "#0D2E4D", textAlign: "center" },
    sub: { fontSize: 14, color: "#4A6E8A", textAlign: "center", marginTop: 6, marginBottom: 28 },
    form: { gap: 16 },
    inputGroup: { gap: 8 },
    label: { fontSize: 13, fontWeight: "700", color: "#0D2E4D", marginLeft: 4 },
    inputWrapper: {
        flexDirection: "row",
        alignItems: "center",
        height: 52, backgroundColor: "#FFFFFF", borderRadius: 16,
        paddingHorizontal: 18,
        shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
        borderWidth: 1.5, borderColor: "#D8EAF5",
    },
    prefix: { fontSize: 15, color: "#4A6E8A", fontWeight: "600", marginRight: 8 },
    flexInput: { flex: 1, fontSize: 15, color: "#0D2E4D" },
    cta: {
        height: 58, borderRadius: 29, alignItems: "center", justifyContent: "center",
        shadowColor: "#1A7FD4", shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
        marginTop: 8,
    },
    ctaText: { fontSize: 17, fontWeight: "800", color: "#fff" },
    disclaimer: { fontSize: 12, color: "#6B8A9E", textAlign: "center", marginTop: 10 },
    badges: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginTop: 30 },
    badge: {
        backgroundColor: 'rgba(26, 127, 212, 0.1)',
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    badgeText: { color: '#1A7FD4', fontSize: 12, fontWeight: '600' },
});

