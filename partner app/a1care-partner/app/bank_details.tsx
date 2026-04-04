import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, ActivityIndicator, KeyboardAvoidingView, Platform
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { LinearGradient } from "expo-linear-gradient";
import { Toast } from "../components/CustomToast";

type Field = {
    key: keyof typeof INITIAL_FORM;
    label: string;
    placeholder: string;
    hint: string;
    icon: string;
    keyboard?: "default" | "numeric";
    autoCapitalize?: "none" | "characters" | "sentences" | "words";
    maxLength?: number;
};

const INITIAL_FORM = {
    accountHolderName: "",
    accountNumber: "",
    ifscCode: "",
    bankName: "",
    upiId: "",
};

const FIELDS: Field[] = [
    {
        key: "accountHolderName",
        label: "Account Holder Name",
        placeholder: "e.g. Ramesh Kumar",
        hint: "Enter name exactly as on your bank passbook",
        icon: "person-outline",
    },
    {
        key: "bankName",
        label: "Bank Name",
        placeholder: "e.g. State Bank of India",
        hint: "Enter the full name of your bank",
        icon: "business-outline",
    },
    {
        key: "accountNumber",
        label: "Account Number",
        placeholder: "e.g. 012345678901",
        hint: "9–18 digit account number (no spaces)",
        icon: "card-outline",
        keyboard: "numeric",
        maxLength: 18,
    },
    {
        key: "ifscCode",
        label: "IFSC Code",
        placeholder: "e.g. SBIN0001234",
        hint: "11-character code on your cheque book",
        icon: "barcode-outline",
        autoCapitalize: "characters",
        maxLength: 11,
    },
    {
        key: "upiId",
        label: "UPI ID  (Optional)",
        placeholder: "e.g. ramesh@okicici",
        hint: "Your UPI handle for instant settlements",
        icon: "flash-outline",
    },
];

export default function BankDetailsScreen() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [form, setForm] = useState(INITIAL_FORM);

    const { isLoading } = useQuery({
        queryKey: ["bankStaffDetails"],
        queryFn: async () => {
            const res = await api.get("/doctor/auth/details");
            const data = res.data.data;
            if (data?.bankDetails) setForm(data.bankDetails);
            return data;
        },
    });

    const updateMutation = useMutation({
        mutationFn: async (updatedForm: typeof form) => {
            return await api.put("/doctor/auth/register", { bankDetails: updatedForm });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["bankStaffDetails"] });
            queryClient.invalidateQueries({ queryKey: ["profileDetails"] });
            Toast.show({ type: "success", text1: "Details Saved!", text2: "Your settlement account is now linked." });
            setTimeout(() => router.back(), 1000);
        },
        onError: (err: any) => {
            console.error(err?.response?.data || err);
            Toast.show({ type: "error", text1: "Save Failed", text2: "Could not save bank details. Please try again." });
        },
    });

    const handleSave = () => {
        const { accountHolderName, accountNumber, ifscCode, bankName } = form;
        if (!accountHolderName || !accountNumber || !ifscCode || !bankName) {
            Toast.show({ type: "error", text1: "Missing Fields", text2: "Please fill all required bank details." });
            return;
        }
        if (accountHolderName.trim().length < 3) {
            Toast.show({ type: "error", text1: "Invalid Name", text2: "Name must be at least 3 characters." });
            return;
        }
        if (accountNumber.length < 9) {
            Toast.show({ type: "error", text1: "Invalid Account", text2: "Account number must be at least 9 digits." });
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
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={22} color="#1E293B" />
                </TouchableOpacity>
                <View>
                    <Text style={styles.headerTitle}>Settlement Details</Text>
                    <Text style={styles.headerSub}>Bank account for receiving payments</Text>
                </View>
                <View style={{ width: 40 }} />
            </View>

            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                    {/* Visual Bank Card */}
                    <LinearGradient colors={["#1B6B3A", "#2D935C"]} style={styles.bankCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                        <View style={styles.bankCardDeco1} />
                        <View style={styles.bankCardDeco2} />
                        <View style={styles.bankCardRow}>
                            <View style={styles.bankChip} />
                            <Ionicons name="wifi" size={20} color="rgba(255,255,255,0.5)" style={{ transform: [{ rotate: '90deg' }] }} />
                        </View>
                        <Text style={styles.bankCardNumber}>
                            {form.accountNumber
                                ? form.accountNumber.replace(/(\d{4})(?=\d)/g, "$1 ")
                                : "•••• •••• •••• ••••"}
                        </Text>
                        <View style={styles.bankCardFooter}>
                            <View>
                                <Text style={styles.bankCardFieldLabel}>ACCOUNT HOLDER</Text>
                                <Text style={styles.bankCardFieldValue}>
                                    {form.accountHolderName || "Your Name Here"}
                                </Text>
                            </View>
                            <View style={{ alignItems: "flex-end" }}>
                                <Text style={styles.bankCardFieldLabel}>IFSC CODE</Text>
                                <Text style={styles.bankCardFieldValue}>
                                    {form.ifscCode || "XXXXXXXXX"}
                                </Text>
                            </View>
                        </View>
                        <Text style={styles.bankCardName}>
                            {form.bankName || "Your Bank Name"}
                        </Text>
                    </LinearGradient>

                    {/* Info notice */}
                    <View style={styles.infoBox}>
                        <Ionicons name="information-circle" size={18} color="#1B6B3A" />
                        <Text style={styles.infoText}>
                            Settlements are processed within 3–5 working days. Ensure details match your bank records.
                        </Text>
                    </View>

                    {/* Form Fields */}
                    {isLoading ? (
                        <ActivityIndicator size="large" color="#2D935C" style={{ marginTop: 40 }} />
                    ) : (
                        <View style={styles.form}>
                            {FIELDS.map((field) => (
                                <View key={field.key} style={styles.inputGroup}>
                                    <View style={styles.labelRow}>
                                        <Ionicons name={field.icon as any} size={16} color="#2D935C" />
                                        <Text style={styles.label}>{field.label}</Text>
                                    </View>
                                    <TextInput
                                        style={styles.input}
                                        value={form[field.key]}
                                        onChangeText={(v) => {
                                            const val = field.autoCapitalize === "characters" ? v.toUpperCase() : v;
                                            setForm((prev) => ({ ...prev, [field.key]: val }));
                                        }}
                                        placeholder={field.placeholder}
                                        placeholderTextColor="#A0AABB"
                                        keyboardType={field.keyboard || "default"}
                                        autoCapitalize={field.autoCapitalize || "words"}
                                        maxLength={field.maxLength}
                                    />
                                    <Text style={styles.hint}>
                                        <Ionicons name="alert-circle-outline" size={11} color="#94A3B8" /> {field.hint}
                                    </Text>
                                </View>
                            ))}

                            {/* Save Button */}
                            <TouchableOpacity
                                style={[styles.saveBtn, updateMutation.isPending && styles.saveBtnDisabled]}
                                onPress={handleSave}
                                disabled={updateMutation.isPending}
                                activeOpacity={0.85}
                            >
                                <LinearGradient colors={["#2D935C", "#1B6B3A"]} style={styles.saveBtnGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                                    {updateMutation.isPending ? (
                                        <ActivityIndicator color="#FFF" />
                                    ) : (
                                        <>
                                            <Ionicons name="checkmark-circle" size={22} color="#FFF" />
                                            <Text style={styles.saveBtnText}>Save Settlement Account</Text>
                                        </>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>

                            {/* Security Badge */}
                            <View style={styles.securityBox}>
                                <Ionicons name="lock-closed" size={14} color="#94A3B8" />
                                <Text style={styles.securityText}>256-bit encrypted · Razorpay secured</Text>
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

    header: {
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#F1F5F9",
        backgroundColor: "#FFF",
    },
    backBtn: {
        width: 40, height: 40, borderRadius: 12, backgroundColor: "#F1F5F9",
        alignItems: "center", justifyContent: "center",
    },
    headerTitle: { fontSize: 17, fontWeight: "800", color: "#1E293B", textAlign: "center" },
    headerSub: { fontSize: 11, color: "#94A3B8", fontWeight: "500", textAlign: "center", marginTop: 2 },

    scrollContent: { padding: 20, paddingBottom: 60 },

    // Bank Card
    bankCard: {
        borderRadius: 24, padding: 24, marginBottom: 20,
        minHeight: 190, overflow: "hidden",
        shadowColor: "#1B6B3A", shadowOpacity: 0.3, shadowRadius: 20, elevation: 12,
    },
    bankCardDeco1: {
        position: "absolute", width: 200, height: 200, borderRadius: 100,
        backgroundColor: "rgba(255,255,255,0.05)", top: -60, right: -60,
    },
    bankCardDeco2: {
        position: "absolute", width: 150, height: 150, borderRadius: 75,
        backgroundColor: "rgba(255,255,255,0.05)", bottom: -40, left: -20,
    },
    bankCardRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
    bankChip: { width: 42, height: 30, backgroundColor: "rgba(255,255,255,0.25)", borderRadius: 6 },
    bankCardNumber: { fontSize: 18, fontWeight: "800", color: "#FFF", letterSpacing: 3, marginBottom: 20 },
    bankCardFooter: { flexDirection: "row", justifyContent: "space-between" },
    bankCardFieldLabel: { fontSize: 9, color: "rgba(255,255,255,0.6)", fontWeight: "700", letterSpacing: 1, marginBottom: 3 },
    bankCardFieldValue: { fontSize: 14, color: "#FFF", fontWeight: "700" },
    bankCardName: { fontSize: 12, color: "rgba(255,255,255,0.7)", fontWeight: "600", marginTop: 12 },

    // Info Box
    infoBox: {
        flexDirection: "row", gap: 10, backgroundColor: "#F0FDF4",
        borderRadius: 14, padding: 14, marginBottom: 24,
        borderWidth: 1, borderColor: "#BBF7D0", alignItems: "flex-start",
    },
    infoText: { flex: 1, fontSize: 12, color: "#166534", fontWeight: "500", lineHeight: 18 },

    // Form
    form: { gap: 20 },
    inputGroup: { gap: 8 },
    labelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    label: { fontSize: 13, fontWeight: "700", color: "#334155" },
    input: {
        height: 56, backgroundColor: "#FFF", borderRadius: 16,
        paddingHorizontal: 18, fontSize: 15, color: "#1E293B",
        borderWidth: 1.5, borderColor: "#E2E8F0",
        shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 6, elevation: 1,
    },
    hint: { fontSize: 11, color: "#94A3B8", marginLeft: 4, lineHeight: 16 },

    // Button
    saveBtn: { borderRadius: 18, overflow: "hidden", marginTop: 8 },
    saveBtnDisabled: { opacity: 0.6 },
    saveBtnGradient: {
        height: 60, flexDirection: "row", alignItems: "center",
        justifyContent: "center", gap: 10,
    },
    saveBtnText: { color: "#FFF", fontSize: 17, fontWeight: "800" },

    // Security
    securityBox: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
    securityText: { fontSize: 12, color: "#94A3B8", fontWeight: "500" },
});
