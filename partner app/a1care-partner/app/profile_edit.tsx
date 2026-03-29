import React, { useState, useEffect } from "react";
import {
    View, Text, StyleSheet, ScrollView, TextInput,
    TouchableOpacity, ActivityIndicator, KeyboardAvoidingView,
    Platform, Image, Dimensions, Modal
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

const { width, height } = Dimensions.get("window");

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

                const response = await fetch(`${baseUrl}/doctor/auth/upload-document`, {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'Accept': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                });

                const resData = await response.json();
                if ((resData.success || resData.statusCode === 200) && resData.data?.url) {
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
                    <Text style={styles.headerTitle}>Professional Profile</Text>
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
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={styles.label}>Full Name <Text style={styles.asterisk}>*</Text></Text>
                            <Text style={{ fontSize: 11, color: formData.name?.length > 45 ? '#E74C3C' : '#94A3B8', fontWeight: '600' }}>{formData.name?.length || 0}/50</Text>
                        </View>
                        <TextInput
                            style={styles.input}
                            value={formData.name}
                            onChangeText={(text) => {
                                const clean = text.replace(/[^a-zA-Z\s]/g, "");
                                if (clean.length <= 50) setFormData({ ...formData, name: clean });
                            }}
                            placeholder="Enter your name"
                            maxLength={50}
                            autoCapitalize="words"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={styles.label}>Professional Bio (About)</Text>
                            <Text style={{ fontSize: 11, color: (formData.about?.length || 0) > 230 ? '#E74C3C' : '#94A3B8', fontWeight: '600' }}>{formData.about?.length || 0}/255</Text>
                        </View>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            value={formData.about}
                            onChangeText={(text) => {
                                if (text.length <= 255) setFormData({ ...formData, about: text });
                            }}
                            placeholder="Tell patients about your expertise..."
                            maxLength={255}
                            multiline
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Gender <Text style={styles.asterisk}>*</Text></Text>
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

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Specializations <Text style={styles.asterisk}>*</Text></Text>
                        <View style={styles.specChipsContainer}>
                            {formData.specialization.map(s => (
                                <TouchableOpacity key={s} style={styles.specChip} onPress={() => toggleSpecialization(s)}>
                                    <Text style={styles.specChipText}>{s}</Text>
                                    <Ionicons name="close-circle" size={16} color="#FFF" />
                                </TouchableOpacity>
                            ))}
                            <TouchableOpacity onPress={() => setShowSpecDropdown(true)} style={styles.addSpecBtn}>
                                <Ionicons name="add-circle" size={22} color="#2D935C" />
                                <Text style={styles.addSpecText}>Add Specialization</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Working Hours <Text style={styles.asterisk}>*</Text></Text>
                        <TextInput 
                            style={styles.input} 
                            value={formData.workingHours} 
                            onChangeText={(text) => setFormData({ ...formData, workingHours: text.replace(/\D/g, "") })} 
                            placeholder="e.g. 0918" 
                            keyboardType="number-pad"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Service Radius (in km) <Text style={styles.asterisk}>*</Text></Text>
                        <TextInput 
                            style={styles.input} 
                            value={formData.serviceRadius} 
                            onChangeText={(text) => setFormData({ ...formData, serviceRadius: text.replace(/\D/g, "") })} 
                            placeholder="e.g. 15" 
                            keyboardType="number-pad" 
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.saveBtn, (updateProfileMutation.isPending || isUploading) && styles.saveBtnDisabled]}
                        onPress={handleSave}
                        disabled={updateProfileMutation.isPending || isUploading}
                    >
                        {updateProfileMutation.isPending ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
                    </TouchableOpacity>
                </ScrollView>

                <Modal visible={showSpecDropdown} transparent animationType="slide">
                    <View style={styles.dropdownOverlay}>
                        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setShowSpecDropdown(false)} />
                        <View style={styles.dropdownMenu}>
                            <View style={styles.dropdownHeader}>
                                <Text style={styles.dropdownTitle}>Select Specializations</Text>
                                <TouchableOpacity onPress={() => setShowSpecDropdown(false)}>
                                    <Ionicons name="close" size={24} color="#64748B" />
                                </TouchableOpacity>
                            </View>
                            <TextInput 
                                style={styles.searchBar} 
                                placeholder="Search specialization..." 
                                value={specSearch} 
                                onChangeText={setSpecSearch} 
                                placeholderTextColor="#94A3B8"
                            />
                            <ScrollView style={{ maxHeight: 400 }} keyboardShouldPersistTaps="handled">
                                {filteredSpecs.map(s => {
                                    const selected = formData.specialization.includes(s);
                                    return (
                                        <TouchableOpacity 
                                            key={s} 
                                            style={[styles.dropdownItem, selected && styles.dropdownItemSelected]} 
                                            onPress={() => toggleSpecialization(s)}
                                        >
                                            <Text style={[styles.dropdownText, selected && styles.dropdownTextSelected]}>{s}</Text>
                                            {selected ? (
                                                <Ionicons name="checkbox" size={20} color="#2D935C" />
                                            ) : (
                                                <Ionicons name="square-outline" size={20} color="#CBD5E1" />
                                            )}
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        </View>
                    </View>
                </Modal>
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
    scrollContent: { padding: 20, paddingBottom: 60 },
    avatarSection: { alignItems: "center", marginBottom: 30 },
    avatarContainer: { position: "relative" },
    avatar: { width: 110, height: 110, borderRadius: 55, borderWidth: 4, borderColor: "#FFF" },
    avatarPlaceholder: { backgroundColor: "#F1F5F9", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "#E2E8F0" },
    editBadge: { position: "absolute", bottom: 4, right: 4, backgroundColor: "#2D935C", width: 34, height: 34, borderRadius: 17, justifyContent: "center", alignItems: "center", borderWidth: 3, borderColor: "#FFF", elevation: 4 },
    avatarLabel: { marginTop: 12, fontSize: 13, fontWeight: "700", color: "#64748B" },
    inputGroup: { marginBottom: 24 },
    label: { fontSize: 14, fontWeight: "800", color: "#1E293B", marginBottom: 10, marginLeft: 2 },
    asterisk: { color: "#EF4444" },
    input: { backgroundColor: "#FFF", borderRadius: 16, paddingHorizontal: 18, paddingVertical: 14, fontSize: 16, color: "#1E293B", borderWidth: 1.5, borderColor: "#F1F5F9", elevation: 1, shadowColor: "#000", shadowOpacity: 0.02, shadowRadius: 5 },
    textArea: { height: 110, textAlignVertical: "top" },
    specChipsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
    specChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2D935C', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, gap: 6 },
    specChipText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
    addSpecBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1.5, borderColor: '#2D935C', borderStyle: 'dashed', gap: 6 },
    addSpecText: { color: '#2D935C', fontSize: 13, fontWeight: '700' },
    dropdownOverlay: { height: height, zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
    dropdownMenu: { backgroundColor: '#FFF', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40, maxHeight: '80%' },
    dropdownHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    dropdownTitle: { fontSize: 18, fontWeight: '900', color: '#1E293B' },
    searchBar: { height: 54, backgroundColor: '#F8FAFC', borderRadius: 16, paddingHorizontal: 18, fontSize: 15, marginBottom: 15, borderWidth: 1, borderColor: '#F1F5F9' },
    dropdownItem: { padding: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
    dropdownItemSelected: { backgroundColor: '#F0FDF4' },
    dropdownText: { fontSize: 15, color: '#475569', fontWeight: '600' },
    dropdownTextSelected: { color: '#2D935C', fontWeight: '800' },
    genderRow: { flexDirection: "row", gap: 12 },
    genderBtn: { flex: 1, backgroundColor: "#FFF", paddingVertical: 14, borderRadius: 16, alignItems: "center", borderWidth: 1.5, borderColor: "#F1F5F9" },
    genderBtnActive: { backgroundColor: "#2D935C", borderColor: "#2D935C" },
    genderText: { fontSize: 15, fontWeight: "700", color: "#64748B" },
    genderTextActive: { color: "#FFF" },
    saveBtn: { backgroundColor: "#2D935C", borderRadius: 20, height: 62, justifyContent: "center", alignItems: "center", marginTop: 10, shadowColor: "#2D935C", shadowOpacity: 0.25, shadowRadius: 15, elevation: 8 },
    saveBtnDisabled: { opacity: 0.6 },
    saveBtnText: { color: "#FFF", fontSize: 18, fontWeight: "800" }
});
