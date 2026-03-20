import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    Alert,
    ActivityIndicator,
    StyleSheet,
    ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/stores/auth.store';

// Firebase specific imports
import { PhoneAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '@/utils/firebase';

const OTP_LENGTH = 6;

export default function OtpScreen() {
    const router = useRouter();
    const { mobile, verificationId } = useLocalSearchParams<{ mobile: string, verificationId: string }>();
    const { setToken, setUser } = useAuthStore();

    const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
    const [loading, setLoading] = useState(false);
    const [resendTimer, setResendTimer] = useState(30);
    const inputs = useRef<(TextInput | null)[]>([]);

    useEffect(() => {
        if (resendTimer === 0) return;
        const t = setTimeout(() => setResendTimer((s) => s - 1), 1000);
        return () => clearTimeout(t);
    }, [resendTimer]);

    const handleChange = (val: string, idx: number) => {
        const digit = val.replace(/\D/g, '').slice(-1);
        const updated = [...otp];
        updated[idx] = digit;
        setOtp(updated);
        if (digit && idx < OTP_LENGTH - 1) inputs.current[idx + 1]?.focus();
    };

    const handleKeyPress = (e: any, idx: number) => {
        if (e.nativeEvent.key === 'Backspace' && !otp[idx] && idx > 0) {
            inputs.current[idx - 1]?.focus();
        }
    };

    const handleVerify = async () => {
        const code = otp.join('');
        if (code.length < OTP_LENGTH) {
            Alert.alert('Enter OTP', 'Please enter the complete 6-digit OTP.');
            return;
        }
        setLoading(true);
        try {
            // 1. Google verifies the SMS code secretly here on the phone
            let idToken = undefined;
            if (verificationId) {
                const credential = PhoneAuthProvider.credential(verificationId, code);
                const userCredential = await signInWithCredential(auth, credential);
                
                // 2. Google gives us a heavily encrypted Token of Trust
                idToken = await userCredential.user.getIdToken(true);
            }
            
            // 3. We show our backend the Token!
            const res = await authService.verifyOtp(mobile, code, idToken);
            const token = res.data.token;
            setToken(token);
            const user = await authService.getProfile();
            setUser(user);
            if (user.isRegistered) {
                router.replace('/(tabs)');
            } else {
                router.replace('/(auth)/profile-setup');
            }
        } catch (err: any) {
            Alert.alert('Invalid OTP', err?.response?.data?.message ?? 'Please check the code and try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        // Since Firebase requires ReCaptcha protection, resending forces the user back
        Alert.alert('Notice', 'For security reasons, please go back to the previous screen to request a new OTP.');
        router.back();
    };

    return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <StatusBar style="dark" />
            <LinearGradient colors={["#C8E6F9", "#EBF5FB", "#FFFFFF"]} style={StyleSheet.absoluteFill} />

            <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 28 }}>
                {/* Back */}
                <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 20 }}>
                    <Text style={styles.back}>← Back</Text>
                </TouchableOpacity>

                {/* Logo */}
                <Text style={styles.logo}>
                    <Text style={{ color: "#1A7FD4" }}>A1</Text>
                    <Text style={{ color: "#27AE60" }}>Care</Text>
                    <Text style={{ color: "#1A7FD4" }}> 24/7</Text>
                </Text>

                <Text style={styles.heading}>Verify Number</Text>
                <Text style={styles.sub}>
                    Enter 6-digit code sent to{"\n"}
                    <Text style={{ fontWeight: "700", color: "#0D2E4D" }}>+91 {mobile}</Text>
                </Text>

                <View style={styles.otpContainer}>
                    {otp.map((digit, i) => (
                        <TextInput
                            key={i}
                            ref={(el) => { inputs.current[i] = el; }}
                            style={[styles.otpBox, digit ? styles.otpBoxActive : null]}
                            value={digit}
                            onChangeText={(v) => handleChange(v, i)}
                            onKeyPress={(e) => handleKeyPress(e, i)}
                            keyboardType="number-pad"
                            maxLength={1}
                            selectTextOnFocus
                            autoFocus={i === 0}
                        />
                    ))}
                </View>

                <TouchableOpacity onPress={handleVerify} disabled={loading} activeOpacity={0.85}>
                    <LinearGradient
                        colors={["#1A7FD4", "#0D5FA0"]}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                        style={styles.cta}
                    >
                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.ctaText}>Verify & Continue</Text>}
                    </LinearGradient>
                </TouchableOpacity>

                <View style={styles.resendRow}>
                    <Text style={styles.resendText}>Didn't receive code? </Text>
                    {resendTimer > 0 ? (
                        <Text style={styles.timer}>Resend in {resendTimer}s</Text>
                    ) : (
                        <TouchableOpacity onPress={handleResend}>
                            <Text style={styles.resendBtn}>Resend OTP</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    back: { fontSize: 16, color: "#1A7FD4", fontWeight: "600" },
    logo: { fontSize: 26, fontWeight: "900", textAlign: "center", marginBottom: 8 },
    heading: { fontSize: 26, fontWeight: "800", color: "#0D2E4D", textAlign: "center" },
    sub: { fontSize: 14, color: "#4A6E8A", textAlign: "center", marginTop: 6, marginBottom: 28, lineHeight: 20 },
    otpContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    otpBox: {
        width: 44, height: 56, backgroundColor: "#FFFFFF", borderRadius: 12,
        borderWidth: 1.5, borderColor: "#D8EAF5",
        textAlign: 'center', fontSize: 22, fontWeight: '700', color: "#0D2E4D",
        shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 5, elevation: 1,
    },
    otpBoxActive: { borderColor: "#1A7FD4", backgroundColor: "#EBF5FB" },
    cta: {
        height: 58, borderRadius: 29, alignItems: "center", justifyContent: "center",
        shadowColor: "#1A7FD4", shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
        marginTop: 10,
    },
    ctaText: { fontSize: 17, fontWeight: "800", color: "#fff" },
    resendRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
    resendText: { color: "#6B8A9E" },
    timer: { color: "#0D2E4D", fontWeight: "600" },
    resendBtn: { color: "#1A7FD4", fontWeight: "700" },
});

