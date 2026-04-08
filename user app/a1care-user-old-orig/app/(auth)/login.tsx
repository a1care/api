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
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from 'react-native-toast-message';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/stores/auth.store';
import { Ionicons } from '@expo/vector-icons';

// Import native Firebase and Google modules safely
const getAuth = () => {
    try {
        const auth = require('@react-native-firebase/auth');
        return auth.default || auth;
    } catch (e) {
        console.warn('Native Firebase Auth not found');
        return null;
    }
};

const getGoogleSignin = () => {
    try {
        const { GoogleSignin } = require('@react-native-google-signin/google-signin');
        return GoogleSignin;
    } catch (e) {
        console.warn('Google Sign-in module not found');
        return null;
    }
};

export default function LoginScreen() {
    const router = useRouter();
    const { setToken, setUser } = useAuthStore();
    const [mobile, setMobile] = useState('');
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);

    // Initialize Google Sign-in
    React.useEffect(() => {
        const GoogleSignin = getGoogleSignin();
        if (GoogleSignin) {
            GoogleSignin.configure({
                webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '826082561306-dummy.apps.googleusercontent.com',
            });
        }
    }, []);

    const handleGoogleSignIn = async () => {
        const GoogleSignin = getGoogleSignin();
        const auth = getAuth();
        if (!GoogleSignin || !auth) {
            Alert.alert("Notice", "Google Login requires a Production Build.");
            return;
        }

        setGoogleLoading(true);
        try {
            await GoogleSignin.hasPlayServices();
            const { data } = await GoogleSignin.signIn();
            const idToken = data?.idToken || (data as any).idToken;

            if (!idToken) throw new Error("Google ID Token missing");

            const googleCredential = auth.GoogleAuthProvider.credential(idToken);
            const userCredential = await auth().signInWithCredential(googleCredential);
            const fbToken = await userCredential.user.getIdToken(true);

            // Prefer phone from Firebase, otherwise use typed mobile
            const phone = userCredential.user.phoneNumber || (mobile ? `+91${mobile}` : null);
            if (!phone) {
                setGoogleLoading(false);
                Toast.show({
                    type: 'error',
                    text1: 'Mobile required',
                    text2: 'Please enter your mobile number above, then tap Google again.',
                    position: 'top'
                });
                return;
            }

            // Call backend
            const res = await authService.verifyOtp(phone, "GOOGLE", fbToken);
            setToken(res.data.token);
            const profile = await authService.getProfile();
            setUser(profile);

            router.replace(profile.isRegistered ? '/(tabs)' : '/(auth)/profile-setup');

        } catch (err: any) {
            console.error('[Google Login] Error:', err);
            Toast.show({ type: 'error', text1: 'Login Failed', text2: err.message });
        } finally {
            setGoogleLoading(false);
        }
    };

    const handleSendOtp = async () => {
        const cleaned = mobile.replace(/\D/g, '');
        if (cleaned.length < 10) {
            Toast.show({
                type: 'error',
                text1: 'Invalid Number',
                text2: 'Please enter a valid 10-digit mobile number.',
                position: 'top'
            });
            return;
        }
        setLoading(true);
        try {
            // Dev Bypass (Always enabled as Firebase is removed)
            console.log("[Login] Using Bypass for:", cleaned);
            router.push({ pathname: '/(auth)/otp', params: { mobile: cleaned, isBypass: "true" } });
        } catch (err: any) {
            console.error('[Login] Send OTP Error:', err);
            let msg = err?.response?.data?.message || err?.message || "Failed to send OTP.";
            Toast.show({
                type: 'error',
                text1: 'Send OTP Failed',
                text2: msg,
                position: 'top'
            });
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
                        <Text style={styles.label}>Mobile Number <Text style={{ color: '#E74C3C' }}>*</Text></Text>
                        <View style={styles.inputWrapper}>
                            <Text style={styles.prefix}>+91</Text>
                            <TextInput
                                style={styles.flexInput}
                                placeholder="98765 43210"
                                keyboardType="phone-pad"
                                value={mobile}
                                onChangeText={(text) => setMobile(text.replace(/\D/g, ''))}
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

                    <View style={styles.divider}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerText}>OR</Text>
                        <View style={styles.dividerLine} />
                    </View>

                    <TouchableOpacity 
                        style={styles.googleBtn} 
                        onPress={handleGoogleSignIn}
                        disabled={googleLoading}
                        activeOpacity={0.8}
                    >
                        {googleLoading ? (
                            <ActivityIndicator color="#1A7FD4" />
                        ) : (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                <Ionicons name="logo-google" size={20} color="#EA4335" />
                                <Text style={styles.googleBtnText}>Continue with Google</Text>
                            </View>
                        )}
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
    label: { fontSize: 13, fontWeight: "700", color: "#1A4D7A", marginLeft: 4 },
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
    disclaimer: { fontSize: 12, color: "#6B8A9E", textAlign: "center", marginTop: 15 },
    divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 18, gap: 12 },
    dividerLine: { flex: 1, height: 1.5, backgroundColor: "#D8EAF5" },
    dividerText: { fontSize: 12, fontWeight: "700", color: "#9CB3C4" },
    googleBtn: {
        height: 56, backgroundColor: "#FFFFFF", borderRadius: 28,
        flexDirection: "row", alignItems: "center", justifyContent: "center",
        borderWidth: 1.5, borderColor: "#D8EAF5",
        shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
    },
    googleBtnText: { fontSize: 15, fontWeight: "700", color: "#0D2E4D" },
    badges: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginTop: 30 },
    badge: {
        backgroundColor: 'rgba(26, 127, 212, 0.1)',
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    badgeText: { color: '#1A7FD4', fontSize: 12, fontWeight: '600' },
});
