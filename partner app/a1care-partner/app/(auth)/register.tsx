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

const SPECIALIZATIONS = [
    "Cardiologist", "General Physician", "Neurologist", "Pediatrician",
    "Dermatologist", "Orthopedic", "Gynecologist", "Psychiatrist",
    "Dentist", "Ophthalmologist", "ENT Specialist", "General Surgeon",
    "Urologist", "Oncologist", "Radiologist", "Gastroenterologist"
].sort();

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
    const { setAuth, token: storedToken } = useAuthStore();
    const config = roleConfigs[role ?? "doctor"];
    const authToken = (token as string) || storedToken;

    const [step, setStep] = useState(1);
    const [form, setForm] = useState<Record<string, any>>({
        gender: "Male",
        specialization: [],
        bankDetails: {
            accountHolderName: "",
            accountNumber: "",
            ifscCode: "",
            bankName: "",
        }
    });
    const [documents, setDocuments] = useState<{ type: string; url: string; uploading?: boolean }[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [docErrors, setDocErrors] = useState<Record<string, string>>({});
    const [showSpecDropdown, setShowSpecDropdown] = useState(false);
    const [specSearch, setSpecSearch] = useState("");
    
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

    // restore draft
    useEffect(() => {
        (async () => {
            const savedForm = await AsyncStorage.getItem("partner_reg_form");
            const savedDocs = await AsyncStorage.getItem("partner_reg_docs");
            const savedStep = await AsyncStorage.getItem("partner_reg_step");
            if (savedForm) setForm(JSON.parse(savedForm));
            if (savedDocs) setDocuments(JSON.parse(savedDocs));
            if (savedStep) setStep(Number(savedStep));
        })();
    }, []);

    // persist draft
    useEffect(() => {
        AsyncStorage.setItem("partner_reg_form", JSON.stringify(form));
        AsyncStorage.setItem("partner_reg_step", String(step));
    }, [form, step]);

    useEffect(() => {
        AsyncStorage.setItem("partner_reg_docs", JSON.stringify(documents));
    }, [documents]);

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
        if (!authToken) {
            Alert.alert("Session Missing", "Please login again to upload documents.");
            router.replace("/(auth)/login");
            return;
        }

        try {
            setDocErrors(prev => ({ ...prev, [docType]: "" }));

            // size guard: 10 MB
            const maxBytes = 10 * 1024 * 1024;
            const size = file.size || file.fileSize;
            if (size && size > maxBytes) {
                setDocErrors(prev => ({ ...prev, [docType]: "File must be 10MB or less" }));
                Alert.alert("File Too Large", "Please upload a file up to 10 MB.");
                return;
            }

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
                    Authorization: `Bearer ${authToken}`,
                    Accept: 'application/json'
                }
            });

            if (res.data?.success || res.data?.data?.url) {
                setDocuments(prev => [...prev.filter(d => d.type !== docType), { type: docType, url: res.data.data.url, uploading: false }]);
                setDocErrors(prev => {
                    const c = { ...prev }; delete c[docType]; return c;
                });
            } else {
                throw new Error("Invalid server response");
            }
        } catch (err: any) {
            console.error("Upload error details:", err?.response?.data || err.message);
            setDocuments(prev => prev.filter(d => d.type !== docType));
            const msg = err?.response?.data?.message || "Could not upload document. Please try again.";
            setDocErrors(prev => ({ ...prev, [docType]: msg.includes("File Too Large") ? "File must be 10MB or less" : msg }));
            Alert.alert("Upload Failed", msg);
        }
    };

    const handleRegister = async () => {
        const { bankDetails } = form;

        if (!authToken) {
            Alert.alert("Session Missing", "Please login again to continue registration.");
            router.replace("/(auth)/login");
            return;
        }

        // Re-validate personal info & documents before submitting
        const stepOneOk = validateStepOne();
        const missingDocs = validateDocs();
        const bankOk = validateBank();
        if (!stepOneOk) {
            setStep(1);
            Alert.alert("Profile Incomplete", "Please fill all required fields.");
            return;
        }
        if (missingDocs.length > 0) {
            setStep(2);
            Alert.alert("Documents Required", `Please upload: ${missingDocs.join(", ")}`);
            return;
        }
        if (!bankOk) {
            setStep(3);
            Alert.alert("Bank Details", "Please correct highlighted bank fields.");
            return;
        }
        
        if (!bankDetails.accountHolderName || !bankDetails.accountNumber || !bankDetails.ifscCode || !bankDetails.bankName) {
            Alert.alert("Banking Required", "Please provide all settlement details in Step 3.");
            setStep(3);
            return;
        }

        if (bankDetails.accountHolderName.length < 3) {
            Alert.alert("Invalid Name", "Account holder name must be at least 3 characters.");
            setStep(3);
            return;
        }
        if (bankDetails.bankName.length < 3) {
            Alert.alert("Invalid Bank", "Bank name must be at least 3 characters.");
            setStep(3);
            return;
        }
        if (bankDetails.accountNumber.length < 9) {
            Alert.alert("Invalid Account", "Account number must be at least 9 characters.");
            setStep(3);
            return;
        }
        if (bankDetails.ifscCode.length !== 11) {
            Alert.alert("Invalid IFSC", "IFSC code must be exactly 11 characters.");
            setStep(3);
            return;
        }

        setShowThinking(true);
        try {
            // Only validate numeric fields that are actually required for the current role
            const homeFee = config.fields.includes("homeConsultationFee") ? Number(form.homeConsultationFee) : 0;
            const onlineFee = config.fields.includes("onlineConsultationFee") ? Number(form.onlineConsultationFee) : 0;
            const radius = config.fields.includes("serviceRadius") ? Number(form.serviceRadius) : 0;
            const exp = config.fields.includes("experience") ? Number(form.experience) : 0;

            const numericToValidate = [
                config.fields.includes("homeConsultationFee") ? homeFee : 0,
                config.fields.includes("onlineConsultationFee") ? onlineFee : 0,
                config.fields.includes("serviceRadius") ? radius : 0,
                config.fields.includes("experience") ? exp : 0,
            ].filter((_, idx) => {
                // keep only those that were actually part of the form
                return [
                    config.fields.includes("homeConsultationFee"),
                    config.fields.includes("onlineConsultationFee"),
                    config.fields.includes("serviceRadius"),
                    config.fields.includes("experience"),
                ][idx];
            });

            if (!numericToValidate.every(n => Number.isFinite(n) && n >= 0)) {
                setShowThinking(false);
                Alert.alert("Invalid Fees/Values", "Please enter valid numeric values for experience, service radius, and fees.");
                setStep(1);
                return;
            }

            const payload = {
                ...form,
                specialization: Array.isArray(form.specialization)
                    ? form.specialization
                    : typeof form.specialization === 'string'
                        ? form.specialization.split(',').map((s: string) => s.trim()).filter(Boolean)
                        : [],
                homeConsultationFee: homeFee,
                onlineConsultationFee: onlineFee,
                serviceRadius: radius,
                experience: exp,
                roleId: ROLE_IDS[role ?? "doctor"] || ROLE_IDS.doctor,
                documents: documents.map(d => ({ type: d.type, url: d.url })),
                status: "Pending",
                isRegistered: false,
            };

            const [res] = await Promise.all([
                api.put("/doctor/auth/register", payload, { headers: { Authorization: `Bearer ${authToken}` } }),
                new Promise(resolve => setTimeout(resolve, 6000))
            ]);

            const staff = res.data.data;
            await AsyncStorage.multiRemove(["partner_reg_form", "partner_reg_docs", "partner_reg_step"]);
            await setAuth(token!, { ...staff, role: role as PartnerRole });
            router.replace("/(tabs)/home");
        } catch (err: any) {
            setShowThinking(false);
            Alert.alert("Registration Failed", err?.response?.data?.message || "Something went wrong.");
        }
    };

    const update = (key: string, val: any) => setForm(prev => ({ ...prev, [key]: val }));
    const updateBank = (key: string, val: any) => setForm(prev => ({ ...prev, bankDetails: { ...prev.bankDetails, [key]: val } }));

    const validateStepOne = () => {
        const newErrors: Record<string, string> = {};
        config.fields.forEach(f => {
            const val = form[f];
            if (f === "specialization") {
                const arr = Array.isArray(val) ? val : typeof val === "string" ? val.split(",").map((s: string) => s.trim()).filter(Boolean) : [];
                if (arr.length === 0) newErrors[f] = "Required";
                return;
            }
            if (val === undefined || val === null || (typeof val === "string" && val.trim() === "")) {
                newErrors[f] = "Required";
            }
        });

        // numeric fields positive
        ["experience", "serviceRadius", "homeConsultationFee", "onlineConsultationFee"].forEach(f => {
            if (config.fields.includes(f) && (form[f] === undefined || form[f] === null || String(form[f]).trim() === "" || !Number.isFinite(Number(form[f])))) {
                newErrors[f] = "Required";
            }
        });

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const validateDocs = () => {
        const missing = config.docs.filter(d => !documents.find(doc => doc.type === d && doc.url));
        return missing;
    };

    const validateBank = () => {
        const b = form.bankDetails || {};
        const bankErrors: Record<string, string> = {};
        if (!b.accountNumber || !/^\d{9,20}$/.test(b.accountNumber)) bankErrors.accountNumber = "Enter 9-20 digits";
        if (!b.ifscCode || !/^[A-Za-z]{4}0[A-Z0-9]{6}$/i.test(b.ifscCode)) bankErrors.ifscCode = "Enter valid IFSC (e.g. HDFC0000123)";
        if (!b.bankName || b.bankName.trim().length < 3) bankErrors.bankName = "Bank name min 3 chars";
        if (!b.accountHolderName || b.accountHolderName.trim().length < 3) bankErrors.accountHolderName = "Name min 3 chars";
        setErrors(prev => ({ ...prev, ...bankErrors }));
        return Object.keys(bankErrors).length === 0;
    };

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
                                const isAbout = f === "about";
                                const isName = f === "name";
                                const isWorkingHours = f === "workingHours";
                                const isNumber = ["serviceRadius", "homeConsultationFee", "onlineConsultationFee", "experience"].includes(f);
                                
                                if (f === "specialization") {
                                    const filteredSpecs = SPECIALIZATIONS.filter(s => s.toLowerCase().includes(specSearch.toLowerCase()));
                                    const selectedSpecs: string[] = Array.isArray(form.specialization)
                                        ? form.specialization
                                        : typeof form.specialization === "string"
                                            ? form.specialization.split(",").map((s: string) => s.trim()).filter(Boolean)
                                            : [];
                                    return (
                                        <View key={f} style={styles.fieldItem}>
                                            <Text style={styles.fieldLabel}>
                                                {fieldLabels[f]} <Text style={styles.asterisk}>*</Text>
                                            </Text>
                                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                                                {selectedSpecs.map(s => (
                                                    <TouchableOpacity key={s} style={styles.specChip} onPress={() => {
                                                        setForm(prev => ({ ...prev, specialization: selectedSpecs.filter(x => x !== s) }));
                                                    }}>
                                                        <Text style={styles.specChipText}>{s}</Text>
                                                        <Ionicons name="close-circle" size={14} color="#FFF" />
                                                    </TouchableOpacity>
                                                ))}
                                                <TouchableOpacity style={styles.addSpecBtn} onPress={() => setShowSpecDropdown(true)}>
                                                    <Ionicons name="add-circle" size={18} color="#2D935C" />
                                                    <Text style={styles.addSpecText}>Add Specialization</Text>
                                                </TouchableOpacity>
                                            </View>
                                            {errors[f] && <Text style={styles.errorText}>{errors[f]}</Text>}

                                            <Modal transparent visible={showSpecDropdown} animationType="slide">
                                                <View style={styles.dropdownOverlay}>
                                                    <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setShowSpecDropdown(false)} />
                                                    <View style={styles.dropdownMenu}>
                                                        <View style={styles.dropdownHeader}>
                                                            <Text style={styles.dropdownTitle}>Select Specializations</Text>
                                                            <TouchableOpacity onPress={() => setShowSpecDropdown(false)}>
                                                                <Ionicons name="close" size={22} color="#64748B" />
                                                            </TouchableOpacity>
                                                        </View>
                                                        <TextInput
                                                            style={styles.searchBar}
                                                            placeholder="Search specialization..."
                                                            placeholderTextColor="#94A3B8"
                                                            value={specSearch}
                                                            onChangeText={setSpecSearch}
                                                        />
                                                        <ScrollView style={{ maxHeight: 360 }} keyboardShouldPersistTaps="handled">
                                                            {specSearch.trim().length > 0 && !filteredSpecs.some(s => s.toLowerCase() === specSearch.toLowerCase()) && (
                                                                <TouchableOpacity
                                                                    style={styles.customAddBtn}
                                                                    onPress={() => {
                                                                        const newSpec = specSearch.trim();
                                                                        if (!selectedSpecs.includes(newSpec)) {
                                                                            setForm(prev => ({ ...prev, specialization: [...selectedSpecs, newSpec] }));
                                                                        }
                                                                        setSpecSearch("");
                                                                    }}
                                                                >
                                                                    <Ionicons name="add-circle-outline" size={18} color="#2D935C" />
                                                                    <Text style={styles.customAddText}>Add "{specSearch.trim()}"</Text>
                                                                </TouchableOpacity>
                                                            )}

                                                            {filteredSpecs.map(s => {
                                                                const selected = selectedSpecs.includes(s);
                                                                return (
                                                                    <TouchableOpacity
                                                                        key={s}
                                                                        style={[styles.dropdownItem, selected && styles.dropdownItemSelected]}
                                                                        onPress={() => {
                                                                            if (selected) {
                                                                                setForm(prev => ({ ...prev, specialization: selectedSpecs.filter(x => x !== s) }));
                                                                            } else {
                                                                                setForm(prev => ({ ...prev, specialization: [...selectedSpecs, s] }));
                                                                            }
                                                                        }}
                                                                    >
                                                                        <Text style={[styles.dropdownText, selected && styles.dropdownTextSelected]}>{s}</Text>
                                                                        <Ionicons name={selected ? "checkbox" : "square-outline"} size={18} color={selected ? "#2D935C" : "#CBD5E1"} />
                                                                    </TouchableOpacity>
                                                                );
                                                            })}

                                                            {filteredSpecs.length === 0 && specSearch.trim().length === 0 && (
                                                                <View style={{ padding: 32, alignItems: 'center' }}>
                                                                    <Ionicons name="search-outline" size={44} color="#CBD5E1" />
                                                                    <Text style={{ marginTop: 10, color: '#94A3B8', fontWeight: '600' }}>Search to add specialization</Text>
                                                                </View>
                                                            )}
                                                        </ScrollView>
                                                    </View>
                                                </View>
                                            </Modal>
                                        </View>
                                    );
                                }
                                return (
                                    <View key={f} style={styles.fieldItem}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Text style={styles.fieldLabel}>
                                            {fieldLabels[f]} <Text style={styles.asterisk}>*</Text>
                                        </Text>
                                            {isName && <Text style={{ fontSize: 11, color: (form[f] ?? '').length > 45 ? '#E74C3C' : '#94A3B8', fontWeight: '600' }}>{(form[f] ?? '').length}/50</Text>}
                                            {isAbout && <Text style={{ fontSize: 11, color: (form[f] ?? '').length > 230 ? '#E74C3C' : '#94A3B8', fontWeight: '600' }}>{(form[f] ?? '').length}/255</Text>}
                                        </View>
                                            <TextInput
                                                style={[
                                                    styles.fieldInput,
                                                    f === "about" && styles.fieldArea,
                                                    errors[f] && { borderColor: '#EF4444' }
                                                ]}
                                                placeholder={fieldLabels[f]}
                                                placeholderTextColor="#000000"
                                                value={form[f] ?? ""}
                                                onChangeText={v => {
                                                    let filtered = v;
                                                    if (isName) filtered = v.replace(/[^a-zA-Z\s]/g, "").slice(0, 50);
                                                    if (isAbout) filtered = v.replace(/[^a-zA-Z0-9 .\-,]/g, "").slice(0, 150);
                                                    if (isWorkingHours) filtered = v.replace(/[^0-9: \-]/g, "").slice(0, 17);
                                                    if (isNumber) filtered = v.replace(/[^\d.]/g, "");
                                                    update(f, filtered);
                                                    if (errors[f]) setErrors(prev => {
                                                        const copy = { ...prev }; delete copy[f]; return copy;
                                                    });
                                                }}
                                                multiline={f === "about"}
                                                keyboardType={isNumber ? "number-pad" : "default"}
                                                maxLength={isName ? 50 : isAbout ? 150 : undefined}
                                                autoCapitalize={isName ? "words" : "none"}
                                            />
                                        {errors[f] && <Text style={styles.errorText}>{errors[f]}</Text>}
                                    </View>
                                );
                            })}
                        </View>
                        <TouchableOpacity onPress={() => {
                            const valid = validateStepOne();
                            if (valid) setStep(2);
                        }} style={styles.mainActionBtn}>
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
                                            <Text style={[styles.docLabelSub, docErrors[doc] && { color: '#EF4444' }]}>
                                                {uploaded?.uploading
                                                    ? "Uploading..."
                                                    : docErrors[doc]
                                                        ? docErrors[doc]
                                                        : uploaded?.url
                                                            ? "Attachment saved"
                                                            : "Max 10 MB • PDF or Image"}
                                            </Text>
                                        </View>
                                        {uploaded?.uploading && <ActivityIndicator size="small" color="#2D935C" />}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                        <TouchableOpacity onPress={() => {
                            const missingDocs = validateDocs();
                            if (missingDocs.length === 0) setStep(3);
                            else Alert.alert("Documents Required", `Please upload: ${missingDocs.join(", ")}`);
                        }} style={styles.mainActionBtn}>
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
                            <View style={styles.fieldItem}>
                                <Text style={styles.fieldLabel}>Account Number <Text style={styles.asterisk}>*</Text></Text>
                                <TextInput
                                    style={[styles.fieldInput, errors.accountNumber && { borderColor: '#EF4444' }]}
                                    placeholder="0000 0000 0000"
                                    placeholderTextColor="#000000"
                                    keyboardType="number-pad"
                                    value={form.bankDetails.accountNumber}
                                    onChangeText={v => {
                                        const digits = v.replace(/\D/g, "").slice(0, 20);
                                        updateBank('accountNumber', digits);
                                        if (errors.accountNumber) setErrors(prev => { const c = { ...prev }; delete c.accountNumber; return c; });
                                    }}
                                />
                                {errors.accountNumber && <Text style={styles.errorText}>{errors.accountNumber}</Text>}
                            </View>
                            <View style={styles.fieldItem}>
                                <Text style={styles.fieldLabel}>IFSC Code <Text style={styles.asterisk}>*</Text></Text>
                                <TextInput
                                    style={[styles.fieldInput, errors.ifscCode && { borderColor: '#EF4444' }]}
                                    placeholder="HDFC0000123"
                                    placeholderTextColor="#000000"
                                    autoCapitalize="characters"
                                    value={form.bankDetails.ifscCode}
                                    onChangeText={v => {
                                        const val = v.replace(/[^a-zA-Z0-9]/g, "").slice(0, 11).toUpperCase();
                                        updateBank('ifscCode', val);
                                        if (errors.ifscCode) setErrors(prev => { const c = { ...prev }; delete c.ifscCode; return c; });
                                    }}
                                />
                                {errors.ifscCode && <Text style={styles.errorText}>{errors.ifscCode}</Text>}
                            </View>
                            <View style={styles.fieldItem}>
                                <Text style={styles.fieldLabel}>Bank Name <Text style={styles.asterisk}>*</Text></Text>
                                <TextInput
                                    style={[styles.fieldInput, errors.bankName && { borderColor: '#EF4444' }]}
                                    placeholder="e.g. HDFC Bank"
                                    placeholderTextColor="#000000"
                                    value={form.bankDetails.bankName}
                                    onChangeText={v => {
                                        updateBank('bankName', v);
                                        if (errors.bankName) setErrors(prev => { const c = { ...prev }; delete c.bankName; return c; });
                                    }}
                                />
                                {errors.bankName && <Text style={styles.errorText}>{errors.bankName}</Text>}
                            </View>
                            <View style={styles.fieldItem}>
                                <Text style={styles.fieldLabel}>Account Holder Name <Text style={styles.asterisk}>*</Text></Text>
                                <TextInput
                                    style={[styles.fieldInput, errors.accountHolderName && { borderColor: '#EF4444' }]}
                                    placeholder="e.g. John Doe"
                                    placeholderTextColor="#000000"
                                    value={form.bankDetails.accountHolderName}
                                    onChangeText={v => {
                                        const name = v.replace(/[^a-zA-Z\s]/g, "");
                                        updateBank('accountHolderName', name);
                                        if (errors.accountHolderName) setErrors(prev => { const c = { ...prev }; delete c.accountHolderName; return c; });
                                    }}
                                />
                                {errors.accountHolderName && <Text style={styles.errorText}>{errors.accountHolderName}</Text>}
                            </View>
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
    fieldInput: { height: 60, backgroundColor: '#FFF', borderRadius: 20, paddingHorizontal: 20, fontSize: 16, color: '#000000', borderWidth: 1.5, borderColor: '#F1F5F9', elevation: 2, shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 10 },
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
    errorText: { fontSize: 12, color: '#EF4444', marginLeft: 4, marginTop: -2 },
    specChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2D935C', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, gap: 6 },
    specChipText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
    addSpecBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1.5, borderColor: '#2D935C', borderStyle: 'dashed', gap: 6 },
    addSpecText: { color: '#2D935C', fontSize: 13, fontWeight: '700' },
    dropdownOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    dropdownMenu: { backgroundColor: '#FFF', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, maxHeight: '80%' },
    dropdownHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    dropdownTitle: { fontSize: 18, fontWeight: '900', color: '#1E293B' },
    searchBar: { height: 54, backgroundColor: '#F8FAFC', borderRadius: 16, paddingHorizontal: 18, fontSize: 15, marginBottom: 12, borderWidth: 1, borderColor: '#F1F5F9' },
    dropdownItem: { padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
    dropdownItemSelected: { backgroundColor: '#F0FDF4' },
    dropdownText: { fontSize: 15, color: '#475569', fontWeight: '600' },
    dropdownTextSelected: { color: '#2D935C', fontWeight: '800' },
    customAddBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0FDF4', padding: 14, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#2D935C', borderStyle: 'dashed', gap: 8 },
    customAddText: { color: '#2D935C', fontSize: 14, fontWeight: '700' },
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
