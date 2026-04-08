import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Alert,
    RefreshControl,
    Modal,
    TextInput,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { addressService } from '@/services/address.service';
import { Colors, Shadows } from '@/constants/colors';
import type { Address } from '@/types';

export default function AddressesScreen() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [refreshing, setRefreshing] = useState(false);

    // Address Form Mode
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingAddressId, setEditingAddressId] = useState<string | null>(null);

    // Form Fields
    const [label, setLabel] = useState('Home');
    const [street, setStreet] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');
    const [pincode, setPincode] = useState('');
    const [landmark, setLandmark] = useState('');
    const [moreInfo, setMoreInfo] = useState('');

    // ── Per-label drafts to preserve input state when switching labels ──
    const [drafts, setDrafts] = useState<Record<string, any>>({
        'Home': { street: '', city: '', state: '', pincode: '', landmark: '', moreInfo: '' },
        'Work': { street: '', city: '', state: '', pincode: '', landmark: '', moreInfo: '' },
        'Other': { street: '', city: '', state: '', pincode: '', landmark: '', moreInfo: '' },
    });

    const { data: addresses, isLoading, refetch } = useQuery({
        queryKey: ['addresses'],
        queryFn: addressService.getAll,
    });

    const onRefresh = async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    };

    const deleteMutation = useMutation({
        mutationFn: (id: string) => addressService.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['addresses'] });
        },
    });

    const setPrimaryMutation = useMutation({
        mutationFn: (id: string) => addressService.makePrimary(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['addresses'] });
        },
    });

    const saveAddressMutation = useMutation({
        mutationFn: (data: any) => {
            if (editingAddressId) {
                return addressService.update(editingAddressId, data);
            }
            return addressService.add(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['addresses'] });
            setIsModalVisible(false);
            resetForm();
            Alert.alert('Success', `Address ${editingAddressId ? 'updated' : 'added'} successfully`);
        },
        onError: (error: any) => {
            Alert.alert('Error', error.response?.data?.message || 'Failed to save address');
        },
    });

    const resetForm = () => {
        setEditingAddressId(null);
        setLabel('Home');
        setStreet('');
        setCity('');
        setState('');
        setPincode('');
        setLandmark('');
        setMoreInfo('');
        setDrafts({
            'Home': { street: '', city: '', state: '', pincode: '', landmark: '', moreInfo: '' },
            'Work': { street: '', city: '', state: '', pincode: '', landmark: '', moreInfo: '' },
            'Other': { street: '', city: '', state: '', pincode: '', landmark: '', moreInfo: '' },
        });
    };

    const handleEdit = (addr: Address) => {
        setEditingAddressId(addr._id);

        // Map backend label back to frontend readable
        const l = addr.label?.toUpperCase();
        if (l === 'HOME' || l === 'WORK') setLabel(addr.label!.charAt(0) + addr.label!.slice(1).toLowerCase());
        else setLabel('Other');

        setStreet(addr.street || '');
        setCity(addr.city || '');
        setState(addr.state || '');
        setPincode(addr.pincode || '');
        // For moreInfo, we try to extract if we consolidated it before, otherwise just show it
        setMoreInfo(addr.moreInfo || '');
        setIsModalVisible(true);
    };

    const handleSaveAddress = () => {
        if (!street || !city || !state || !pincode) {
            Alert.alert('Error', 'Please fill in all required fields');
            return;
        }

        const backendLabel = label === 'Other' ? 'OTHERS' : label.toUpperCase();

        saveAddressMutation.mutate({
            label: backendLabel,
            state,
            city,
            pincode,
            street, // Kept separate if backend supports it, otherwise consolidated in moreInfo below
            moreInfo: `${landmark ? `Landmark: ${landmark} | ` : ''}${moreInfo}`,
            location: {
                lat: 17.3850,
                lng: 78.4867
            }
        });
    };

    const handleDelete = (id: string) => {
        Alert.alert('Delete Address', 'Are you sure you want to delete this address?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(id) },
        ]);
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <LinearGradient
                    colors={['#F8FAFC', '#EFF6FF']}
                    style={StyleSheet.absoluteFill}
                />
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    const getAddressIcon = (label: string) => {
        const l = label?.toUpperCase();
        if (l === 'HOME') return { icon: 'home-variant', color: '#1D4ED8', bg: '#DBEAFE' };
        if (l === 'WORK') return { icon: 'briefcase', color: '#047857', bg: '#D1FAE5' };
        return { icon: 'map-marker', color: '#B45309', bg: '#FEF3C7' };
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <LinearGradient
                colors={['#F8FAFC', '#FFFFFF']}
                style={StyleSheet.absoluteFill}
            />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
                </TouchableOpacity>
                <View style={styles.headerTitles}>
                    <Text style={styles.headerTitle}>Saved Addresses</Text>
                    <Text style={styles.headerSub}>Manage your delivery locations</Text>
                </View>
                <TouchableOpacity
                    style={styles.addBtn}
                    onPress={() => { resetForm(); setIsModalVisible(true); }}
                >
                    <Ionicons name="add" size={26} color={Colors.primary} />
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                showsVerticalScrollIndicator={false}
            >
                {addresses && addresses.length > 0 ? (
                    addresses.map((addr: Address) => {
                        const styleConfig = getAddressIcon(addr.label || 'Home');
                        return (
                            <View key={addr._id} style={styles.addressCard}>
                                <View style={styles.cardMain}>
                                    <View style={[styles.iconBox, { backgroundColor: styleConfig.bg }]}>
                                        <MaterialCommunityIcons name={styleConfig.icon as any} size={24} color={styleConfig.color} />
                                    </View>

                                    <View style={styles.addressInfo}>
                                        <View style={styles.labelRow}>
                                            <Text style={styles.labelText}>{addr.label || 'Home'}</Text>
                                            {addr.isPrimary && (
                                                <View style={styles.primaryPill}>
                                                    <Ionicons name="checkmark-circle" size={12} color="#10B981" />
                                                    <Text style={styles.primaryPillText}>Primary</Text>
                                                </View>
                                            )}
                                        </View>

                                        <Text style={styles.mainAddress} numberOfLines={2}>
                                            {addr.street}
                                        </Text>
                                        <Text style={styles.subAddress}>
                                            {addr.landmark ? `${addr.landmark}, ` : ''}{addr.city}, {addr.pincode}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.cardFooter}>
                                    <TouchableOpacity
                                        style={styles.footerAction}
                                        onPress={() => handleEdit(addr)}
                                    >
                                        <Ionicons name="create-outline" size={16} color={Colors.primary} />
                                        <Text style={styles.footerActionText}>Edit</Text>
                                    </TouchableOpacity>

                                    {!addr.isPrimary && (
                                        <TouchableOpacity
                                            style={[styles.footerAction, { marginLeft: 12 }]}
                                            onPress={() => setPrimaryMutation.mutate(addr._id)}
                                        >
                                            <Ionicons name="star-outline" size={16} color={Colors.primary} />
                                            <Text style={styles.footerActionText}>Make Primary</Text>
                                        </TouchableOpacity>
                                    )}
                                    <TouchableOpacity
                                        style={[styles.footerAction, { marginLeft: 'auto' }]}
                                        onPress={() => handleDelete(addr._id)}
                                    >
                                        <Ionicons name="trash-outline" size={16} color="#EF4444" />
                                        <Text style={[styles.footerActionText, { color: '#EF4444' }]}>Delete</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        );
                    })
                ) : (
                    <View style={styles.emptyContainer}>
                        <View style={styles.emptyIconBox}>
                            <Ionicons name="map" size={48} color={Colors.primary} />
                        </View>
                        <Text style={styles.emptyTitle}>Your Map is Empty</Text>
                        <Text style={styles.emptySub}>Add addresses for home and work to make booking a breeze.</Text>

                        <TouchableOpacity
                            style={styles.emptyAddBtn}
                            onPress={() => { resetForm(); setIsModalVisible(true); }}
                        >
                            <Text style={styles.emptyAddBtnText}>Add My First Address</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>

            <Modal
                visible={isModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setIsModalVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{editingAddressId ? 'Update Address' : 'Add New Address'}</Text>
                            <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#64748B" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text style={styles.inputLabel}>Address Label <Text style={styles.required}>*</Text></Text>
                            <View style={styles.labelChips}>
                                {['Home', 'Work', 'Other'].map((l) => {
                                    const config = getAddressIcon(l);
                                    const isActive = label === l;
                                    return (
                                        <TouchableOpacity
                                            key={l}
                                            style={[
                                                styles.chip,
                                                isActive && { backgroundColor: config.bg, borderColor: config.color }
                                            ]}
                                            onPress={() => {
                                                if (editingAddressId) {
                                                    setLabel(l);
                                                } else {
                                                    // Save current inputs to draft of the OLD label
                                                    setDrafts(prev => ({
                                                        ...prev,
                                                        [label]: { street, city, state, pincode, landmark, moreInfo }
                                                    }));
                                                    // Load inputs from draft of the NEW label
                                                    const d = drafts[l] || { street: '', city: '', state: '', pincode: '', landmark: '', moreInfo: '' };
                                                    setLabel(l);
                                                    setStreet(d.street);
                                                    setCity(d.city);
                                                    setState(d.state);
                                                    setPincode(d.pincode);
                                                    setLandmark(d.landmark);
                                                    setMoreInfo(d.moreInfo);
                                                }
                                            }}
                                        >
                                            <MaterialCommunityIcons
                                                name={config.icon as any}
                                                size={16}
                                                color={isActive ? config.color : '#64748B'}
                                            />
                                            <Text style={[
                                                styles.chipText,
                                                isActive && { color: config.color }
                                            ]}>{l}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            <Text style={styles.inputLabel}>House No / Street / Area <Text style={styles.required}>*</Text></Text>
                            <TextInput
                                style={styles.input}
                                value={street}
                                onChangeText={setStreet}
                                placeholder="e.g. Flat 101, Sunny Enclave"
                                placeholderTextColor={Colors.muted}
                            />

                            <View style={styles.inputRow}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.inputLabel}>City <Text style={styles.required}>*</Text></Text>
                                    <TextInput
                                        style={styles.input}
                                        value={city}
                                        onChangeText={(v) => setCity(v.replace(/[^a-zA-Z\s]/g, ''))}
                                        placeholder="Enter City"
                                        placeholderTextColor={Colors.textSecondary}
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.inputLabel}>State <Text style={styles.required}>*</Text></Text>
                                    <TextInput
                                        style={styles.input}
                                        value={state}
                                        onChangeText={(v) => setState(v.replace(/[^a-zA-Z\s]/g, ''))}
                                        placeholder="Enter State"
                                        placeholderTextColor={Colors.textSecondary}
                                    />
                                </View>
                            </View>

                            <View style={styles.inputRow}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.inputLabel}>Pincode <Text style={styles.required}>*</Text></Text>
                                    <TextInput
                                        style={styles.input}
                                        value={pincode}
                                        onChangeText={setPincode}
                                        placeholder="6-digit ZIP"
                                        placeholderTextColor={Colors.textSecondary}
                                        keyboardType="numeric"
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.inputLabel}>Landmark</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={landmark}
                                        onChangeText={setLandmark}
                                        placeholder="Near..."
                                        placeholderTextColor={Colors.textSecondary}
                                    />
                                </View>
                            </View>

                            <Text style={styles.inputLabel}>Other Info (Floor/Building/etc)</Text>
                            <TextInput
                                style={styles.input}
                                value={moreInfo}
                                onChangeText={setMoreInfo}
                                placeholder="Optional details"
                                placeholderTextColor={Colors.muted}
                            />

                            <TouchableOpacity
                                style={styles.saveAddressBtn}
                                onPress={handleSaveAddress}
                                disabled={saveAddressMutation.isPending}
                            >
                                {saveAddressMutation.isPending ? (
                                    <ActivityIndicator color="#FFF" />
                                ) : (
                                    <Text style={styles.saveAddressText}>
                                        {editingAddressId ? 'Update Changes' : 'Save Address'}
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
        justifyContent: 'space-between',
    },
    backBtn: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
    },
    headerTitles: {
        flex: 1,
        marginLeft: 16,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: Colors.textPrimary
    },
    headerSub: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    addBtn: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.primaryLight,
    },
    scrollContent: { padding: 20 },
    addressCard: {
        backgroundColor: '#fff',
        borderRadius: 28,
        padding: 20,
        marginBottom: 20,
        ...Shadows.card,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.03)',
    },
    cardMain: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        borderBottomWidth: 1,
        borderBottomColor: '#F8FAFC',
        paddingBottom: 16,
    },
    iconBox: {
        width: 52,
        height: 52,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    addressInfo: {
        flex: 1,
        marginLeft: 16,
    },
    labelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
        gap: 8,
    },
    labelText: {
        fontSize: 13,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        color: Colors.textPrimary,
    },
    primaryPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ECFDF5',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
        gap: 4,
    },
    primaryPillText: {
        fontSize: 10,
        color: '#10B981',
        fontWeight: '800',
    },
    mainAddress: {
        fontSize: 17,
        fontWeight: '700',
        color: Colors.textPrimary,
        marginBottom: 4,
        lineHeight: 22,
    },
    subAddress: {
        fontSize: 13,
        color: Colors.textSecondary,
        fontWeight: '500',
    },
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 16,
    },
    footerAction: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        padding: 4,
    },
    footerActionText: {
        fontSize: 13,
        fontWeight: '700',
        color: Colors.primary,
    },
    emptyContainer: {
        alignItems: 'center',
        paddingTop: 60,
        paddingHorizontal: 40,
    },
    emptyIconBox: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: Colors.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    emptyTitle: {
        fontSize: 22,
        fontWeight: '900',
        color: Colors.textPrimary,
        textAlign: 'center',
    },
    emptySub: {
        fontSize: 15,
        color: Colors.muted,
        textAlign: 'center',
        marginTop: 12,
        lineHeight: 22,
        marginBottom: 32,
    },
    emptyAddBtn: {
        backgroundColor: Colors.primary,
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 20,
        ...Shadows.card,
    },
    emptyAddBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '800',
    },

    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 24,
        maxHeight: '90%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    modalTitle: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
    inputLabel: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8, marginTop: 16 },
    required: { color: '#E11D48', fontWeight: '900' },
    input: {
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: Colors.textPrimary,
    },
    inputRow: { flexDirection: 'row', gap: 12 },
    labelChips: { flexDirection: 'row', gap: 10 },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        backgroundColor: '#fff',
        gap: 8,
    },
    chipText: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
    saveAddressBtn: {
        backgroundColor: Colors.primary,
        borderRadius: 16,
        paddingVertical: 18,
        alignItems: 'center',
        marginTop: 32,
        marginBottom: 20,
        ...Shadows.card,
    },
    saveAddressText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
