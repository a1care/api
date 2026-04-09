import React, { useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Alert,
    Image,
    FlatList,
    RefreshControl,
    Linking,
    ToastAndroid,
    BackHandler,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { medicalService, MedicalRecord } from '@/services/medical.service';
import { Colors, Shadows } from '@/constants/colors';
import { FontSize } from '@/constants/spacing';
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Button } from '@/components/ui/Button';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { API_BASE_URL } from '@/constants/api';

// Removed internal Toast component in favor of global toast-message

export default function HealthVaultScreen() {
    const router = useRouter();
    const qc = useQueryClient();
    const [isUploading, setIsUploading] = useState(false);
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

    // Hardware back button should go to Profile Menu
    useFocusEffect(
        React.useCallback(() => {
            const onBackPress = () => {
                router.push('/(tabs)/profile');
                return true;
            };
            const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
            return () => subscription.remove();
        }, [])
    );

    const getFileUrl = (url: string) => {
        if (!url) return '';
        if (url.startsWith('http')) return url;
        const baseUrl = API_BASE_URL.replace('/api', '');
        return `${baseUrl}/${url.replace(/\\/g, '/')}`;
    };

    const { data: records, isLoading, isError, refetch, isRefetching } = useQuery({
        queryKey: ['medical-records'],
        queryFn: medicalService.getMyRecords,
    });

    const uploadMutation = useMutation({
        mutationFn: (formData: FormData) => medicalService.uploadRecord(formData),
        onSuccess: () => {
            Toast.show({
                type: 'success',
                text1: 'Upload Successful',
                text2: 'Record uploaded successfully',
            });
            qc.invalidateQueries({ queryKey: ['medical-records'] });
        },
        onError: (err: any) => {
            Toast.show({
                type: 'error',
                text1: 'Upload Failed',
                text2: err?.response?.data?.message || "Upload Failed",
            });
        },
        onSettled: () => setIsUploading(false)
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => medicalService.deleteRecord(id),
        onSuccess: () => {
            Toast.show({
                type: 'success',
                text1: 'Record Deleted',
                text2: 'The medical record has been removed.',
            });
            qc.invalidateQueries({ queryKey: ['medical-records'] });
        },
        onError: (err: any) => {
            Toast.show({
                type: 'error',
                text1: 'Delete Failed',
                text2: err?.response?.data?.message || "Could not delete record.",
            });
        }
    });

    const handleDeleteRecord = (id: string) => {
        Alert.alert(
            "Delete Record", 
            "Are you sure you want to permanently delete this medical record?",
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Delete", 
                    style: "destructive", 
                    onPress: () => deleteMutation.mutate(id) 
                }
            ]
        );
    };

    const handlePickDocument = async (type: 'prescriptions' | 'labReports') => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['application/pdf', 'image/*'],
                multiple: true
            });

            if (result.canceled) return;

            setIsUploading(true);
            const formData = new FormData();
            
            result.assets.forEach((asset) => {
                formData.append(type, {
                    uri: asset.uri,
                    name: asset.name,
                    type: asset.mimeType || 'application/octet-stream'
                } as any);
            });

            uploadMutation.mutate(formData);
        } catch (err) {
            console.error(err);
            setIsUploading(false);
        }
    };

    const renderRecord = ({ item }: { item: MedicalRecord }) => (
        <View style={styles.recordCard}>
            <View style={styles.recordHeader}>
                <View style={[styles.iconBox, { backgroundColor: item.prescriptions.length > 0 ? '#EEF2FF' : '#ECFDF5' }]}>
                    <MaterialCommunityIcons 
                        name={item.prescriptions.length > 0 ? "pill" : "flask-outline"} 
                        size={24} 
                        color={item.prescriptions.length > 0 ? "#6366F1" : "#10B981"} 
                    />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.recordTitle}>
                        {item.diagnosis || (item.prescriptions.length > 0 ? "Prescription" : "Lab Report")}
                    </Text>
                    <Text style={styles.recordDate}>
                        {new Date(item.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                    </Text>
                </View>
                <TouchableOpacity onPress={() => handleDeleteRecord(item._id)} style={styles.moreBtn}>
                    <Ionicons name="ellipsis-vertical" size={20} color="#94A3B8" />
                </TouchableOpacity>
            </View>

            {item.clinicalNotes ? (
                <Text style={styles.notesText} numberOfLines={2}>{item.clinicalNotes}</Text>
            ) : null}

            <View style={styles.filesRow}>
                {item.prescriptions.map((url, i) => (
                    <TouchableOpacity key={i} style={styles.fileChip} onPress={() => Linking.openURL(getFileUrl(url))}>
                        <Ionicons name="document-text" size={14} color="#6366F1" />
                        <Text style={styles.fileChipText}>Prescription {i+1}</Text>
                    </TouchableOpacity>
                ))}
                {item.labReports.map((url, i) => (
                    <TouchableOpacity key={i} style={styles.fileChip} onPress={() => Linking.openURL(getFileUrl(url))}>
                        <Ionicons name="flask" size={14} color="#10B981" />
                        <Text style={styles.fileChipText}>Report {i+1}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.push('/(tabs)/profile')} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#1E293B" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Health Vault</Text>
                <View style={{ width: 44 }} />
            </View>

            {/* Global toast is now used */}

            <FlatList
                data={records}
                keyExtractor={(item) => item._id}
                renderItem={renderRecord}
                contentContainerStyle={styles.list}
                refreshControl={
                    <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
                }
                ListHeaderComponent={
                    <View style={styles.uploadSection}>
                        <Text style={styles.sectionTitle}>Add New Records</Text>
                        <View style={styles.uploadButtons}>
                            <TouchableOpacity 
                                style={[styles.uploadCard, { borderColor: '#6366F1' }]} 
                                onPress={() => handlePickDocument('prescriptions')}
                                disabled={isUploading}
                            >
                                <MaterialCommunityIcons name="pill" size={32} color="#6366F1" />
                                <Text style={styles.uploadLabel}>Upload Prescription</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.uploadCard, { borderColor: '#10B981' }]} 
                                onPress={() => handlePickDocument('labReports')}
                                disabled={isUploading}
                            >
                                <MaterialCommunityIcons name="flask-outline" size={32} color="#10B981" />
                                <Text style={styles.uploadLabel}>Upload Lab Report</Text>
                            </TouchableOpacity>
                        </View>
                        {isUploading && (
                            <View style={styles.uploadingBox}>
                                <ActivityIndicator size="small" color={Colors.primary} />
                                <Text style={styles.uploadingText}>Uploading your documents...</Text>
                            </View>
                        )}
                        <Text style={styles.historyTitle}>Recent Records</Text>
                    </View>
                }
                ListEmptyComponent={
                    !isLoading ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="shield-checkmark-outline" size={64} color="#CBD5E1" />
                            <Text style={styles.emptyTitle}>Your Vault is Empty</Text>
                            <Text style={styles.emptySub}>Securely store your prescriptions and medical reports here for easy access.</Text>
                        </View>
                    ) : null
                }
                ListFooterComponent={<View style={{ height: 100 }} />}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#FFF',
        justifyContent: 'space-between',
        ...Shadows.card
    },
    backBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F1F5F9' },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#1E293B' },
    list: { padding: 16 },
    uploadSection: { marginBottom: 24 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: '#475569', marginBottom: 16 },
    uploadButtons: { flexDirection: 'row', gap: 12 },
    uploadCard: {
        flex: 1,
        height: 120,
        backgroundColor: '#FFF',
        borderRadius: 20,
        borderWidth: 2,
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 12,
    },
    uploadLabel: { fontSize: 13, fontWeight: '600', color: '#1E293B', marginTop: 10, textAlign: 'center' },
    uploadingBox: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16, justifyContent: 'center' },
    uploadingText: { fontSize: 14, color: Colors.primary, fontWeight: '600' },
    historyTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B', marginTop: 32, marginBottom: 16 },
    recordCard: {
        backgroundColor: '#FFF',
        borderRadius: 24,
        padding: 16,
        marginBottom: 16,
        ...Shadows.card,
        borderWidth: 1,
        borderColor: '#F1F5F9'
    },
    recordHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
    iconBox: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    recordTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
    recordDate: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
    moreBtn: { padding: 4 },
    notesText: { fontSize: 14, color: '#64748B', lineHeight: 20, marginBottom: 12 },
    filesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    fileChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#F8FAFC',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#E2E8F0'
    },
    fileChipText: { fontSize: 12, fontWeight: '600', color: '#475569' },
    emptyState: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 40 },
    emptyTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B', marginTop: 20 },
    emptySub: { fontSize: 14, color: '#94A3B8', textAlign: 'center', marginTop: 8, lineHeight: 20 },
    toastContainer: {
        position: 'absolute',
        top: 100,
        left: 20,
        right: 20,
        padding: 16,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        zIndex: 1000,
        ...Shadows.card,
        elevation: 5,
    },
    toastText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '600',
        flex: 1,
    },
});
