import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "../lib/api";

export default function BankDetailsScreen() {
    const router = useRouter();
    const [form, setForm] = useState({
        accountHolderName: "",
        accountNumber: "",
        ifscCode: "",
        bankName: "",
        upiId: ""
    });

    const { data: staffData, isLoading } = useQuery({
        queryKey: ["profileStaffDetails"],
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
            // We reuse the register endpoint or a new one if available. 
            // For now, let's assume we can update profile/details with bank info.
            // Since registerStaff supports bankDetails $set, we can use it.
            return await api.put("/doctor/auth/register", {
                ...staffData,
                bankDetails: updatedForm
            });
        },
        onSuccess: () => {
            Alert.alert("Success", "Bank details updated successfully.");
            router.replace("/(tabs)/profile");
        },
        onError: () => {
            Alert.alert("Error", "Failed to update bank details.");
        }
    });

    const handleSave = () => {
        if (!form.accountHolderName || !form.accountNumber || !form.ifscCode || !form.bankName) {
            Alert.alert("Error", "Please fill all required fields.");
            return;
        }
        updateMutation.mutate(form);
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#1E293B" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Bank Details</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
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
                                placeholder="Enter account holder name"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Account Number</Text>
                            <TextInput
                                style={styles.input}
                                value={form.accountNumber}
                                onChangeText={(v) => setForm(prev => ({ ...prev, accountNumber: v }))}
                                placeholder="Enter account number"
                                keyboardType="numeric"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>IFSC Code</Text>
                            <TextInput
                                style={styles.input}
                                value={form.ifscCode}
                                onChangeText={(v) => setForm(prev => ({ ...prev, ifscCode: v.toUpperCase() }))}
                                placeholder="e.g. SBIN0001234"
                                autoCapitalize="characters"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Bank Name</Text>
                            <TextInput
                                style={styles.input}
                                value={form.bankName}
                                onChangeText={(v) => setForm(prev => ({ ...prev, bankName: v }))}
                                placeholder="Enter bank name"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>UPI ID (Optional)</Text>
                            <TextInput
                                style={styles.input}
                                value={form.upiId}
                                onChangeText={(v) => setForm(prev => ({ ...prev, upiId: v }))}
                                placeholder="e.g. name@okaxis"
                            />
                        </View>

                        <TouchableOpacity
                            style={styles.saveButton}
                            onPress={handleSave}
                            disabled={updateMutation.isPending}
                        >
                            {updateMutation.isPending ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <Text style={styles.saveButtonText}>Save Details</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F8FAFC" },
    header: { flexDirection: "row", alignItems: "center", padding: 20, backgroundColor: "#FFF", borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
    backButton: { marginRight: 15 },
    headerTitle: { fontSize: 20, fontWeight: "800", color: "#1E293B" },
    scrollContent: { padding: 20 },
    form: { gap: 20 },
    inputGroup: { gap: 8 },
    label: { fontSize: 14, fontWeight: "700", color: "#475569", marginLeft: 4 },
    input: {
        height: 56, backgroundColor: "#FFF", borderRadius: 16, paddingHorizontal: 18, fontSize: 15, color: "#1E293B",
        borderWidth: 1, borderColor: "#E2E8F0"
    },
    saveButton: {
        backgroundColor: "#2D935C", height: 56, borderRadius: 28, justifyContent: "center", alignItems: "center", marginTop: 20,
        shadowColor: "#2D935C", shadowOpacity: 0.3, shadowRadius: 10, elevation: 5
    },
    saveButtonText: { color: "#FFF", fontSize: 16, fontWeight: "800" }
});
