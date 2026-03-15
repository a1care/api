import React, { useState, useEffect } from "react";
import {
    View, Text, StyleSheet, ScrollView, TextInput,
    TouchableOpacity, ActivityIndicator, KeyboardAvoidingView,
    Platform, Image
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../lib/api";
import { useAuthStore } from "../stores/auth";
import { Toast } from "../components/CustomToast";

const SPECIALIZATIONS = [
    "Cardiologist", "General Physician", "Neurologist", "Pediatrician",
    "Dermatologist", "Orthopedic", "Gynecologist", "Psychiatrist",
    "Dentist", "Ophthalmologist", "ENT Specialist", "General Surgeon",
    "Urologist", "Oncologist", "Radiologist", "Gastroenterologist"
].sort();

export default function ProfileEditScreen() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { user, setUser } = useAuthStore() as any;

    const [formData, setFormData] = useState({
        name: "",
        about: "",
        gender: "Male",
        specialization: [] as string[],
        workingHours: "",
        serviceRadius: "",
        profileImage: "",
    });

    const [previewImage, setPreviewImage] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    const [showSpecDropdown, setShowSpecDropdown] = useState(false);
    const [specSearch, setSpecSearch] = useState("");

    const filteredSpecs = SPECIALIZATIONS.filter(s =>
        s.toLowerCase().includes(specSearch.toLowerCase())
    );

    const { data: staffData, isLoading } = useQuery({
        queryKey: ["profileDetails"],
        queryFn: async () => {
            const res = await api.get("/doctor/auth/details");
            return res.data.data;
        }
    });

    useEffect(() => {
        if (staffData) {
            console.log("DEBUG: API staffData arrived:", { hasImage: !!staffData.profileImage });
            const initialImage = staffData.profileImage || "";
            setFormData({
                name: staffData.name || "",
                about: staffData.about || "",
                gender: staffData.gender || "Male",
                specialization: Array.isArray(staffData.specialization) ? staffData.specialization : [],
                workingHours: staffData.workingHours || "",
                serviceRadius: staffData.serviceRadius?.toString() || "",
                profileImage: initialImage,
            });
            setPreviewImage(initialImage);
        }
    }, [staffData]);

    const handlePickImage = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Toast.show({ type: "error", text1: "Permission Denied", text2: "Need gallery access." });
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.6,
            });

            if (!result.canceled) {
                const asset = result.assets[0];
                setPreviewImage(asset.uri);
                setIsUploading(true);

                // Use standard fetch instead of Axios for FormData to avoid "Network Error"
                const formData = new FormData();
                const uri = asset.uri;
                const fileName = uri.split('/').pop() || 'profile.jpg';
                const match = /\.(\w+)$/.exec(fileName);
                const type = match ? `image/${match[1]}` : `image/jpeg`;

                formData.append('document', {
                    uri: uri,
                    name: fileName,
                    type: type,
                } as any);

                const token = await AsyncStorage.getItem("partner_token");
                const baseUrl = api.defaults.baseURL;

                console.log("DEBUG: Starting fetch upload to:", `${baseUrl}/doctor/auth/upload-document`);

                const response = await fetch(`${baseUrl}/doctor/auth/upload-document`, {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'Accept': 'application/json',
                        'Authorization': `Bearer ${token}`,
                        // Content-Type is NOT set manually; fetch handles boundary automatically
                    },
                });

                const resData = await response.json();
                console.log("DEBUG: Fetch upload response:", resData);

                if (resData.success && resData.data?.url) {
                    setFormData(prev => ({ ...prev, profileImage: resData.data.url }));
                    setPreviewImage(resData.data.url);
                    Toast.show({ type: "success", text1: "Image Uploaded", text2: "Now click Save Changes." });
                } else {
                    throw new Error(resData.message || "Upload failed");
                }
            }
        } catch (err) {
            console.error("DEBUG: Upload error:", err);
            Toast.show({
                type: "error",
                text1: "Upload Failed",
                text2: "Network issue during photo upload. Please try again."
            });
            // Revert preview on failure
            setPreviewImage(formData.profileImage);
        } finally {
            setIsUploading(false);
        }
    };

    const updateProfileMutation = useMutation({
        mutationFn: async (updatedData: any) => {
            return api.put("/doctor/auth/register", updatedData);
        },
        onSuccess: (res) => {
            const updatedUser = { ...user, ...res.data.data };
            queryClient.invalidateQueries({ queryKey: ["profileDetails"] });
            queryClient.invalidateQueries({ queryKey: ["staffDetails"] });
            setUser(updatedUser);
            Toast.show({ type: "success", text1: "Profile Updated", text2: "Saved successfully." });
            setTimeout(() => router.back(), 500);
        },
        onError: (err: any) => {
            console.error("DEBUG: Register update error:", err?.response?.data || err);
            Toast.show({
                type: "error",
                text1: "Update Failed",
                text2: "Check your internet and try again."
            });
        }
    });

    const handleSave = () => {
        if (!formData.name.trim()) {
            Toast.show({ type: "error", text1: "Name Required", text2: "Please enter your name" });
            return;
        }

        if (isUploading) {
            Toast.show({ type: "info", text1: "Wait", text2: "Still uploading your photo..." });
            return;
        }

        console.log("DEBUG: Final Save Payload:", JSON.stringify(formData, null, 2));
        const finalData = { ...formData, serviceRadius: Number(formData.serviceRadius) || 0 };
        updateProfileMutation.mutate(finalData);
    };

    const toggleSpecialization = (spec: string) => {
        setFormData(prev => {
            const current = prev.specialization;
            if (current.includes(spec)) {
                return { ...prev, specialization: current.filter(s => s !== spec) };
            } else {
                return { ...prev, specialization: [...current, spec] };
            }
        });
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2D935C" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color="#1E293B" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Edit Profile</Text>
                    <View style={{ width: 40 }} />
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

                    <View style={styles.avatarSection}>
                        <TouchableOpacity onPress={handlePickImage} activeOpacity={0.8} style={styles.avatarContainer} disabled={isUploading}>
                            {previewImage ? (
                                <Image
                                    key={previewImage}
                                    source={{ uri: previewImage }}
                                    style={styles.avatar}
                                />
                            ) : (
                                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                                    <Ionicons name="person" size={40} color="#94A3B8" />
                                </View>
                            )}
                            <View style={styles.editBadge}>
                                {isUploading ? (
                                    <ActivityIndicator size="small" color="#FFF" />
                                ) : (
                                    <Ionicons name="camera" size={18} color="#FFF" />
                                )}
                            </View>
                        </TouchableOpacity>
                        <Text style={styles.avatarLabel}>{isUploading ? "Uploading..." : "Tap to change photo"}</Text>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Full Name</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.name}
                            onChangeText={(text) => setFormData({ ...formData, name: text })}
                            placeholder="Enter your name"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Professional Bio (About)</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            value={formData.about}
                            onChangeText={(text) => setFormData({ ...formData, about: text })}
                            placeholder="Tell patients about your expertise..."
                            multiline
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Gender</Text>
                        <View style={styles.genderRow}>
                            {["Male", "Female", "Other"].map((g) => (
                                <TouchableOpacity key={g}
                                    style={[styles.genderBtn, formData.gender === g && styles.genderBtnActive]}
                                    onPress={() => setFormData({ ...formData, gender: g as any })}
                                >
                                    <Text style={[styles.genderText, formData.gender === g && styles.genderTextActive]}>{g}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <View style={[styles.inputGroup, { zIndex: 1000 }]}>
                        <Text style={styles.label}>Specializations</Text>
                        <TouchableOpacity onPress={() => setShowSpecDropdown(!showSpecDropdown)} style={[styles.input, styles.dropdownTrigger]}>
                            <Text style={styles.dropdownValue}>
                                {formData.specialization.length > 0 ? formData.specialization.join(", ") : "Select"}
                            </Text>
                            <Ionicons name={showSpecDropdown ? "chevron-up" : "chevron-down"} size={20} color="#64748B" />
                        </TouchableOpacity>

                        {showSpecDropdown && (
                            <View style={styles.dropdown}>
                                <TextInput style={styles.searchBar} placeholder="Search..." value={specSearch} onChangeText={setSpecSearch} />
                                <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                                    {filteredSpecs.map(s => {
                                        const selected = formData.specialization.includes(s);
                                        return (
                                            <TouchableOpacity key={s} style={[styles.dropdownItem, selected && styles.dropdownItemSelected]} onPress={() => toggleSpecialization(s)}>
                                                <Text style={[styles.dropdownText, selected && styles.dropdownTextSelected]}>{s}</Text>
                                                {selected && <Ionicons name="checkmark-circle" size={18} color="#2D935C" />}
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>
                                <TouchableOpacity style={styles.closeDropdownBtn} onPress={() => setShowSpecDropdown(false)}><Text style={styles.closeDropdownText}>Done</Text></TouchableOpacity>
                            </View>
                        )}
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Working Hours</Text>
                        <TextInput style={styles.input} value={formData.workingHours} onChangeText={(text) => setFormData({ ...formData, workingHours: text })} placeholder="e.g. 9:00 AM - 6:00 PM" />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Service Radius (in km)</Text>
                        <TextInput style={styles.input} value={formData.serviceRadius} onChangeText={(text) => setFormData({ ...formData, serviceRadius: text })} placeholder="e.g. 15" keyboardType="numeric" />
                    </View>

                    <TouchableOpacity
                        style={[styles.saveBtn, (updateProfileMutation.isPending || isUploading) && styles.saveBtnDisabled]}
                        onPress={handleSave}
                        disabled={updateProfileMutation.isPending || isUploading}
                    >
                        {updateProfileMutation.isPending ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#EBF1F5" },
    loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 15, backgroundColor: "#FFF", borderBottomWidth: 1, borderBottomColor: "#E2E8F0" },
    backBtn: { padding: 5 },
    headerTitle: { fontSize: 18, fontWeight: "800", color: "#1E293B" },
    scrollContent: { padding: 20, paddingBottom: 40 },
    avatarSection: { alignItems: "center", marginBottom: 30 },
    avatarContainer: { position: "relative" },
    avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: "#FFF" },
    avatarPlaceholder: { backgroundColor: "#F1F5F9", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "#E2E8F0" },
    editBadge: { position: "absolute", bottom: 0, right: 0, backgroundColor: "#2D935C", width: 32, height: 32, borderRadius: 16, justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: "#FFF", elevation: 3 },
    avatarLabel: { marginTop: 10, fontSize: 13, fontWeight: "700", color: "#64748B" },
    inputGroup: { marginBottom: 20, position: 'relative' },
    label: { fontSize: 14, fontWeight: "700", color: "#475569", marginBottom: 8 },
    input: { backgroundColor: "#FFF", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, color: "#1E293B", borderWidth: 1, borderColor: "#E2E8F0" },
    textArea: { height: 80, textAlignVertical: "top" },
    dropdownTrigger: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    dropdownValue: { fontSize: 15, color: "#1E293B", flex: 1 },
    dropdown: { position: 'absolute', top: 80, left: 0, right: 0, backgroundColor: "#FFF", borderRadius: 16, borderWidth: 1.5, borderColor: "#2D935C", zIndex: 5000, elevation: 5, overflow: 'hidden' },
    searchBar: { height: 50, paddingHorizontal: 15, borderBottomWidth: 1, borderBottomColor: "#EEE" },
    dropdownItem: { padding: 15, flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: "#F5F5F5" },
    dropdownItemSelected: { backgroundColor: '#F0FDF4' },
    dropdownText: { fontSize: 14, color: "#64748B" },
    dropdownTextSelected: { color: "#2D935C", fontWeight: "700" },
    closeDropdownBtn: { backgroundColor: '#2D935C', padding: 12, alignItems: 'center' },
    closeDropdownText: { color: '#FFF', fontWeight: '800' },
    genderRow: { flexDirection: "row", gap: 10 },
    genderBtn: { flex: 1, backgroundColor: "#FFF", paddingVertical: 12, borderRadius: 12, alignItems: "center", borderWidth: 1, borderColor: "#E2E8F0" },
    genderBtnActive: { backgroundColor: "#2D935C", borderColor: "#2D935C" },
    genderText: { fontSize: 14, fontWeight: "700", color: "#64748B" },
    genderTextActive: { color: "#FFF" },
    saveBtn: { backgroundColor: "#2D935C", borderRadius: 15, height: 56, justifyContent: "center", alignItems: "center", marginTop: 10 },
    saveBtnDisabled: { opacity: 0.7 },
    saveBtnText: { color: "#FFF", fontSize: 16, fontWeight: "800" }
});
