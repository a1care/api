import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { LinearGradient } from "expo-linear-gradient";
import { Toast } from "../components/CustomToast";

export default function BankDetailsScreen() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [form, setForm] = useState({
        accountHolderName: "",
        accountNumber: "",
        ifscCode: "",
        bankName: "",
        upiId: ""
    });

    const { data: staffData, isLoading } = useQuery({
        queryKey: ["bankStaffDetails"],
        queryFn: async () => {
            const res = await api.get("/doctor/auth/details");
            const data = res.data.data;
            if (data?.bankDetails) {
                setForm(data.bankDetails);
            }
            return data;
        }
    });

    const updateMutation = useMutation({
        mutationFn: async (updatedForm: typeof form) => {
            return await api.put("/doctor/auth/register", {
                bankDetails: updatedForm
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["bankStaffDetails"] });
            queryClient.invalidateQueries({ queryKey: ["profileDetails"] });
            Toast.show({
                type: "success",
                text1: "Banking Updated",
                text2: "Your settlement details are now secure."
            });
            setTimeout(() => router.back(), 1000);
        },
        onError: (err: any) => {
            console.error(err?.response?.data || err);
            Toast.show({
                type: "error",
                text1: "Upload Failed",
                text2: "We couldn't save your bank info. Try again."
            });
        }
    });

    const handleSave = () => {
        const { accountHolderName, accountNumber, ifscCode, bankName } = form;
        
        if (!accountHolderName || !accountNumber || !ifscCode || !bankName) {
            Toast.show({
                type: "error",
                text1: "Missing Fields",
                text2: "Please provide all bank account details."
            });
            return;
        }

        if (accountHolderName.length < 3) {
            Toast.show({ type: "error", text1: "Invalid Name", text2: "Account holder name must be at least 3 characters." });
            return;
        }
        if (bankName.length < 3) {
            Toast.show({ type: "error", text1: "Invalid Bank", text2: "Bank name must be at least 3 characters." });
            return;
        }
        if (accountNumber.length < 9) {
            Toast.show({ type: "error", text1: "Invalid Account", text2: "Account number must be at least 9 characters." });
            return;
        }
        if (ifscCode.length !== 11) {
            Toast.show({ type: "error", text1: "Invalid IFSC", text2: "IFSC code must be exactly 11 characters." });
            return;
        }
        
        updateMutation.mutate(form);
    };

    return (
        <SafeAreaView style={styles.container}>
            <LinearGradient colors={["#F8FAFC", "#F1F5F9"]} style={styles.gradient} />
            
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#1E293B" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Settlement Methods</Text>
                <View style={{ width: 40 }} />
            </View>

            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    
                    <View style={styles.cardInfo}>
                        <LinearGradient colors={["#2D935C", "#1B5E3C"]} style={styles.cardGradient}>
                            <FontAwesome5 name="university" size={32} color="rgba(255,255,255,0.3)" style={styles.cardIcon} />
                            <Text style={styles.cardLabel}>Direct Bank Settlement</Text>
                            <Text style={styles.cardSub}>Payments will be credited to this account</Text>
                        </LinearGradient>
                    </View>

                    {isLoading ? (
                        <ActivityIndicator size="large" color="#2D935C" style={{ marginTop: 50 }} />
                    ) : (
                        <View style={styles.form}>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Account Holder Name</Text>
                                <TextInput
                                    style={styles.input}
                                    value={form.accountHolderName}
                                    onChangeText={(v) => setForm(prev => ({ ...prev, accountHolderName: v }))}
                                    placeholder="e.g. John Doe"
                                    placeholderTextColor="#94A3B8"
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Bank Name</Text>
                                <TextInput
                                    style={styles.input}
                                    value={form.bankName}
                                    onChangeText={(v) => setForm(prev => ({ ...prev, bankName: v }))}
                                    placeholder="e.g. HDFC Bank"
                                    placeholderTextColor="#94A3B8"
                                />
                            </View>

                            <View style={styles.row}>
                                <View style={[styles.inputGroup, { flex: 1 }]}>
                                    <Text style={styles.label}>Account Number</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={form.accountNumber}
                                        onChangeText={(v) => setForm(prev => ({ ...prev, accountNumber: v }))}
                                        placeholder="0000 0000 0000"
                                        placeholderTextColor="#94A3B8"
                                        keyboardType="numeric"
                                    />
                                </View>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>IFSC Code</Text>
                                <TextInput
                                    style={styles.input}
                                    value={form.ifscCode}
                                    onChangeText={(v) => setForm(prev => ({ ...prev, ifscCode: v.toUpperCase() }))}
                                    placeholder="HDFC0000123"
                                    placeholderTextColor="#94A3B8"
                                    autoCapitalize="characters"
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>UPI ID (Optional)</Text>
                                <TextInput
                                    style={styles.input}
                                    value={form.upiId}
                                    onChangeText={(v) => setForm(prev => ({ ...prev, upiId: v }))}
                                    placeholder="e.g. john@okaxis"
                                    placeholderTextColor="#94A3B8"
                                />
                            </View>

                            <TouchableOpacity
                                style={[styles.saveBtn, updateMutation.isPending && styles.saveBtnDisabled]}
                                onPress={handleSave}
                                disabled={updateMutation.isPending}
                            >
                                {updateMutation.isPending ? (
                                    <ActivityIndicator color="#FFF" />
                                ) : (
                                    <Text style={styles.saveBtnText}>Save Bank Account</Text>
                                )}
                            </TouchableOpacity>

                            <View style={styles.securityBox}>
                                <Ionicons name="shield-checkmark" size={16} color="#64748B" />
                                <Text style={styles.securityText}>Secure 256-bit encrypted bank storage</Text>
                            </View>
                        </View>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F8FAFC" },
    gradient: { ...StyleSheet.absoluteFillObject },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 15, backgroundColor: "transparent" },
    backBtn: { padding: 8, backgroundColor: "#FFF", borderRadius: 12, elevation: 2, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 5 },
    headerTitle: { fontSize: 18, fontWeight: "900", color: "#1E293B" },
    scrollContent: { padding: 24, paddingBottom: 60 },
    cardInfo: { marginBottom: 32, borderRadius: 24, overflow: 'hidden', elevation: 8, shadowColor: "#2D935C", shadowOpacity: 0.2, shadowRadius: 15 },
    cardGradient: { padding: 28, minHeight: 140, justifyContent: 'center' },
    cardIcon: { position: 'absolute', top: 20, right: 20 },
    cardLabel: { fontSize: 18, fontWeight: '900', color: '#FFF' },
    cardSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 6, fontWeight: '500' },
    form: { gap: 24 },
    row: { flexDirection: 'row', gap: 15 },
    inputGroup: { gap: 10 },
    label: { fontSize: 14, fontWeight: "700", color: "#475569", marginLeft: 4 },
    input: {
        height: 60, backgroundColor: "#FFF", borderRadius: 18, paddingHorizontal: 20, fontSize: 16, color: "#1E293B",
        borderWidth: 1.5, borderColor: "#F1F5F9", elevation: 2, shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 8
    },
    saveBtn: {
        backgroundColor: "#2D935C", height: 64, borderRadius: 20, justifyContent: "center", alignItems: "center", marginTop: 12,
        shadowColor: "#2D935C", shadowOpacity: 0.3, shadowRadius: 15, elevation: 10
    },
    saveBtnDisabled: { opacity: 0.7 },
    saveBtnText: { color: "#FFF", fontSize: 18, fontWeight: "800" },
    securityBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: -8 },
    securityText: { fontSize: 12, color: '#94A3B8', fontWeight: '500' }
});
