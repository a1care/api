import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    ActivityIndicator,
    Image,
    Platform,
    ToastAndroid,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/stores/auth.store';
import { Colors, Shadows } from '@/constants/colors';

export default function ProfileEditScreen() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { setUser } = useAuthStore();

    const { data: profile, isLoading } = useQuery({
        queryKey: ['profile'],
        queryFn: authService.getProfile,
    });

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [gender, setGender] = useState('');
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    useEffect(() => {
        if (profile) {
            setName(profile.name || '');
            setEmail(profile.email || '');
            setGender(profile.gender || '');
        }
    }, [profile]);

    const updateMutation = useMutation({
        mutationFn: (data: any) => authService.updateProfile(data),
        onSuccess: (data) => {
            if (data) setUser(data);
            queryClient.setQueryData(['profile'], data);
            queryClient.invalidateQueries({ queryKey: ['profile'] });
            Toast.show({
                type: 'success',
                text1: 'Success',
                text2: 'Profile updated successfully',
                position: 'top',
                onHide: () => router.back()
            });
        },
        onError: (error: any) => {
            const errorMsg = error.response?.data?.message || error.message || 'Failed to update profile';
            Toast.show({
                type: 'error',
                text1: 'Update Failed',
                text2: errorMsg,
                position: 'top'
            });
        },
    });

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Toast.show({
                type: 'error',
                text1: 'Permission Denied',
                text2: 'Sorry, we need camera roll permissions to make this work!',
                position: 'top'
            });
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled) {
            setSelectedImage(result.assets[0].uri);
        }
    };

    const handleSave = () => {
        if (!name.trim()) {
            Toast.show({
                type: 'error',
                text1: 'Name Required',
                text2: 'Please enter your full name.',
                position: 'top'
            });
            return;
        }

        const formData = new FormData();
        formData.append('name', name);
        formData.append('email', email);
        formData.append('gender', gender);

        if (selectedImage) {
            const uri = selectedImage;
            const fileName = uri.split('/').pop() || 'photo.jpg';
            const match = /\.(\w+)$/.exec(fileName);
            const type = match ? `image/${match[1]}` : `image`;

            formData.append('profile', {
                uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''),
                name: fileName,
                type,
            } as any);
        }

        updateMutation.mutate(formData);
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Edit Profile</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Profile Image Section */}
                <View style={styles.imageSection}>
                    <TouchableOpacity onPress={pickImage} style={styles.imageContainer}>
                        {selectedImage || profile?.profileImage ? (
                            <Image
                                source={{ uri: (selectedImage || profile?.profileImage) as string }}
                                style={styles.profileImage}
                            />
                        ) : (
                            <View style={styles.imagePlaceholder}>
                                <Ionicons name="person" size={50} color="#CBD5E1" />
                            </View>
                        )}
                        <View style={styles.editIconBadge}>
                            <Ionicons name="camera" size={18} color="#FFF" />
                        </View>
                    </TouchableOpacity>
                    <Text style={styles.imageNote}>Tap to change profile picture</Text>
                </View>

                <View style={styles.formSection}>
                    <Text style={styles.label}>Full Name <Text style={{ color: '#E74C3C' }}>*</Text></Text>
                    <TextInput
                        style={styles.input}
                        value={name}
                        onChangeText={setName}
                        placeholder="Enter your name"
                    />

                    <Text style={styles.label}>Email Address <Text style={{ color: '#E74C3C' }}>*</Text></Text>
                    <TextInput
                        style={styles.input}
                        value={email}
                        onChangeText={setEmail}
                        placeholder="Enter your email"
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />

                    <Text style={styles.label}>Gender <Text style={{ color: '#E74C3C' }}>*</Text></Text>
                    <View style={styles.genderContainer}>
                        {['Male', 'Female', 'Other'].map((g) => (
                            <TouchableOpacity
                                key={g}
                                style={[
                                    styles.genderBtn,
                                    gender === g && styles.genderBtnActive
                                ]}
                                onPress={() => setGender(g)}
                            >
                                <Text style={[
                                    styles.genderText,
                                    gender === g && styles.genderTextActive
                                ]}>{g}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={styles.label}>Mobile Number (Read-only)</Text>
                    <TextInput
                        style={[styles.input, styles.disabledInput]}
                        value={profile?.mobileNumber?.toString()}
                        editable={false}
                    />
                </View>

                <TouchableOpacity
                    style={styles.saveBtn}
                    onPress={handleSave}
                    disabled={updateMutation.isPending}
                >
                    {updateMutation.isPending ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.saveBtnText}>Save Changes</Text>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
    scrollContent: { padding: 20 },
    imageSection: {
        alignItems: 'center',
        marginBottom: 30,
    },
    imageContainer: {
        position: 'relative',
        width: 110,
        height: 110,
        borderRadius: 55,
        backgroundColor: '#fff',
        ...Shadows.card,
        padding: 4,
    },
    profileImage: {
        width: '100%',
        height: '100%',
        borderRadius: 55,
    },
    imagePlaceholder: {
        width: '100%',
        height: '100%',
        borderRadius: 55,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    editIconBadge: {
        position: 'absolute',
        right: 0,
        bottom: 0,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#fff',
    },
    imageNote: {
        marginTop: 12,
        fontSize: 12,
        fontWeight: '600',
        color: Colors.primary,
    },
    formSection: { gap: 16 },
    label: { fontSize: 13, fontWeight: '800', color: '#1A4D7A', marginBottom: 6 },
    input: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        color: Colors.textPrimary,
    },
    disabledInput: { backgroundColor: '#F1F5F9', color: '#94A3B8' },
    row: { flexDirection: 'row' },
    genderContainer: { flexDirection: 'row', gap: 8 },
    genderBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    genderBtnActive: {
        backgroundColor: Colors.primaryLight,
        borderColor: Colors.primary,
    },
    genderText: { fontSize: 13, color: '#64748B', fontWeight: '600' },
    genderTextActive: { color: Colors.primary },
    saveBtn: {
        backgroundColor: Colors.primary,
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 40,
        ...Shadows.card,
    },
    saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
