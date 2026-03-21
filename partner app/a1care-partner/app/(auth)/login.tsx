import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Toast } from "../../components/CustomToast";
import { api } from "../../lib/api";
import { useAuthStore, PartnerRole } from "../../stores/auth";

// Modern Native Firebase Auth
import auth from '@react-native-firebase/auth';

// ─── DEV BYPASS CONSTANTS ─────────────────────────────────────────────────────
const DEV_BYPASS_MOBILE = '9701677607';
const DEV_BYPASS_OTP = '123123';
// ─────────────────────────────────────────────────────────────────────────────

const roleLabels: Record<string, string> = {
    doctor: "Doctor", nurse: "Nurse", ambulance: "Ambulance", rental: "Medical Rental",
};

export default function LoginScreen() {
    const router = useRouter();
    const { role } = useLocalSearchParams<{ role: string }>();
    const { setAuth, setConfirmationResult, confirmationResult } = useAuthStore();
    const [mobile, setMobile] = useState("");
    const [otp, setOtp] = useState("");
    const [otpSessionId, setOtpSessionId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [verifying, setVerifying] = useState(false);

    const handleSendOtp = async () => {
        const cleaned = mobile.replace(/\D/g, '');
        if (cleaned.length < 10) {
            Toast.show({ type: 'error', text1: 'Invalid Mobile', text2: 'Please enter a valid 10-digit mobile number' });
            return;
        }
        setLoading(true);
        try {
            // ─── DEV BYPASS: skip Firebase for test number ──────────────────────────
            if (cleaned === DEV_BYPASS_MOBILE) {
                Toast.show({ type: 'success', text1: 'Dev Bypass Active', text2: 'Enter OTP: 123123' });
                setOtpSessionId('BYPASS');
                setLoading(false);
                return;
            }
            // ───────────────────────────────────────────────────────────────
            const e164PhoneNumber = `+91${cleaned}`;
            const confirmation = await auth().signInWithPhoneNumber(e164PhoneNumber);
            setConfirmationResult(confirmation);
            setOtpSessionId(confirmation.verificationId);
            Toast.show({ type: 'success', text1: 'OTP Sent', text2: 'Enter the code you received.' });
        } catch (err: any) {
            Toast.show({ type: 'error', text1: 'Error', text2: err?.message || 'Failed to send OTP.' });
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async () => {
        if (otp.length < 6) {
            Toast.show({ type: 'error', text1: 'Invalid OTP', text2: 'Please enter the complete OTP' });
            return;
        }
        setVerifying(true);
        try {
            let idToken = undefined;
            const cleaned = mobile.replace(/\D/g, '');

            // ─── DEV BYPASS ───────────────────────────────────────────────────
            if (cleaned === DEV_BYPASS_MOBILE && otp === DEV_BYPASS_OTP) {
                console.log('[DEV BYPASS] Partner: skipping Firebase');
                // idToken stays undefined — backend will match on otp alone
            } else if (confirmationResult) {
                const userCredential = await confirmationResult.confirm(otp);
                idToken = await userCredential.user.getIdToken(true);
            } else {
                Toast.show({ type: 'error', text1: 'Error', text2: 'Session expired. Request OTP again.' });
                return;
            }
            // ───────────────────────────────────────────────────────────────

            // Backend verification using idToken
            console.log(`[PartnerAuth] Verifying mobile: ${mobile}`);
            const res = await api.post("/doctor/auth/verify-otp", {
                idToken,
                mobileNumber: mobile
            });
            const { token } = res.data.data;

            api.defaults.headers.Authorization = `Bearer ${token}`;
            const detailsRes = await api.get("/doctor/auth/details");
            const staff = detailsRes.data.data;

            if (!staff.isRegistered) {
                Toast.show({
                    type: 'success',
                    text1: 'Verified',
                    text2: 'Please complete your registration.'
                });
                router.push({
                    pathname: "/(auth)/register",
                    params: { role: role ?? "doctor", token }
                });
            } else {
                Toast.show({
                    type: 'success',
                    text1: 'Login Successful',
                    text2: 'Welcome back!'
                });
                await setAuth(token, { ...staff, role: role as PartnerRole });
                router.replace("/(tabs)/home");
            }
        } catch (err: any) {
             console.error('[PartnerAuth] Error details:', {
                message: err.message,
                response: err.response?.data,
                url: err.config?.url
            });
            let msg = err?.response?.data?.message || err?.message || "Invalid OTP";
            if (err.message === 'Network Error') msg = "Cannot reach server. Check internet.";

            Toast.show({
                type: 'error',
                text1: 'Verification Failed',
                text2: msg
            });
        } finally {
            setVerifying(false);
        }
    };

    return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
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

                <Text style={styles.heading}>Welcome Back</Text>
                <Text style={styles.sub}>Sign in as a{role === "ambulance" ? "n" : ""} {roleLabels[role ?? ""] ?? "Partner"}</Text>

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
                                editable={!otpSessionId}
                            />
                        </View>
                    </View>

                    {otpSessionId && (
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Enter OTP</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="0 0 0 0"
                                keyboardType="number-pad"
                                value={otp}
                                onChangeText={setOtp}
                                maxLength={6}
                                placeholderTextColor="#9CB3C4"
                                autoFocus
                            />
                            <TouchableOpacity onPress={() => setOtpSessionId(null)} style={{ alignSelf: "flex-end" }}>
                                <Text style={styles.resendText}>Change Mobile Number</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {!otpSessionId ? (
                        <TouchableOpacity onPress={handleSendOtp} disabled={loading} activeOpacity={0.85}>
                            <LinearGradient
                                colors={["#1A7FD4", "#0D5FA0"]}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                style={styles.cta}
                            >
                                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.ctaText}>Send OTP</Text>}
                            </LinearGradient>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity onPress={handleVerifyOtp} disabled={verifying} activeOpacity={0.85}>
                            <LinearGradient
                                colors={["#27AE60", "#1E8449"]}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                style={styles.cta}
                            >
                                {verifying ? <ActivityIndicator color="#fff" /> : <Text style={styles.ctaText}>Verify & Login</Text>}
                            </LinearGradient>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity
                        onPress={() => {
                            setOtpSessionId(null);
                            setMobile("");
                            setOtp("");
                        }}
                        style={{ marginTop: 20, alignItems: "center" }}
                    >
                        <Text style={styles.registerLink}>
                            New partner? <Text style={{ color: "#1A7FD4", fontWeight: "700" }}>Get started here</Text>
                        </Text>
                    </TouchableOpacity>

                    <Text style={styles.disclaimer}>
                        By continuing, you agree to our <Text onPress={() => router.push('/terms')} style={{ color: "#1A7FD4", fontWeight: "700" }}>Terms</Text> and <Text onPress={() => router.push('/privacy')} style={{ color: "#1A7FD4", fontWeight: "700" }}>Privacy Policy</Text>
                    </Text>
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
    input: {
        height: 52, backgroundColor: "#FFFFFF", borderRadius: 16,
        paddingHorizontal: 18, fontSize: 15, color: "#0D2E4D",
        shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
        borderWidth: 1.5, borderColor: "#D8EAF5",
        textAlign: "center", letterSpacing: 8, fontWeight: "700"
    },
    cta: {
        height: 58, borderRadius: 29, alignItems: "center", justifyContent: "center",
        shadowColor: "#1A7FD4", shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
        marginTop: 8,
    },
    ctaText: { fontSize: 17, fontWeight: "800", color: "#fff" },
    registerLink: { fontSize: 14, color: "#6B8A9E" },
    resendText: { fontSize: 12, color: "#1A7FD4", fontWeight: "600", marginTop: 4 },
    disclaimer: { fontSize: 12, color: "#6B8A9E", textAlign: "center", marginTop: 15 },
});
