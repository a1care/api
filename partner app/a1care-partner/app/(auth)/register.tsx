import { useState, useEffect, useRef } from "react";
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    ScrollView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, Image,
    Animated, Easing, Modal, Dimensions
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { api } from "../../lib/api";
import { useAuthStore, PartnerRole } from "../../stores/auth";
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from "@expo/vector-icons";

const { width, height } = Dimensions.get("window");

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

const ROLE_IDS: Record<string, string> = {
    doctor: "692c582d17fa4521fcd5a940",
    nurse: "6968b066a32d6eb67e8b7c74",
    ambulance: "699946a786e3fd517d046316",
    rental: "699946a786e3fd517d04631a",
};

export default function RegisterScreen() {
    const router = useRouter();
    const { role, token } = useLocalSearchParams<{ role: string, token: string }>();
    const { setAuth } = useAuthStore();
    const config = roleConfigs[role ?? "doctor"];

    const [step, setStep] = useState(1);
    const [form, setForm] = useState<Record<string, any>>({
        gender: "Male",
        bankDetails: {
            accountHolderName: "",
            accountNumber: "",
            ifscCode: "",
            bankName: "",
        }
    });
    const [documents, setDocuments] = useState<{ type: string; url: string; uploading?: boolean }[]>([]);
    
    // UI Helpers
    const [showThinking, setShowThinking] = useState(false);
    const [phraseIndex, setPhraseIndex] = useState(0);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;

    const phrases = ["Syncing Profile", "Enciphering Documents", "Verifying Banking Details", "Securing Account"];

    useEffect(() => {
        if (showThinking) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.2, duration: 800, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
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
                }, 1500);
            };
            runSequence(0);
            return () => clearTimeout(timer);
        }
    }, [showThinking]);

    useEffect(() => {
        if (token) AsyncStorage.setItem("partner_token", token);
    }, [token]);

    const handlePickDocument = async (docType: string) => {
        const handleImage = async (camera: boolean) => {
            try {
                let result: any;
                if (camera) {
                    const { status } = await ImagePicker.requestCameraPermissionsAsync();
                    if (status !== 'granted') return Alert.alert("Permission", "Camera access needed.");
                    result = await ImagePicker.launchCameraAsync({
                        allowsEditing: true, aspect: [1, 1], quality: 0.7,
                        cameraType: ImagePicker.CameraType.front,
                    });
                } else {
                    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                    if (status !== 'granted') return Alert.alert("Permission", "Gallery access needed.");
                    result = await ImagePicker.launchImageLibraryAsync({
                        allowsEditing: true, aspect: [1, 1], quality: 0.7,
                    });
                }

                if (result.canceled) return;
                const asset = result.assets[0];
                await uploadFile(docType, {
                    uri: asset.uri,
                    name: `selfie_${Date.now()}.jpg`,
                    mimeType: 'image/jpeg'
                });
            } catch (err) {
                console.error("Image pick error", err);
            }
        };

        const handleDoc = async () => {
            try {
                const result = await DocumentPicker.getDocumentAsync({ type: ["image/*", "application/pdf"] });
                if (result.canceled) return;
                const asset = result.assets[0];
                await uploadFile(docType, {
                    uri: asset.uri,
                    name: asset.name,
                    mimeType: asset.mimeType || 'image/jpeg'
                });
            } catch (err) {
                console.error("Doc pick error", err);
            }
        };

        if (docType === "Selfie") {
            Alert.alert("Upload Selfie", "Choose a source", [
                { text: "Camera", onPress: () => handleImage(true) },
                { text: "Gallery", onPress: () => handleImage(false) },
                { text: "Cancel", style: "cancel" }
            ]);
        } else {
            handleDoc();
        }
    };

    const uploadFile = async (docType: string, file: any) => {
        try {
            setDocuments(prev => [...prev.filter(d => d.type !== docType), { type: docType, url: "", uploading: true }]);

            const formData = new FormData();
            // In React Native, FormData needs this specific structure
            formData.append('document', {
                uri: file.uri,
                name: file.name,
                type: file.mimeType,
            } as any);

            const res = await api.post("/doctor/auth/upload-document", formData, {
                headers: { 
                    'Content-Type': 'multipart/form-data', 
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/json'
                }
            });

            if (res.data?.success || res.data?.data?.url) {
                setDocuments(prev => [...prev.filter(d => d.type !== docType), { type: docType, url: res.data.data.url, uploading: false }]);
            } else {
                throw new Error("Invalid server response");
            }
        } catch (err: any) {
            console.error("Upload error details:", err?.response?.data || err.message);
            setDocuments(prev => prev.filter(d => d.type !== docType));
            Alert.alert("Upload Failed", "Could not upload document. Please try again.");
        }
    };

    const handleRegister = async () => {
        const { bankDetails } = form;
        if (!bankDetails.accountNumber || !bankDetails.ifscCode) {
            Alert.alert("Banking Required", "Please provide valid settlement details in Step 3.");
            setStep(3);
            return;
        }

        setShowThinking(true);
        try {
            const payload = {
                ...form,
                specialization: typeof form.specialization === 'string' ? form.specialization.split(',').map((s: string) => s.trim()) : [],
                roleId: ROLE_IDS[role ?? "doctor"] || ROLE_IDS.doctor,
                documents: documents.map(d => ({ type: d.type, url: d.url })),
                status: "Pending",
                isRegistered: false,
            };

            const [res] = await Promise.all([
                api.put("/doctor/auth/register", payload, { headers: { Authorization: `Bearer ${token}` } }),
                new Promise(resolve => setTimeout(resolve, 6000))
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
    const updateBank = (key: string, val: any) => setForm(prev => ({ ...prev, bankDetails: { ...prev.bankDetails, [key]: val } }));

    return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <LinearGradient colors={["#F8FAFC", "#FFFFFF"]} style={StyleSheet.absoluteFill} />

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.navBar}>
                    <TouchableOpacity onPress={() => step > 1 ? setStep(step - 1) : router.back()} style={styles.backBtn}>
                        <Ionicons name="chevron-back" size={24} color="#1E293B" />
                    </TouchableOpacity>
                    <View style={styles.progressContainer}>
                        <View style={[styles.progressIndicator, { width: `${(step / 3) * 100}%` }]} />
                    </View>
                    <Text style={styles.progressText}>{step}/3</Text>
                </View>

                {step === 1 && (
                    <View style={styles.stepWrapper}>
                        <Text style={styles.stepTitle}>Let's build your profile</Text>
                        <Text style={styles.stepSub}>This helps patients know you better</Text>
                        
                        <View style={styles.formGroup}>
                            {config.fields.map(f => {
                                const isName = f === "name";
                                const isNumber = ["workingHours", "serviceRadius", "homeConsultationFee", "onlineConsultationFee", "experience"].includes(f);
                                
                                return (
                                    <View key={f} style={styles.fieldItem}>
                                        <Text style={styles.fieldLabel}>
                                            {fieldLabels[f]} <Text style={styles.asterisk}>*</Text>
                                        </Text>
                                        <TextInput
                                            style={[styles.fieldInput, f === "about" && styles.fieldArea]}
                                            placeholder={fieldLabels[f]}
                                            placeholderTextColor="#94A3B8"
                                            value={form[f] ?? ""}
                                            onChangeText={v => {
                                                let filtered = v;
                                                if (isName) filtered = v.replace(/[^a-zA-Z\s]/g, "");
                                                if (isNumber) filtered = v.replace(/\D/g, "");
                                                update(f, filtered);
                                            }}
                                            multiline={f === "about"}
                                            keyboardType={isNumber ? "number-pad" : "default"}
                                        />
                                    </View>
                                );
                            })}
                        </View>
                        <TouchableOpacity onPress={() => setStep(2)} style={styles.mainActionBtn}>
                            <Text style={styles.mainActionText}>Next: ID Verification</Text>
                            <Ionicons name="arrow-forward" size={20} color="#FFF" />
                        </TouchableOpacity>
                    </View>
                )}

                {step === 2 && (
                    <View style={styles.stepWrapper}>
                        <Text style={styles.stepTitle}>Verification Docs</Text>
                        <Text style={styles.stepSub}>We need these to verify your professional license</Text>
                        
                        <View style={styles.docList}>
                            {config.docs.map(doc => {
                                const uploaded = documents.find(d => d.type === doc);
                                return (
                                    <TouchableOpacity key={doc} onPress={() => handlePickDocument(doc)} style={[styles.docItem, uploaded?.url && styles.docItemDone]}>
                                        <View style={[styles.docIcon, uploaded?.url && styles.docIconDone]}>
                                            <MaterialCommunityIcons name={uploaded?.url ? "check-circle" : "file-upload-outline"} size={24} color={uploaded?.url ? "#FFF" : "#64748B"} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.docLabelTitle}>{doc} <Text style={styles.asterisk}>*</Text></Text>
                                            <Text style={styles.docLabelSub}>{uploaded?.uploading ? "Uploading..." : uploaded?.url ? "Attachment saved" : "Recommended: PDF or Image"}</Text>
                                        </View>
                                        {uploaded?.uploading && <ActivityIndicator size="small" color="#2D935C" />}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                        <TouchableOpacity onPress={() => setStep(3)} style={styles.mainActionBtn}>
                            <Text style={styles.mainActionText}>Next: Bank Details</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {step === 3 && (
                    <View style={styles.stepWrapper}>
                        <Text style={styles.stepTitle}>Settlement Details</Text>
                        <Text style={styles.stepSub}>Where should we send your earnings?</Text>
                        
                        <View style={styles.bankPreview}>
                            <LinearGradient colors={["#334155", "#1E293B"]} style={styles.bankInner}>
                                <Text style={styles.bankCardType}>PARTNER SETTLEMENT CARD</Text>
                                <View style={{ marginTop: 24 }}>
                                    <Text style={styles.bankCardNum}>{form.bankDetails.accountNumber ? `•••• •••• •••• ${form.bankDetails.accountNumber.slice(-4)}` : "XXXX XXXX XXXX XXXX"}</Text>
                                    <Text style={styles.bankCardName}>{form.bankDetails.accountHolderName || "ACCOUNT HOLDER"}</Text>
                                </View>
                                <MaterialCommunityIcons name="chip" size={40} color="#CBD5E1" style={styles.bankChip} />
                            </LinearGradient>
                        </View>

                        <View style={styles.formGroup}>
                            <TextInput style={styles.fieldInput} placeholder="Account Number *" keyboardType="number-pad" value={form.bankDetails.accountNumber} onChangeText={v => updateBank('accountNumber', v.replace(/\D/g, ""))} />
                            <TextInput style={styles.fieldInput} placeholder="IFSC Code *" autoCapitalize="characters" value={form.bankDetails.ifscCode} onChangeText={v => updateBank('ifscCode', v)} />
                            <TextInput style={styles.fieldInput} placeholder="Bank Name *" value={form.bankDetails.bankName} onChangeText={v => updateBank('bankName', v)} />
                            <TextInput style={styles.fieldInput} placeholder="Account Holder Name *" value={form.bankDetails.accountHolderName} onChangeText={v => updateBank('accountHolderName', v.replace(/[^a-zA-Z\s]/g, ""))} />
                        </View>

                        <TouchableOpacity onPress={handleRegister} style={[styles.mainActionBtn, { backgroundColor: '#1E293B', marginTop: 24 }]}>
                            <Text style={styles.mainActionText}>Confirm & Finish</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>

            <Modal transparent visible={showThinking}>
                <View style={styles.aiOverlay}>
                    <LinearGradient colors={["rgba(255,255,255,0.95)", "#FFFFFF"]} style={StyleSheet.absoluteFill} />
                    <Animated.View style={[styles.aiPulse, { transform: [{ scale: pulseAnim }] }]}>
                        <LinearGradient colors={["#2D935C", "#10B981"]} style={StyleSheet.absoluteFill} />
                    </Animated.View>
                    <Animated.Text style={[styles.aiStatus, { opacity: fadeAnim }]}>{phrases[phraseIndex]}</Animated.Text>
                </View>
            </Modal>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    scrollContent: { padding: 24, paddingTop: 60, paddingBottom: 100 },
    navBar: { flexDirection: 'row', alignItems: 'center', marginBottom: 40, gap: 16 },
    backBtn: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
    progressContainer: { flex: 1, height: 6, backgroundColor: '#E2E8F0', borderRadius: 3, overflow: 'hidden' },
    progressIndicator: { height: '100%', backgroundColor: '#2D935C' },
    progressText: { fontSize: 13, fontWeight: '800', color: '#64748B' },
    stepWrapper: { flex: 1 },
    stepTitle: { fontSize: 32, fontWeight: '900', color: '#1E293B', letterSpacing: -1 },
    stepSub: { fontSize: 15, color: '#64748B', marginTop: 4, marginBottom: 32, fontWeight: '600' },
    formGroup: { gap: 16 },
    fieldItem: { gap: 8 },
    fieldLabel: { fontSize: 13, fontWeight: '800', color: '#475569', marginLeft: 4 },
    asterisk: { color: "#EF4444" },
    fieldInput: { height: 60, backgroundColor: '#FFF', borderRadius: 20, paddingHorizontal: 20, fontSize: 16, color: '#1E293B', borderWidth: 1.5, borderColor: '#F1F5F9', elevation: 2, shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 10 },
    fieldArea: { height: 120, textAlignVertical: 'top', paddingTop: 18 },
    mainActionBtn: { height: 64, backgroundColor: '#2D935C', borderRadius: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 12, elevation: 8, shadowColor: '#2D935C', shadowOpacity: 0.3, shadowRadius: 10 },
    mainActionText: { color: '#FFF', fontSize: 18, fontWeight: '800' },
    docList: { gap: 14 },
    docItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 18, borderRadius: 24, borderWidth: 1.5, borderColor: '#F1F5F9', gap: 16 },
    docItemDone: { borderColor: '#2D935C', backgroundColor: '#F0FDF4' },
    docIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' },
    docIconDone: { backgroundColor: '#2D935C' },
    docLabelTitle: { fontSize: 16, fontWeight: '800', color: '#1E293B' },
    docLabelSub: { fontSize: 12, color: '#94A3B8', marginTop: 2, fontWeight: '600' },
    bankPreview: { borderRadius: 32, overflow: 'hidden', marginBottom: 24, elevation: 15, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 15 },
    bankInner: { padding: 28, height: 180, justifyContent: 'space-between' },
    bankCardType: { fontSize: 12, fontWeight: '900', color: 'rgba(255,255,255,0.4)', letterSpacing: 2 },
    bankCardNum: { fontSize: 22, color: '#FFF', fontWeight: '800', letterSpacing: 1 },
    bankCardName: { fontSize: 14, color: 'rgba(255,255,255,0.6)', marginTop: 4, fontWeight: '700', textTransform: 'uppercase' },
    bankChip: { position: 'absolute', top: 20, right: 28 },
    aiOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    aiPulse: { width: 80, height: 80, borderRadius: 40, elevation: 20, shadowColor: '#2D935C', shadowRadius: 25, shadowOpacity: 0.4 },
    aiStatus: { marginTop: 32, fontSize: 22, fontWeight: '900', color: '#1E293B' }
});
