import { useState, useEffect, useRef } from "react";
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    ScrollView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, Image,
    Animated, Easing, Modal
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import { api } from "../../lib/api";
import { useAuthStore, PartnerRole } from "../../stores/auth";

const roleConfigs: Record<string, { label: string; fields: string[], docs: string[] }> = {
    doctor: { label: "Doctor", fields: ["name", "email", "gender", "specialization", "experience", "about", "workingHours", "serviceRadius", "homeConsultationFee", "onlineConsultationFee"], docs: ["Selfie", "Aadhar Card", "PAN Card", "Medical Degree Certificate", "MCI/State Registration"] },
    nurse: { label: "Nurse", fields: ["name", "email", "gender", "specialization", "experience", "about", "workingHours", "serviceRadius", "homeConsultationFee", "onlineConsultationFee"], docs: ["Selfie", "Aadhar Card", "PAN Card", "Nursing Certificate", "Registration Document"] },
    ambulance: { label: "Ambulance", fields: ["name", "email", "vehicleNumber", "vehicleType", "experience", "serviceRadius"], docs: ["Selfie", "Aadhar Card", "PAN Card", "Vehicle RC", "Commercial DL", "Fitness Certificate"] },
    rental: { label: "Medical Rental", fields: ["name", "email", "businessName", "gstNumber", "serviceRadius"], docs: ["Selfie", "Aadhar Card", "PAN Card", "Business License", "GST Registration", "Shop Certificate"] },
};

const fieldLabels: Record<string, string> = {
    name: "Full Name", email: "Email Address", gender: "Gender",
    specialization: "Specialization",
    experience: "Experience (Years)", about: "Bio / About You",
    workingHours: "Working Hours (e.g. 09:00 - 18:00)",
    serviceRadius: "Service Radius (in km)",
    homeConsultationFee: "Home Consultancy Fee (₹)",
    onlineConsultationFee: "Online Consultancy Fee (₹)",
    vehicleNumber: "Vehicle Number", vehicleType: "Vehicle Type (BLS/ALS)",
    businessName: "Business Name", gstNumber: "GST Number",
};

const SPECIALIZATIONS = [
    "Cardiologist", "General Physician", "Neurologist", "Pediatrician",
    "Dermatologist", "Orthopedic", "Gynecologist", "Psychiatrist",
    "Dentist", "Ophthalmologist", "ENT Specialist", "General Surgeon",
    "Urologist", "Oncologist", "Radiologist", "Gastroenterologist"
].sort();

const GENDERS = ["Male", "Female", "Other"];

// Map role name to valid ObjectId approximations (In a real app, these would be fetched from /api/role)
const ROLE_IDS: Record<string, string> = {
    doctor: "692c582d17fa4521fcd5a940", // Doctor
    nurse: "6968b066a32d6eb67e8b7c74", // Nursing
    ambulance: "699946a786e3fd517d046316", // Ambulance
    rental: "699946a786e3fd517d04631a", // Rental
};

export default function RegisterScreen() {
    const router = useRouter();
    const { role, token } = useLocalSearchParams<{ role: string, token: string }>();
    const { setAuth } = useAuthStore();
    const config = roleConfigs[role ?? "doctor"];

    const [step, setStep] = useState(1);
    const [form, setForm] = useState<Record<string, any>>({});
    const [documents, setDocuments] = useState<{ type: string; url: string; uploading?: boolean }[]>([]);
    const [loading, setLoading] = useState(false);

    // Dropdown states
    const [showGenderDropdown, setShowGenderDropdown] = useState(false);
    const [showSpecDropdown, setShowSpecDropdown] = useState(false);
    const [specSearch, setSpecSearch] = useState("");

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
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.2, duration: 800, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
                ])
            ).start();

            let timer: any;
            const runSequence = (index: number) => {
                if (index >= phrases.length) return;
                setPhraseIndex(index);
                Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
                timer = setTimeout(() => {
                    Animated.timing(fadeAnim, { toValue: 0, duration: 600, useNativeDriver: true }).start(() => {
                        runSequence(index + 1);
                    });
                }, 1200);
            };
            runSequence(0);
            return () => clearTimeout(timer);
        }
    }, [showThinking]);

    const filteredSpecs = SPECIALIZATIONS.filter(s =>
        s.toLowerCase().includes(specSearch.toLowerCase())
    );

    useEffect(() => {
        if (!token) {
            Alert.alert("Authentication Required", "Please verify your mobile number first.", [
                { text: "Go to Login", onPress: () => router.replace({ pathname: "/(auth)/login", params: { role } }) }
            ]);
        } else {
            // Save token to AsyncStorage to persist semi-auth state through refreshes
            AsyncStorage.setItem("partner_token", token);
        }
    }, [token]);

    const handlePickDocument = async (docType: string) => {
        if (!token) {
            Alert.alert("Session Expired", "Please login again to continue document upload.");
            router.replace({ pathname: "/(auth)/login", params: { role } });
            return;
        }

        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ["image/*", "application/pdf"],
                copyToCacheDirectory: true,
            });

            if (!result.canceled) {
                const file = result.assets[0];

                // Set uploading state locally
                setDocuments(prev => [...prev.filter(d => d.type !== docType), { type: docType, url: "", uploading: true }]);

                const formData = new FormData();
                formData.append('document', {
                    uri: Platform.OS === 'ios' ? file.uri.replace('file://', '') : file.uri,
                    name: file.name,
                    type: file.mimeType || 'image/jpeg',
                } as any);

                const res = await api.post("/doctor/auth/upload-document", formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        Authorization: `Bearer ${token}`
                    }
                });

                setDocuments(prev => [
                    ...prev.filter(d => d.type !== docType),
                    { type: docType, url: res.data.data.url, uploading: false }
                ]);
            }
        } catch (err) {
            Alert.alert("Upload Failed", "Could not upload document. Please try again.");
            setDocuments(prev => prev.filter(d => d.type !== docType));
        }
    };

    const handleNextStep = () => {
        const missing = config.fields.find(f => !form[f]);
        if (missing) {
            Alert.alert("Missing Info", `Please provide your ${fieldLabels[missing]}`);
            return;
        }
        setStep(2);
    };

    const handleRegister = async () => {
        // Check if all required docs are uploaded
        const missingDoc = config.docs.find(doc => !documents.find(d => d.type === doc && d.url));
        if (missingDoc) {
            Alert.alert("Required Documents", `Please upload your ${missingDoc}`);
            return;
        }

        setShowThinking(true);
        try {
            const payload = {
                ...form,
                gender: form.gender || "Other",
                startExperience: new Date(new Date().getFullYear() - (Number(form.experience) || 0), 0, 1).toISOString(),
                specialization: typeof form.specialization === 'string' ? form.specialization.split(',').map((s: string) => s.trim()) : [],
                about: form.about || "Professional healthcare provider",
                workingHours: form.workingHours || "09:00 - 17:00",
                serviceRadius: Number(form.serviceRadius) || 0,
                homeConsultationFee: Number(form.homeConsultationFee),
                onlineConsultationFee: Number(form.onlineConsultationFee),
                consultationFee: Number(form.homeConsultationFee), // Compatibility
                roleId: ROLE_IDS[role ?? "doctor"] || ROLE_IDS.doctor,
                documents: documents.map(d => ({ type: d.type, url: d.url })),
                status: "Pending",
                isRegistered: false,
            };

            const [res] = await Promise.all([
                api.put("/doctor/auth/register", payload, {
                    headers: { Authorization: `Bearer ${token}` }
                }),
                new Promise(resolve => setTimeout(resolve, 4500))
            ]);

            const staff = res.data.data;
            await setAuth(token!, { ...staff, role: role as PartnerRole });
            router.replace("/(tabs)/home");

        } catch (err: any) {
            setShowThinking(false);
            Alert.alert("Registration Failed", err?.response?.data?.message || "Something went wrong.");
        }
    };

    const update = (key: string, val: any) => setForm(prev => ({ ...prev, [key]: val }));

    return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <LinearGradient colors={["#C8E6F9", "#EBF5FB", "#FFFFFF"]} style={StyleSheet.absoluteFill} />

            <ScrollView contentContainerStyle={{ padding: 28, paddingTop: 60, paddingBottom: 100 }}>
                <TouchableOpacity onPress={() => step === 1 ? router.back() : setStep(1)} style={{ marginBottom: 20 }}>
                    <Text style={styles.back}>← {step === 1 ? "Back" : "Step 1"}</Text>
                </TouchableOpacity>

                <Text style={styles.logo}>
                    <Text style={{ color: "#1A7FD4" }}>A1</Text>
                    <Text style={{ color: "#27AE60" }}>Care</Text>
                    <Text style={{ color: "#1A7FD4" }}> 24/7</Text>
                </Text>

                <Text style={styles.heading}>{step === 1 ? "Complete Your Profile" : "Upload Documents"}</Text>
                <Text style={styles.sub}>
                    {step === 1 ? `Tell us more about your ${config.label} services` : "Add Aadhar, PAN and professional certificates"}
                </Text>

                {step === 1 ? (
                    <View style={{ gap: 16, marginTop: 8 }}>
                        {config.fields.map((field) => (
                            <View key={field} style={[styles.inputGroup, (field === 'gender' || field === 'specialization') && { zIndex: field === 'gender' ? 2000 : 1000 }]}>
                                <Text style={styles.label}>{fieldLabels[field]}</Text>

                                {field === "gender" ? (
                                    <View>
                                        <TouchableOpacity
                                            activeOpacity={0.7}
                                            onPress={() => setShowGenderDropdown(!showGenderDropdown)}
                                            style={[styles.input, { justifyContent: 'center' }]}
                                        >
                                            <Text style={{ color: form.gender ? '#0D2E4D' : '#9CB3C4' }}>
                                                {form.gender || "Select Gender"}
                                            </Text>
                                        </TouchableOpacity>
                                        {showGenderDropdown && (
                                            <View style={styles.dropdown}>
                                                {GENDERS.map(g => (
                                                    <TouchableOpacity key={g} style={styles.dropdownItem} onPress={() => {
                                                        update('gender', g);
                                                        setShowGenderDropdown(false);
                                                    }}>
                                                        <Text style={styles.dropdownText}>{g}</Text>
                                                    </TouchableOpacity>
                                                ))}
                                            </View>
                                        )}
                                    </View>
                                ) : field === "specialization" ? (
                                    <View>
                                        <TouchableOpacity
                                            activeOpacity={0.7}
                                            onPress={() => setShowSpecDropdown(!showSpecDropdown)}
                                            style={[styles.input, { justifyContent: 'center' }]}
                                        >
                                            <Text style={{ color: form.specialization ? '#0D2E4D' : '#9CB3C4' }}>
                                                {form.specialization || "Select Specialization"}
                                            </Text>
                                        </TouchableOpacity>
                                        {showSpecDropdown && (
                                            <View style={styles.dropdown}>
                                                <TextInput
                                                    style={styles.searchBar}
                                                    placeholder="Search..."
                                                    value={specSearch}
                                                    onChangeText={setSpecSearch}
                                                />
                                                <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                                                    {filteredSpecs.map(s => (
                                                        <TouchableOpacity key={s} style={styles.dropdownItem} onPress={() => {
                                                            update('specialization', s);
                                                            setShowSpecDropdown(false);
                                                            setSpecSearch("");
                                                        }}>
                                                            <Text style={styles.dropdownText}>{s}</Text>
                                                        </TouchableOpacity>
                                                    ))}
                                                </ScrollView>
                                            </View>
                                        )}
                                    </View>
                                ) : (
                                    <TextInput
                                        style={[styles.input, field === "about" && { height: 100, textAlignVertical: "top", paddingTop: 12 }]}
                                        placeholder={fieldLabels[field]}
                                        placeholderTextColor="#9CB3C4"
                                        keyboardType={field.toLowerCase().includes("fee") || field === "experience" ? "numeric" : "default"}
                                        multiline={field === "about"}
                                        value={form[field] ?? ""}
                                        onChangeText={(v) => update(field, v)}
                                    />
                                )}
                            </View>
                        ))}

                        <TouchableOpacity onPress={handleNextStep} activeOpacity={0.85} style={{ marginTop: 20 }}>
                            <LinearGradient
                                colors={["#1A7FD4", "#0D5FA0"]}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                style={styles.cta}
                            >
                                <Text style={styles.ctaText}>Next: Upload Documents</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={{ gap: 16, marginTop: 8 }}>
                        <View style={{ gap: 12 }}>
                            {config.docs.map((doc) => {
                                const uploaded = documents.find(d => d.type === doc);
                                const isImage = uploaded?.url && (uploaded.url.match(/\.(jpg|jpeg|png|webp|avif|gif)$/i) || uploaded.url.startsWith('data:image'));

                                return (
                                    <TouchableOpacity
                                        key={doc}
                                        onPress={() => handlePickDocument(doc)}
                                        style={[styles.docUpload, uploaded?.url && styles.docSuccess]}
                                    >
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.docLabel, uploaded?.url && { color: "#27AE60" }]}>{doc}</Text>
                                            <Text style={styles.docSub}>
                                                {uploaded?.uploading ? "Uploading..." : uploaded?.url ? "Uploaded Successfully ✓" : `Upload ${doc} (PDF/Image)`}
                                            </Text>
                                        </View>
                                        {uploaded?.uploading ? (
                                            <ActivityIndicator size="small" color="#1A7FD4" />
                                        ) : uploaded?.url ? (
                                            isImage ? (
                                                <Image source={{ uri: uploaded.url }} style={styles.miniPreview} />
                                            ) : (
                                                <Text style={{ fontSize: 20 }}>✅</Text>
                                            )
                                        ) : (
                                            <Text style={{ fontSize: 20 }}>📄</Text>
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* Document Previews at the end */}
                        {documents.some(d => d.url) && (
                            <View style={{ marginTop: 10 }}>
                                <Text style={[styles.label, { marginBottom: 12, marginLeft: 4 }]}>Document Previews</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 4, gap: 12 }}>
                                    {documents.filter(d => d.url).map((doc, idx) => {
                                        const isImg = doc.url.match(/\.(jpg|jpeg|png|webp|avif|gif)$/i) || doc.url.startsWith('data:image');
                                        return (
                                            <View key={idx} style={styles.previewCard}>
                                                {isImg ? (
                                                    <Image source={{ uri: doc.url }} style={styles.fullPreview} resizeMode="cover" />
                                                ) : (
                                                    <View style={styles.pdfPlaceholder}>
                                                        <Text style={{ fontSize: 32 }}>📄</Text>
                                                        <Text style={styles.pdfText}>PDF FILE</Text>
                                                    </View>
                                                )}
                                                <View style={styles.previewType}>
                                                    <Text style={styles.previewTypeText} numberOfLines={1}>{doc.type}</Text>
                                                </View>
                                            </View>
                                        );
                                    })}
                                </ScrollView>
                            </View>
                        )}

                        <TouchableOpacity onPress={handleRegister} activeOpacity={0.85} style={{ marginTop: 20 }}>
                            <LinearGradient
                                colors={["#1A7FD4", "#0D5FA0"]}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                style={styles.cta}
                            >
                                <Text style={styles.ctaText}>Submit for Verification</Text>
                            </LinearGradient>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => setStep(1)} style={{ alignItems: 'center', marginTop: 10 }}>
                            <Text style={{ color: '#4A6E8A', fontWeight: '600' }}>Back to Step 1</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <View style={styles.disclaimer}>
                    <Text style={styles.disclaimerText}>
                        Your data is secured. By registering, you agree to our <Text onPress={() => router.push('/terms')} style={{ color: "#1A7FD4", fontWeight: "700" }}>Terms</Text> and <Text onPress={() => router.push('/privacy')} style={{ color: "#1A7FD4", fontWeight: "700" }}>Privacy Policy</Text>.
                    </Text>
                </View>
            </ScrollView>

            {/* Premium Thinking Overlay */}
            {showThinking && (
                <Modal transparent visible={showThinking} animationType="fade">
                    <View style={styles.thinkingOverlay}>
                        <LinearGradient colors={["rgba(255,255,255,0.98)", "#FFFFFF"]} style={StyleSheet.absoluteFill} />
                        <View style={styles.thinkingContent}>
                            <Animated.View style={[styles.aiGlow, { transform: [{ scale: pulseAnim }] }]}>
                                <LinearGradient colors={["#1A7FD4", "#4FACFE"]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                            </Animated.View>
                            <Animated.View style={{ opacity: fadeAnim, alignItems: 'center' }}>
                                <Text style={styles.thinkingText}>{phrases[phraseIndex]}</Text>
                                <View style={styles.dotContainer}>
                                    {[0, 1, 2].map(i => <View key={i} style={styles.typingDot} />)}
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
    inputGroup: { gap: 8, position: 'relative' },
    label: { fontSize: 14, fontWeight: "800", color: "#0D2E4D", marginLeft: 4 },
    input: {
        height: 52, backgroundColor: "#FFFFFF", borderRadius: 16,
        paddingHorizontal: 18, fontSize: 15, color: "#0D2E4D",
        shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
        borderWidth: 1.5, borderColor: "#D8EAF5",
    },
    dropdown: {
        position: 'absolute', top: 80, left: 0, right: 0,
        backgroundColor: "#FFFFFF", borderRadius: 16,
        borderWidth: 1.5, borderColor: "#D8EAF5", overflow: "hidden",
        shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 10, elevation: 5,
        zIndex: 5000,
    },
    searchBar: {
        height: 44, borderBottomWidth: 1, borderBottomColor: "#EBF5FB",
        paddingHorizontal: 16, fontSize: 14, color: "#0D2E4D",
        backgroundColor: '#F8FBFE',
    },
    dropdownItem: {
        padding: 16, borderBottomWidth: 1, borderBottomColor: "#F5F9FC",
    },
    dropdownText: { fontSize: 14, color: "#4A6E8A" },
    docUpload: {
        flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 16,
        backgroundColor: "#FFFFFF", borderWidth: 1.5, borderColor: "#D8EAF5", borderStyle: "dashed",
    },
    docSuccess: { borderColor: "#27AE60", borderStyle: "solid", backgroundColor: "#E8F8EF" },
    docLabel: { fontSize: 14, fontWeight: "700", color: "#4A6E8A" },
    docSub: { fontSize: 11, color: "#9CB3C4", marginTop: 2 },
    cta: {
        height: 58, borderRadius: 29, alignItems: "center", justifyContent: "center",
        shadowColor: "#1A7FD4", shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
    },
    ctaText: { fontSize: 17, fontWeight: "800", color: "#fff" },
    disclaimer: {
        backgroundColor: "#EBF5FB", borderRadius: 12, padding: 16,
        borderWidth: 1, borderColor: "#D0E8F5", marginTop: 12
    },
    disclaimerText: { fontSize: 12, color: "#6B8A9E", textAlign: "center", lineHeight: 18 },
    miniPreview: { width: 42, height: 42, borderRadius: 8, borderWidth: 1, borderColor: '#D8EAF5' },
    previewCard: { width: 120, backgroundColor: '#FFFFFF', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#D8EAF5', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
    fullPreview: { width: '100%', height: 80 },
    pdfPlaceholder: { width: '100%', height: 80, backgroundColor: '#F5F9FC', alignItems: 'center', justifyContent: 'center' },
    pdfText: { fontSize: 8, fontWeight: '900', color: '#1A7FD4', marginTop: 2 },
    previewType: { paddingHorizontal: 8, paddingVertical: 6, backgroundColor: '#FFFFFF' },
    previewTypeText: { fontSize: 9, fontWeight: '700', color: '#4A6E8A', textAlign: 'center' },

    // Thinking Overlay Styles
    thinkingOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    thinkingContent: { alignItems: 'center', gap: 40 },
    aiGlow: {
        width: 80, height: 80, borderRadius: 40, elevation: 20,
        shadowColor: '#1A7FD4', shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6, shadowRadius: 20, overflow: 'hidden',
    },
    thinkingText: { fontSize: 20, fontWeight: '700', color: '#0D2E4D', textAlign: 'center', letterSpacing: -0.5 },
    dotContainer: { flexDirection: 'row', gap: 6, marginTop: 12 },
    typingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#1A7FD4', opacity: 0.4 },
});
