import React, { useRef, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    TextInput,
    StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { servicesService } from '@/services/services.service';
import { bookingsService } from '@/services/bookings.service';
import { doctorsService } from '@/services/doctors.service';
import { addressService } from '@/services/address.service';
import { walletService } from '@/services/wallet.service';
import { paymentService } from '@/services/payment.service';
import { Colors, Shadows } from '@/constants/colors';
import { FontSize } from '@/constants/spacing';
import { Button } from '@/components/ui/Button';
import { DoctorCard } from '@/components/ui/DoctorCard';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { formatCurrency } from '@/utils/formatters';
import type { Address } from '@/types';

// ─── Step definitions ─────────────────────────────────────────────────────────
type Step = 'info' | 'doctor' | 'address' | 'schedule' | 'payment' | 'confirm';

const ALL_STEPS: Step[] = ['info', 'doctor', 'address', 'schedule', 'payment', 'confirm'];
const ALL_STEP_LABELS = ['Service', 'Expert', 'Location', 'Schedule', 'Payment', 'Review'];

// ─── Step indicator ───────────────────────────────────────────────────────────
function StepIndicator({ current, activeSteps }: { current: Step, activeSteps: Step[] }) {
    const idx = activeSteps.indexOf(current);
    return (
        <View style={styles.stepRow}>
            {activeSteps.map((s, i) => {
                const globalIdx = ALL_STEPS.indexOf(s);
                return (
                    <React.Fragment key={s}>
                        <View style={styles.stepItem}>
                            <View
                                style={[
                                    styles.stepDot,
                                    i < idx ? styles.stepDotDone : {},
                                    i === idx ? styles.stepDotActive : {},
                                ]}
                            >
                                {i < idx ? (
                                    <Text style={styles.stepDotCheckmark}>✓</Text>
                                ) : (
                                    <Text
                                        style={[
                                            styles.stepDotNum,
                                            i === idx ? styles.stepDotNumActive : {},
                                        ]}
                                    >
                                        {i + 1}
                                    </Text>
                                )}
                            </View>
                            <Text
                                style={[styles.stepLabel, i === idx ? styles.stepLabelActive : {}]}
                            >
                                {ALL_STEP_LABELS[globalIdx]}
                            </Text>
                        </View>
                        {i < activeSteps.length - 1 && (
                            <View style={[styles.stepLine, i < idx ? styles.stepLineDone : {}]} />
                        )}
                    </React.Fragment>
                );
            })}
        </View>
    );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function ServiceDetailScreen() {
    const { id, name: nameParam, price: priceParam, subName } = useLocalSearchParams<{ id: string; name?: string; price?: string; subName?: string }>();
    const router = useRouter();
    const qc = useQueryClient();

    const [step, setStep] = useState<Step | null>(null);
    const [selectedAddressId, setSelectedAddressId] = useState<string>('');
    const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
    const [scheduledDate, setScheduledDate] = useState('');
    const [scheduledTime, setScheduledTime] = useState('');
    const [notes, setNotes] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'COD' | 'WALLET' | 'ONLINE'>('COD');
    const [submittingOnline, setSubmittingOnline] = useState(false);
    const [isAsap, setIsAsap] = useState(true);
    const [submitted, setSubmitted] = useState(false);
    const submitting = useRef(false);



    // Date generation for next 7 days
    const dates = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() + i);
        return {
            full: d.toISOString().split('T')[0],
            dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
            dayNum: d.getDate(),
            month: d.toLocaleDateString('en-US', { month: 'short' })
        };
    });

    const timeSlots = [
        '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
        '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM', '06:00 PM'
    ];

    // New Address States
    const [isAddingAddress, setIsAddingAddress] = useState(false);
    const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
    const [addrErrors, setAddrErrors] = useState<Record<string, string>>({});
    const [newAddress, setNewAddress] = useState({
        label: 'HOME',
        street: '',
        city: '',
        state: 'Telangana',
        pincode: '',
    });

    // ── Address drafts for each label (swaps inputs when switching labels) ──
    const [addrDrafts, setAddrDrafts] = useState<Record<string, any>>({
        HOME: { street: '', city: '', pincode: '' },
        WORK: { street: '', city: '', pincode: '' },
        OTHERS: { street: '', city: '', pincode: '' },
    });

    const addAddressMutation = useMutation({
        mutationFn: (data: typeof newAddress) => {
            const payload = {
                label: data.label,
                state: data.state,
                city: data.city,
                pincode: data.pincode,
                moreInfo: data.street,
                location: { lat: 17.3850, lng: 78.4867 }
            };
            if (editingAddressId) {
                return addressService.update(editingAddressId, payload as any);
            }
            return addressService.add(payload as any);
        },
        onSuccess: (data) => {
            qc.invalidateQueries({ queryKey: ['addresses'] });
            setSelectedAddressId(data._id);
            setIsAddingAddress(false);
            setEditingAddressId(null);
            setAddrErrors({});
            setNewAddress({ label: 'HOME', street: '', city: '', state: 'Telangana', pincode: '' });
            setAddrDrafts({
                HOME: { street: '', city: '', pincode: '' },
                WORK: { street: '', city: '', pincode: '' },
                OTHERS: { street: '', city: '', pincode: '' },
            });
        },
        onError: (error: any) => {
            const serverMsg = error?.response?.data?.message;
            console.error('Address Save Error:', error?.response?.data || error.message);
            Alert.alert('Address Error', serverMsg || 'The server rejected this address. Please check all fields and try again.');
        }
    });

    const deleteAddressMutation = useMutation({
        mutationFn: addressService.delete,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['addresses'] });
            Alert.alert('Success', 'Address deleted successfully');
        },
    });

    const handleAddAddress = () => {
        const errors: Record<string, string> = {};

        if (!newAddress.street.trim()) errors.street = 'Street address is required';
        if (!newAddress.city.trim()) errors.city = 'City is required';
        if (!/^\d{6}$/.test(newAddress.pincode)) errors.pincode = 'Pincode must be 6 digits';

        if (Object.keys(errors).length > 0) {
            setAddrErrors(errors);
            return;
        }

        setAddrErrors({});
        addAddressMutation.mutate(newAddress);
    };

    // Fetch saved addresses
    const {
        data: addresses,
        isLoading: addrLoading,
        isError: addrErr,
        refetch: refetchAddr,
    } = useQuery({
        queryKey: ['addresses'],
        queryFn: addressService.getAll,
    });

    const { data: wallet } = useQuery({
        queryKey: ['wallet'],
        queryFn: walletService.getWallet,
    });

    const { data: service, isLoading: serviceLoading } = useQuery({
        queryKey: ['child-service', id],
        queryFn: () => servicesService.getChildServiceById(id!),
        enabled: !!id,
    });

    const { data: staff, isLoading: staffLoading } = useQuery({
        queryKey: ['staff-for-service', id, nameParam],
        queryFn: async () => {
            const rolesToFetch = service?.allowedRoleIds?.length ? service.allowedRoleIds : ['role_doctor_id'];
            const allStaff = await Promise.all(
                rolesToFetch.map(rid => doctorsService.getByRole(rid, nameParam))
            );
            return allStaff.flat();
        },
        enabled: !!service && service.selectionType !== 'ASSIGN',
    });

    // Compute dynamic steps based on service config
    const activeSteps: Step[] = React.useMemo(() => {
        if (!service) return [];
        const steps: Step[] = ['info'];

        // Show doctor selection by default unless explicitly set to ASSIGN
        if (service.selectionType !== 'ASSIGN') {
            steps.push('doctor');
        }

        // Hide address step for Hospital Visit or Virtual
        const isHospital = service.fulfillmentMode === 'HOSPITAL_VISIT' || (subName && /hospital/i.test(subName));
        const isVirtual = service.fulfillmentMode === 'VIRTUAL' || (subName && /virtual|online/i.test(subName));

        if (!isHospital && !isVirtual) {
            steps.push('address');
        }

        steps.push('schedule', 'payment', 'confirm');
        return steps;
    }, [service, subName]);

    // ── Handle Hardware Back Button (Android Step-by-Step) ──
    React.useEffect(() => {
        const onBackPress = () => {
            if (activeSteps && step) {
                const idx = activeSteps.indexOf(step as Step);
                if (idx > 0) {
                    setStep(activeSteps[idx - 1]);
                    return true;
                }
            }
            return false; // Let system handle (exits screen)
        };

        const subscription = require('react-native').BackHandler.addEventListener('hardwareBackPress', onBackPress);
        return () => subscription.remove();
    }, [step, activeSteps]);

    // Initialize first step
    React.useEffect(() => {
        if (service && !step && activeSteps.length > 0) {
            setStep(activeSteps[0]);

            // For hospital visits, we default to scheduled and disable ASAP
            const isHosp = service.fulfillmentMode === 'HOSPITAL_VISIT' || (subName && /hospital/i.test(subName));
            if (isHosp) {
                setIsAsap(false);
                // Default to today
                const today = new Date().toISOString().split('T')[0];
                setScheduledDate(today);
            }
        }
    }, [service, step, activeSteps, subName]);

    // Booking mutation — prevent duplicate submissions with ref
    const bookMutation = useMutation({
        mutationFn: () => {
            if (submitting.current) throw new Error('Already submitting');
            submitting.current = true;
            const addr = addresses?.find((a) => a._id === selectedAddressId);
            const isHosp = service?.fulfillmentMode === 'HOSPITAL_VISIT' || (subName && /hospital/i.test(subName));
            return bookingsService.createServiceBooking({
                childServiceId: id!,
                addressId: isHosp ? undefined : addr?._id,
                assignedProviderId: selectedDoctorId || undefined,
                scheduledTime: buildScheduledTime(),
                bookingType: isAsap ? 'ON_DEMAND' : 'SCHEDULED',
                fulfillmentMode: (service?.fulfillmentMode) ?? (isHosp ? 'HOSPITAL_VISIT' : 'HOME_VISIT'),
                price: priceParam ? parseFloat(priceParam) : 0,
                paymentMode: paymentMethod === 'COD' ? 'OFFLINE' : 'ONLINE',
            });
        },
        onSuccess: () => {
            submitting.current = false;
            qc.invalidateQueries({ queryKey: ['service-bookings'] });
            qc.invalidateQueries({ queryKey: ['pending-bookings'] });
            
            // Only show the internal success screen for COD/Wallet. 
            // For Online, we redirect to gateway and handle success there.
            if (paymentMethod !== 'ONLINE') {
                setSubmitted(true);
            }
        },
        onError: (err: any) => {
            submitting.current = false;
            const msg: string = err?.response?.data?.message ?? err?.message ?? 'Booking failed';
            if (msg.toLowerCase().includes('limit') || msg.toLowerCase().includes('concurrent')) {
                Alert.alert(
                    'Booking Limit Reached',
                    'You can have at most 2 active bookings at a time. Please complete or cancel an existing booking first.',
                    [
                        { text: 'View Bookings', onPress: () => router.push('/(tabs)/bookings') },
                        { text: 'OK', style: 'cancel' },
                    ]
                );
            } else if (msg === 'Already submitting') {
                // ignore
            } else {
                Alert.alert('Booking Failed', msg);
            }
        },
    });

    const buildScheduledTime = () => {
        if (isAsap) return undefined;
        if (scheduledDate && scheduledTime) {
            // Convert to a format zod's z.coerce.date() can handle (ISO string)
            // scheduledDate is already YYYY-MM-DD
            // scheduledTime is like "10:00 AM"
            try {
                const datePart = scheduledDate;
                const [time, modifier] = scheduledTime.split(' ');
                let [hours, minutes] = time.split(':');
                if (hours === '12') hours = '00';
                if (modifier === 'PM') hours = (parseInt(hours, 10) + 12).toString();
                const isoStr = `${datePart}T${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:00.000Z`;
                return isoStr;
            } catch (e) {
                return undefined;
            }
        }
        return undefined;
    };

    const getDisplaySchedule = () => {
        if (isAsap) return '⚡ ASAP (Fastest)';
        if (scheduledDate && scheduledTime) {
            return `${scheduledDate} at ${scheduledTime}`;
        }
        return 'Not scheduled';
    };

    const handleFinalSubmit = async () => {
        if (paymentMethod === 'ONLINE') {
            try {
                setSubmittingOnline(true);
                // 1. Create Booking
                const booking = await bookMutation.mutateAsync();
                
                // 2. Create Order
                const order = await paymentService.createOrder({
                    amount: priceParam ? parseFloat(priceParam) : 0,
                    type: "BOOKING",
                    referenceId: booking._id
                });

                // 3. Initiate
                const params = await paymentService.initiatePayment(order._id);

                // 4. Checkout
                router.push({
                    pathname: "/checkout/easebuzz" as any,
                    params: { ...params }
                });
            } catch (err: any) {
                console.error("Service Payment Error:", err);
                Alert.alert("Order Error", err?.response?.data?.message || "Could not initiate online payment. Please use COD.");
            } finally {
                setSubmittingOnline(false);
            }
        } else {
            bookMutation.mutate();
        }
    };

    const serviceName = nameParam ?? `Service`;

    // ── Success screen ──
    if (submitted) {
        return (
            <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
                <View style={styles.successContainer}>
                    <View style={styles.successIconBg}>
                        <Text style={{ fontSize: 52 }}>✅</Text>
                    </View>
                    <Text style={styles.successTitle}>Booking Confirmed!</Text>
                    <Text style={styles.successSub}>
                        {service?.fulfillmentMode === 'HOSPITAL_VISIT'
                            ? 'Your appointment at A1care Hospital has been scheduled. Please present this booking at the reception.'
                            : 'Your home-care request has been placed. A certified professional will be assigned shortly.'
                        }
                    </Text>

                    <View style={styles.codConfirmBox}>
                        <Text style={styles.codConfirmIcon}>{paymentMethod === 'WALLET' ? '👛' : '💵'}</Text>
                        <View>
                            <Text style={styles.codConfirmTitle}>{paymentMethod === 'WALLET' ? 'Paid via Wallet' : 'Cash on Delivery'}</Text>
                            <Text style={styles.codConfirmSub}>{paymentMethod === 'WALLET' ? 'Amount deducted from balance' : 'Pay when your provider arrives'}</Text>
                        </View>
                    </View>

                    {service?.fulfillmentMode === 'HOSPITAL_VISIT' && (
                        <View style={styles.opTicketCard}>
                            <View style={styles.opTicketHeader}>
                                <View>
                                    <Text style={styles.opTicketLabel}>OP REGISTRATION TOKEN</Text>
                                    <Text style={styles.opTicketHospital}>A1care Super-Speciality</Text>
                                </View>
                                <Ionicons name="medical" size={24} color={Colors.health} />
                            </View>
                            <View style={styles.opTicketDivider} />
                            <View style={styles.opTicketBody}>
                                <View style={styles.opTicketRow}>
                                    <View>
                                        <Text style={styles.opInfoLabel}>SERVICE</Text>
                                        <Text style={styles.opInfoValue}>{service.name}</Text>
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <Text style={styles.opInfoLabel}>SLOT</Text>
                                        <Text style={styles.opInfoValue}>{scheduledTime || 'Walk-in'}</Text>
                                    </View>
                                </View>
                                <View style={[styles.opTicketRow, { marginTop: 16 }]}>
                                    <View>
                                        <Text style={styles.opInfoLabel}>DATE</Text>
                                        <Text style={styles.opInfoValue}>{scheduledDate || new Date().toLocaleDateString()}</Text>
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <Text style={styles.opInfoLabel}>TOKEN STATUS</Text>
                                        <Text style={[styles.opInfoValue, { color: Colors.health }]}>ACTIVE</Text>
                                    </View>
                                </View>
                            </View>
                            <View style={styles.opTicketFooter}>
                                <Text style={styles.opFooterText}>Show this token at the OP desk on arrival</Text>
                            </View>
                        </View>
                    )}

                    <Button
                        label="Track My Booking"
                        onPress={() => router.push('/(tabs)/bookings')}
                        variant="primary"
                        size="lg"
                        fullWidth
                        style={{ marginBottom: 12 }}
                    />
                    <Button
                        label="Back to Home"
                        onPress={() => router.push('/(tabs)')}
                        variant="ghost"
                        size="md"
                        fullWidth
                    />
                </View>
            </SafeAreaView>
        );
    }

    if (serviceLoading || addrLoading || !step) {
        return (
            <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                    <Text style={{ marginTop: 12, color: Colors.muted }}>Preparing Booking Desk...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.root} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => {
                        const idx = activeSteps.indexOf(step as Step);
                        if (idx > 0) {
                            setStep(activeSteps[idx - 1]);
                        } else {
                            router.back();
                        }
                    }}
                    style={styles.backBtn}
                >
                    <Text style={styles.backText}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>
                    {serviceName}
                </Text>
                <View style={{ width: 36 }} />
            </View>

            {/* Step indicator */}
            <View style={styles.stepWrap}>
                <StepIndicator current={step as Step} activeSteps={activeSteps} />
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scroll}
                keyboardShouldPersistTaps="handled"
            >
                {/* ── Step: INFO ── */}
                {step === 'info' && service && (
                    <View style={styles.card}>
                        <View style={styles.heroSection}>
                            <View style={styles.heroIconBg}>
                                <Text style={{ fontSize: 42 }}>⚕️</Text>
                            </View>
                            <Text style={styles.heroTitle}>{service.name}</Text>
                            <Text style={styles.heroDesc}>{service.description || 'Professional home-care service provided by certified experts.'}</Text>
                        </View>
                        
                        <View style={styles.infoGrid}>
                            <View style={styles.infoItem}>
                                <Text style={styles.infoLabel}>CATEGORY</Text>
                                <Text style={styles.infoValue}>{subName || 'General Health'}</Text>
                            </View>
                            <View style={styles.infoItem}>
                                <Text style={styles.infoLabel}>PRICE</Text>
                                <Text style={styles.infoValue}>₹{priceParam || service.price || '0'}</Text>
                            </View>
                        </View>

                    </View>
                )}

                {/* ──────────────────────── STEP 1: Address ──────────────────────── */}
                {step === 'address' && (
                    <View style={styles.stepContent}>
                        <Text style={styles.stepTitle}>📍 Select Service Address</Text>
                        <Text style={styles.stepSubtitle}>The healthcare professional will visit this location</Text>

                        {addrLoading ? (
                            <ActivityIndicator color={Colors.primary} style={{ marginTop: 24 }} />
                        ) : addrErr ? (
                            <ErrorState message="Could not load addresses" onRetry={refetchAddr} />
                        ) : (
                            <>
                                {(addresses ?? []).map((a) => (
                                    <TouchableOpacity
                                        key={a._id}
                                        style={[
                                            styles.addressCard,
                                            selectedAddressId === a._id ? styles.addressCardActive : {},
                                        ]}
                                        onPress={() => setSelectedAddressId(a._id)}
                                    >
                                        <View
                                            style={[
                                                styles.radioOuter,
                                                selectedAddressId === a._id ? styles.radioActive : {},
                                            ]}
                                        >
                                            {selectedAddressId === a._id && (
                                                <View style={styles.radioInner} />
                                            )}
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            {a.label ? (
                                                <Text style={styles.addrLabel}>{a.label}</Text>
                                            ) : null}
                                            <Text style={styles.addrStreet}>{a.moreInfo || a.street}</Text>
                                            {(a.city || a.pincode) && (
                                                <Text style={styles.addrCity}>
                                                    {a.city}{a.pincode ? ` - ${a.pincode}` : ''}
                                                </Text>
                                            )}
                                        </View>
                                        <View style={styles.addrActions}>
                                            <TouchableOpacity
                                                onPress={() => {
                                                    setNewAddress({
                                                        label: (a.label || 'HOME').toUpperCase(),
                                                        street: a.moreInfo || a.street || '',
                                                        city: a.city || '',
                                                        state: a.state || 'Telangana',
                                                        pincode: a.pincode || '',
                                                    });
                                                    setEditingAddressId(a._id);
                                                    setIsAddingAddress(true);
                                                }}
                                                style={styles.addrActionBtn}
                                            >
                                                <Ionicons name="pencil" size={16} color={Colors.primary} />
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                onPress={() => {
                                                    Alert.alert('Delete Address', 'Are you sure?', [
                                                        { text: 'Cancel', style: 'cancel' },
                                                        { text: 'Delete', style: 'destructive', onPress: () => deleteAddressMutation.mutate(a._id) }
                                                    ]);
                                                }}
                                                style={styles.addrActionBtn}
                                            >
                                                <Ionicons name="trash" size={16} color="#EF4444" />
                                            </TouchableOpacity>
                                        </View>
                                        {a.isPrimary && (
                                            <View style={styles.primaryBadge}>
                                                <Text style={styles.primaryBadgeText}>Primary</Text>
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                ))}


                                {(addresses ?? []).length === 0 && !isAddingAddress && (
                                    <View style={{ marginVertical: 20 }}>
                                        <EmptyState
                                            icon="🏠"
                                            title="No addresses found"
                                            subtitle="You must add an address to book a home service."
                                            actionLabel="Add Address"
                                            onAction={() => setIsAddingAddress(true)}
                                        />
                                    </View>
                                )}

                                {/* The original instruction had a misplaced `> 0 && !isAddingAddress && (` here. Removing it. */}
                                {(addresses ?? []).length > 0 && !isAddingAddress && (
                                    <TouchableOpacity
                                        style={styles.addAddrMiniBtn}
                                        onPress={() => setIsAddingAddress(true)}
                                    >
                                        <Text style={styles.addAddrMiniText}>+ Add Another Address</Text>
                                    </TouchableOpacity>
                                )}

                                {((addresses ?? []).length === 0 || isAddingAddress) && (
                                    <View style={styles.addAddrForm}>
                                        <Text style={styles.formTitle}>
                                            {editingAddressId ? '📝 Edit Address' : '🏠 Add New Address'}
                                        </Text>

                                        <Text style={styles.fieldLabel}>Address Label</Text>
                                        <View style={styles.labelChips}>
                                            {['HOME', 'WORK', 'OTHERS'].map((lab) => (
                                                <TouchableOpacity
                                                    key={lab}
                                                    style={[styles.labelChip, newAddress.label === lab && styles.labelChipActive]}
                                                    onPress={() => {
                                                        if (editingAddressId) {
                                                            // When editing, just change the label
                                                            setNewAddress(prev => ({ ...prev, label: lab }));
                                                        } else {
                                                            // When adding, save current as draft and load the next label's draft
                                                            setAddrDrafts(prev => ({
                                                                ...prev,
                                                                [newAddress.label]: { street: newAddress.street, city: newAddress.city, pincode: newAddress.pincode }
                                                            }));
                                                            const draft = addrDrafts[lab] || { street: '', city: '', pincode: '' };
                                                            setNewAddress(prev => ({
                                                                ...prev,
                                                                label: lab,
                                                                street: draft.street,
                                                                city: draft.city,
                                                                pincode: draft.pincode
                                                            }));
                                                        }
                                                    }}
                                                >
                                                    <Text style={[styles.labelChipText, newAddress.label === lab && styles.labelChipTextActive]}>
                                                        {lab}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>

                                        <Text style={styles.fieldLabel}>Street / Area / Apartment *</Text>
                                        <TextInput
                                            style={[styles.input, addrErrors.street && { borderColor: '#EF4444' }]}
                                            value={newAddress.street}
                                            onChangeText={(v) => {
                                                setNewAddress(prev => ({ ...prev, street: v }));
                                                if (addrErrors.street) setAddrErrors(prev => { const n = { ...prev }; delete n.street; return n; });
                                            }}
                                            placeholder="Example: Flat 402, Sunshine Apts"
                                            placeholderTextColor={Colors.textSecondary}
                                        />
                                        {addrErrors.street && <Text style={styles.errorText}>{addrErrors.street}</Text>}

                                        <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.fieldLabel}>City *</Text>
                                                <TextInput
                                                    style={[styles.input, addrErrors.city && { borderColor: '#EF4444' }]}
                                                    value={newAddress.city}
                                                    onChangeText={(v) => {
                                                        const clean = v.replace(/[^a-zA-Z\s]/g, '');
                                                        setNewAddress(prev => ({ ...prev, city: clean }));
                                                        if (addrErrors.city) setAddrErrors(prev => { const n = { ...prev }; delete n.city; return n; });
                                                    }}
                                                    placeholder="City"
                                                    placeholderTextColor={Colors.textSecondary}
                                                />
                                                {addrErrors.city && <Text style={styles.errorText}>{addrErrors.city}</Text>}
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.fieldLabel}>Pincode *</Text>
                                                <TextInput
                                                    style={[styles.input, addrErrors.pincode && { borderColor: '#EF4444' }]}
                                                    value={newAddress.pincode}
                                                    onChangeText={(v) => {
                                                        setNewAddress(prev => ({ ...prev, pincode: v }));
                                                        if (addrErrors.pincode) setAddrErrors(prev => { const n = { ...prev }; delete n.pincode; return n; });
                                                    }}
                                                    placeholder="500001"
                                                    placeholderTextColor={Colors.textSecondary}
                                                    keyboardType="numeric"
                                                    maxLength={6}
                                                />
                                                {addrErrors.pincode && <Text style={styles.errorText}>{addrErrors.pincode}</Text>}
                                            </View>
                                        </View>

                                        <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                                            <Button
                                                label="Save Address"
                                                onPress={handleAddAddress}
                                                loading={addAddressMutation.isPending}
                                                style={{ flex: 2 }}
                                            />
                                            {(addresses ?? []).length > 0 && (
                                                <Button
                                                    label="Cancel"
                                                    onPress={() => {
                                                        setIsAddingAddress(false);
                                                        setEditingAddressId(null);
                                                        setNewAddress({ label: 'HOME', street: '', city: '', state: 'Telangana', pincode: '' });
                                                        setAddrDrafts({
                                                            HOME: { street: '', city: '', pincode: '' },
                                                            WORK: { street: '', city: '', pincode: '' },
                                                            OTHERS: { street: '', city: '', pincode: '' },
                                                        });
                                                    }}
                                                    variant="outline"
                                                    style={{ flex: 1 }}
                                                />
                                            )}
                                        </View>
                                    </View>
                                )}
                            </>
                        )}
                    </View>
                )}

                {/* ──────────────────────── STEP: Doctor Selection ──────────────────────── */}
                {step === 'doctor' && (
                    <View style={styles.stepContent}>
                        <Text style={styles.stepTitle}>👨‍⚕️ Choose your Expert</Text>
                        <Text style={styles.stepSubtitle}>Select your preferred professional for this service</Text>

                        {staffLoading ? (
                            <ActivityIndicator color={Colors.primary} style={{ marginTop: 24 }} />
                        ) : (staff ?? []).length === 0 ? (
                            <View style={styles.noAddrBox}>
                                <Text style={styles.noAddrIcon}>🔍</Text>
                                <Text style={styles.noAddrTitle}>No experts found</Text>
                                <Text style={styles.noAddrSub}>We'll assign the best available expert for you automatically.</Text>
                                <Button
                                    label="Proceed with Auto-Assign"
                                    onPress={() => setStep('schedule')}
                                    variant="outline"
                                    size="md"
                                    style={{ marginTop: 12 }}
                                />
                            </View>
                        ) : (
                            <View style={{ gap: 12 }}>
                                {(staff ?? []).map((doc: any) => (
                                    <View key={doc._id} style={selectedDoctorId === doc._id ? styles.selectedDoctorWrapper : { marginBottom: 12 }}>
                                        <View style={{ width: '100%' }}>
                                            <DoctorCard
                                                name={doc.name}
                                                specialization={doc.specialization?.[0] || 'Medical Expert'}
                                                rating={doc.rating || 4.8}
                                                experience={doc.startExperience ? `${new Date().getFullYear() - new Date(doc.startExperience).getFullYear()} yrs` : '5 yrs'}
                                                price={doc.consultationFee || 500}
                                                onPress={() => setSelectedDoctorId(doc._id)}
                                                fullWidth={true}
                                            />
                                        </View>
                                        {selectedDoctorId === doc._id && (
                                            <View style={styles.selectionIndicator}>
                                                <Text style={styles.selectionCheck}>✓ Selected</Text>
                                            </View>
                                        )}
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>
                )}

                {/* ──────────────────────── STEP 2: Schedule ──────────────────────── */}
                {step === 'schedule' && (
                    <View style={styles.stepContent}>
                        <Text style={styles.stepTitle}>⏰ When do you need it?</Text>

                        {/* ASAP Toggle - Hidden for Hospital Visit */}
                        {service?.fulfillmentMode !== 'HOSPITAL_VISIT' && !(subName && /hospital/i.test(subName)) && (
                            <TouchableOpacity
                                style={[styles.asapToggle, isAsap && styles.asapToggleActive]}
                                onPress={() => {
                                    setIsAsap(true);
                                    setScheduledDate('');
                                    setScheduledTime('');
                                }}
                            >
                                <View style={styles.asapToggleHeader}>
                                    <Ionicons name="flash" size={20} color={isAsap ? '#fff' : Colors.primary} />
                                    <Text style={[styles.asapToggleTitle, isAsap && { color: '#fff' }]}>As Soon As Possible</Text>
                                </View>
                                <Text style={[styles.asapToggleSub, isAsap && { color: 'rgba(255,255,255,0.8)' }]}>
                                    We'll dispatch the nearest expert immediately (usually 30-60 mins)
                                </Text>
                            </TouchableOpacity>
                        )}

                        <Text style={[styles.fieldLabel, { marginTop: 20 }]}>Or Schedule for later</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScroll}>
                            {dates.map((d) => (
                                <TouchableOpacity
                                    key={d.full}
                                    style={[
                                        styles.dateChip,
                                        !isAsap && scheduledDate === d.full && styles.dateChipActive
                                    ]}
                                    onPress={() => {
                                        setIsAsap(false);
                                        setScheduledDate(d.full);
                                    }}
                                >
                                    <Text style={[styles.dateChipDay, !isAsap && scheduledDate === d.full && { color: '#fff' }]}>{d.dayName}</Text>
                                    <Text style={[styles.dateChipNum, !isAsap && scheduledDate === d.full && { color: '#fff' }]}>{d.dayNum}</Text>
                                    <Text style={[styles.dateChipMonth, !isAsap && scheduledDate === d.full && { color: '#fff' }]}>{d.month}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        {!isAsap && (
                            <>
                                <Text style={styles.fieldLabel}>Preferred Time Slot</Text>
                                <View style={styles.timeGrid}>
                                    {timeSlots.map((slot) => (
                                        <TouchableOpacity
                                            key={slot}
                                            style={[
                                                styles.timeChip,
                                                scheduledTime === slot && styles.timeChipActive
                                            ]}
                                            onPress={() => setScheduledTime(slot)}
                                        >
                                            <Text style={[styles.timeChipText, scheduledTime === slot && { color: '#fff' }]}>
                                                {slot}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </>
                        )}

                        <Text style={[styles.fieldLabel, { marginTop: 24 }]}>Special Instructions (optional)</Text>
                        <TextInput
                            style={[styles.input, styles.inputMultiline]}
                            placeholder="Any specific requirements or medical conditions…"
                            placeholderTextColor={Colors.muted}
                            value={notes}
                            onChangeText={setNotes}
                            multiline
                            numberOfLines={3}
                        />
                    </View>
                )}

                {/* ──────────────────────── STEP 3: Payment ──────────────────────── */}
                {step === 'payment' && (
                    <View style={styles.stepContent}>
                        <Text style={styles.stepTitle}>💳 Payment Method</Text>
                        <Text style={styles.stepSubtitle}>Select how you'd like to pay</Text>

                        {/* Wallet Option */}
                        <TouchableOpacity
                            style={[styles.payMethodCard, paymentMethod === 'WALLET' ? styles.payMethodActive : {}]}
                            onPress={() => setPaymentMethod('WALLET')}
                        >
                            <View style={[styles.radioOuter, paymentMethod === 'WALLET' ? styles.radioActive : {}]}>
                                {paymentMethod === 'WALLET' && <View style={styles.radioInner} />}
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.payMethodTitle}>A1 Wallet</Text>
                                <Text style={styles.payMethodSub}>Balance: {formatCurrency(wallet?.balance ?? 0)}</Text>
                            </View>
                            <Text style={{ fontSize: 26 }}>👛</Text>
                        </TouchableOpacity>

                        {/* COD Option */}
                        <TouchableOpacity
                            style={[styles.payMethodCard, paymentMethod === 'COD' ? styles.payMethodActive : {}]}
                            onPress={() => setPaymentMethod('COD')}
                        >
                            <View style={[styles.radioOuter, paymentMethod === 'COD' ? styles.radioActive : {}]}>
                                {paymentMethod === 'COD' && <View style={styles.radioInner} />}
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.payMethodTitle}>Cash on Delivery (COD)</Text>
                                <Text style={styles.payMethodSub}>Pay directly to the provider after service</Text>
                            </View>
                            <Text style={{ fontSize: 26 }}>💵</Text>
                        </TouchableOpacity>

                        {/* Online Option */}
                        <TouchableOpacity
                            style={[styles.payMethodCard, paymentMethod === 'ONLINE' ? styles.payMethodActive : {}]}
                            onPress={() => setPaymentMethod('ONLINE')}
                        >
                            <View style={[styles.radioOuter, paymentMethod === 'ONLINE' ? styles.radioActive : {}]}>
                                {paymentMethod === 'ONLINE' && <View style={styles.radioInner} />}
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.payMethodTitle}>Online Payment</Text>
                                <Text style={styles.payMethodSub}>Easy payment via UPI, Card or Netbanking</Text>
                            </View>
                            <Text style={{ fontSize: 26 }}>💳</Text>
                        </TouchableOpacity>

                        {paymentMethod === 'COD' ? (
                            <View style={styles.codInfoBox}>
                                <Text style={styles.codInfoTitle}>How COD works</Text>
                                {[
                                    '1. Book your service (no payment now)',
                                    '2. A professional is assigned and comes to you',
                                    '3. Service is completed',
                                    '4. Pay cash to the provider',
                                ].map((line) => (
                                    <Text key={line} style={styles.codInfoLine}>{line}</Text>
                                ))}
                            </View>
                        ) : (
                            <View style={[styles.codInfoBox, { borderColor: Colors.primary, backgroundColor: Colors.primaryLight + '10' }]}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                    <Text style={[styles.codInfoTitle, { color: Colors.primary, marginBottom: 0 }]}>Wallet Payment</Text>
                                    {(wallet?.balance ?? 0) < (priceParam ? parseFloat(priceParam) : 0) && (
                                        <TouchableOpacity
                                            onPress={() => router.push('/wallet')}
                                            style={styles.topUpBadge}
                                        >
                                            <Text style={styles.topUpBadgeText}>+ Top up</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                                {(wallet?.balance ?? 0) < (priceParam ? parseFloat(priceParam) : 0) ? (
                                    <Text style={[styles.codInfoLine, { color: Colors.emergency, fontWeight: '600' }]}>
                                        ⚠️ Low Balance: You need {formatCurrency((priceParam ? parseFloat(priceParam) : 0) - (wallet?.balance ?? 0))} more in your wallet to book this service.
                                    </Text>
                                ) : (
                                    <Text style={styles.codInfoLine}>The amount will be instantly deducted from your A1 Wallet balance upon booking confirmation.</Text>
                                )}
                            </View>
                        )}
                    </View>
                )}

                {/* ─────────────────────── STEP 4: Review ─────────────────────────── */}
                {step === 'confirm' && (
                    <View style={styles.stepContent}>
                        <Text style={styles.stepTitle}>📋 Review Your Booking</Text>
                        <Text style={styles.stepSubtitle}>Confirm the details before booking</Text>

                        <View style={styles.reviewCard}>
                            {[
                                { label: 'Service', value: serviceName },
                                {
                                    label: 'Address',
                                    value: (() => {
                                        const a = addresses?.find((x) => x._id === selectedAddressId);
                                        if (!a) return 'Not selected';
                                        return `${a.moreInfo || a.street}${a.city ? ', ' + a.city : ''}${a.pincode ? ' - ' + a.pincode : ''}`;
                                    })(),
                                },
                                { label: 'Schedule', value: getDisplaySchedule() },
                                { label: 'Payment', value: paymentMethod === 'WALLET' ? '👛 A1 Wallet' : '💵 Cash on Delivery' },
                            ].map((r) => (
                                <View key={r.label} style={styles.reviewRow}>
                                    <Text style={styles.reviewLabel}>{r.label}</Text>
                                    <Text style={styles.reviewValue} numberOfLines={2}>{r.value}</Text>
                                </View>
                            ))}
                            {notes ? (
                                <View style={styles.reviewRow}>
                                    <Text style={styles.reviewLabel}>Notes</Text>
                                    <Text style={[styles.reviewValue, { flex: 1 }]}>{notes}</Text>
                                </View>
                            ) : null}
                        </View>

                        <View style={styles.disclaimerBox}>
                            <Text style={styles.disclaimerText}>
                                By confirming, you agree to our Terms of Service. You can cancel anytime before the provider is dispatched.
                            </Text>
                        </View>
                    </View>
                )}

                <View style={{ height: 120 }} />
            </ScrollView>

            {/* Bottom CTA */}
            <View style={styles.footer}>
                <Button
                    label={
                        step === 'confirm' ? 'Confirm Booking'
                            : activeSteps.indexOf(step as Step) === activeSteps.length - 2 ? 'Review Booking →'
                                : 'Continue →'
                    }
                    onPress={() => {
                        if (step === 'doctor') {
                            if (!selectedDoctorId) {
                                Alert.alert('Select Expert', 'Please select an expert to proceed.');
                                return;
                            }
                        } else if (step === 'address') {
                            if (!selectedAddressId && (addresses ?? []).length > 0) {
                                Alert.alert('Select Address', 'Please select a service address to continue.');
                                return;
                            }
                        } else if (step === 'schedule') {
                            if (!isAsap) {
                                if (!scheduledDate) {
                                    Alert.alert('Select Date', 'Please select a date for your appointment.');
                                    return;
                                }
                                if (!scheduledTime) {
                                    Alert.alert('Select Time', 'Please select a time slot to proceed.');
                                    return;
                                }
                            }
                        } else if (step === 'payment') {
                            const balance = wallet?.balance ?? 0;
                            const total = priceParam ? parseFloat(priceParam) : 0;
                            if (paymentMethod === 'WALLET' && balance < total) {
                                Alert.alert(
                                    'Insufficient Balance',
                                    `Your balance (${formatCurrency(balance)}) is less than the service price (${formatCurrency(total)}).`,
                                    [
                                        { text: 'Cancel', style: 'cancel' },
                                        { text: 'Add Money', onPress: () => router.push('/wallet') }
                                    ]
                                );
                                return;
                            }
                        }

                        if (step === 'confirm') {
                            handleFinalSubmit();
                        } else {
                            const idx = activeSteps.indexOf(step as Step);
                            if (idx < activeSteps.length - 1) {
                                setStep(activeSteps[idx + 1]);
                            }
                        }
                    }}
                    loading={bookMutation.isPending || submittingOnline}
                    variant="primary"
                    size="lg"
                    fullWidth
                    disabled={bookMutation.isPending || submittingOnline}
                />
                {step === 'confirm' && (
                    <Text style={styles.footerNote}>
                        {paymentMethod === 'WALLET' ? 'Amount will be deducted from your wallet' : paymentMethod === 'ONLINE' ? 'You will be redirected to Easebuzz gateway' : 'No advance payment required · COD'}
                    </Text>
                )}
            </View>
        </SafeAreaView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: Colors.background },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: Colors.card,
        ...Shadows.card,
    },
    backBtn: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: Colors.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    backText: { fontSize: 20, color: Colors.textPrimary },
    headerTitle: {
        flex: 1,
        fontSize: FontSize.lg,
        fontWeight: '700',
        color: Colors.textPrimary,
        textAlign: 'center',
    },

    // Step indicator
    stepWrap: {
        backgroundColor: Colors.card,
        paddingHorizontal: 16,
        paddingBottom: 16,
        paddingTop: 8,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    stepRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    stepItem: { alignItems: 'center', gap: 4 },
    stepDot: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: Colors.border,
        justifyContent: 'center',
        alignItems: 'center',
    },
    stepDotActive: { backgroundColor: Colors.primary },
    stepDotDone: { backgroundColor: Colors.health },
    stepDotNum: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary },
    stepDotNumActive: { color: '#fff' },
    stepDotCheckmark: { fontSize: 12, fontWeight: '700', color: '#fff' },
    stepLabel: { fontSize: 9, color: Colors.textSecondary, fontWeight: '600' },
    stepLabelActive: { color: Colors.primary },
    stepLine: { flex: 1, height: 2, backgroundColor: Colors.border, marginTop: -14 },
    stepLineDone: { backgroundColor: Colors.health },

    scroll: { paddingBottom: 120 },
    stepContent: { padding: 16, paddingTop: 20 },
    stepTitle: {
        fontSize: FontSize['2xl'],
        fontWeight: '700',
        color: Colors.textPrimary,
        marginBottom: 6,
    },
    stepSubtitle: {
        fontSize: FontSize.sm,
        color: Colors.textSecondary,
        lineHeight: 20,
        marginBottom: 20,
    },

    // Address
    addressCard: {
        backgroundColor: Colors.card,
        borderRadius: 14,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        marginBottom: 10,
        borderWidth: 1.5,
        borderColor: Colors.border,
        ...Shadows.card,
    },
    addressCardActive: { borderColor: Colors.primary, backgroundColor: '#F0F7FF' },
    radioOuter: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: Colors.border,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 1,
    },
    radioActive: { borderColor: Colors.primary },
    radioInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: Colors.primary,
    },
    addrLabel: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.primary, marginBottom: 2 },
    addrStreet: { fontSize: FontSize.base, color: Colors.textPrimary, fontWeight: '500', lineHeight: 22 },
    addrCity: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
    primaryBadge: {
        backgroundColor: Colors.primaryLight,
        borderRadius: 20,
        paddingHorizontal: 8,
        paddingVertical: 4,
        alignSelf: 'flex-start',
    },
    primaryBadgeText: { fontSize: 10, fontWeight: '700', color: Colors.primary },

    addrActions: {
        flexDirection: 'row',
        gap: 8,
        marginLeft: 10,
    },
    addrActionBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F8FAFC',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },

    addAddrMiniBtn: {
        paddingVertical: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.primary,
        borderStyle: 'dashed',
        borderRadius: 12,
        marginTop: 8,
    },
    addAddrMiniText: {
        fontSize: FontSize.sm,
        color: Colors.primary,
        fontWeight: '700',
    },
    addAddrForm: {
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 16,
        marginTop: 10,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    formTitle: {
        fontSize: FontSize.base,
        fontWeight: '800',
        color: Colors.textPrimary,
        marginBottom: 16,
    },
    errorText: {
        fontSize: 10,
        color: '#EF4444',
        marginTop: 4,
        fontWeight: '700',
    },
    labelChips: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 8,
        marginBottom: 16,
    },
    labelChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#F1F5F9',
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
    },
    labelChipActive: {
        backgroundColor: Colors.primaryLight,
        borderColor: Colors.primary,
    },
    labelChipText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#64748B',
    },
    labelChipTextActive: {
        color: Colors.primary,
    },

    noAddrBox: {
        alignItems: 'center',
        paddingVertical: 32,
        gap: 8,
    },
    noAddrIcon: { fontSize: 44 },
    noAddrTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary },
    noAddrSub: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },

    // Fields
    fieldLabel: {
        fontSize: FontSize.sm,
        fontWeight: '700',
        color: Colors.textPrimary,
        marginBottom: 8,
        marginTop: 4,
    },
    input: {
        backgroundColor: Colors.card,
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 13,
        fontSize: FontSize.base,
        color: Colors.textPrimary,
        borderWidth: 1.5,
        borderColor: Colors.border,
        marginBottom: 14,
        ...Shadows.card,
    },
    inputMultiline: { height: 90, textAlignVertical: 'top', paddingTop: 13 },

    asapInfo: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        backgroundColor: '#F0F7FF',
        borderRadius: 12,
        padding: 12,
        marginTop: 4,
    },
    asapToggle: {
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        marginTop: 12,
    },
    asapToggleActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    asapToggleHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    asapToggleTitle: {
        fontSize: FontSize.base,
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    asapToggleSub: {
        fontSize: 11,
        color: Colors.textSecondary,
        lineHeight: 16,
    },
    dateScroll: {
        marginTop: 12,
        marginBottom: 20,
    },
    dateChip: {
        width: 65,
        height: 85,
        backgroundColor: '#fff',
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
    },
    dateChipActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    dateChipDay: {
        fontSize: 10,
        fontWeight: '600',
        color: '#64748B',
        textTransform: 'uppercase',
    },
    dateChipNum: {
        fontSize: 20,
        fontWeight: '800',
        color: Colors.textPrimary,
        marginVertical: 2,
    },
    dateChipMonth: {
        fontSize: 10,
        fontWeight: '600',
        color: '#64748B',
    },
    timeGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 12,
    },
    timeChip: {
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: '#fff',
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        minWidth: '22%',
        alignItems: 'center',
    },
    timeChipActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    timeChipText: {
        fontSize: 10,
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    asapIcon: { fontSize: 18 },
    asapText: { flex: 1, fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 18 },

    topUpBadge: {
        backgroundColor: Colors.primary,
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 20,
    },
    topUpBadgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '700',
    },

    // Payment
    payMethodCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: Colors.card,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1.5,
        borderColor: Colors.border,
        ...Shadows.card,
    },
    payMethodActive: { borderColor: Colors.health, backgroundColor: '#F0FDF4' },
    payMethodDisabled: { opacity: 0.6 },
    payMethodTitle: { fontSize: FontSize.base, fontWeight: '700', color: Colors.textPrimary, marginBottom: 3 },
    payMethodSub: { fontSize: FontSize.xs, color: Colors.textSecondary },
    comingSoonBadge: {
        backgroundColor: '#D1D5DB',
        borderRadius: 20,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    comingSoonBadgeText: { fontSize: 10, fontWeight: '700', color: '#4B5563' },

    codInfoBox: {
        backgroundColor: '#F0FDF4',
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: '#BBEAD1',
        gap: 6,
    },
    codInfoTitle: { fontSize: FontSize.sm, fontWeight: '700', color: '#166534', marginBottom: 6 },
    codInfoLine: { fontSize: FontSize.sm, color: Colors.textPrimary, lineHeight: 22 },

    // Review
    reviewCard: {
        backgroundColor: Colors.card,
        borderRadius: 16,
        overflow: 'hidden',
        ...Shadows.card,
        marginBottom: 14,
    },
    reviewRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
        gap: 12,
    },
    reviewLabel: { fontSize: FontSize.sm, color: Colors.textSecondary, flexShrink: 0, width: 75 },
    reviewValue: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textPrimary, textAlign: 'right', flex: 1 },

    disclaimerBox: { padding: 12 },
    disclaimerText: { fontSize: FontSize.xs, color: Colors.muted, textAlign: 'center', lineHeight: 18 },

    // Footer
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: Colors.card,
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 32,
        ...Shadows.float,
        gap: 8,
    },
    footerNote: {
        textAlign: 'center',
        fontSize: FontSize.xs,
        color: Colors.textSecondary,
    },

    // Success screen
    successContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
        backgroundColor: Colors.background,
    },
    successIconBg: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#F0FDF4',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    successTitle: {
        fontSize: FontSize['3xl'],
        fontWeight: '700',
        color: Colors.textPrimary,
        marginBottom: 10,
        textAlign: 'center',
    },
    successSub: {
        fontSize: FontSize.base,
        color: Colors.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 24,
    },
    codConfirmBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: '#F0FDF4',
        borderRadius: 14,
        padding: 14,
        marginBottom: 28,
        borderWidth: 1,
        borderColor: '#BBEAD1',
        alignSelf: 'stretch',
    },
    codConfirmIcon: { fontSize: 28 },
    codConfirmTitle: { fontSize: FontSize.base, fontWeight: '700', color: '#166534' },
    codConfirmSub: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },

    // OP Ticket
    opTicketCard: {
        backgroundColor: Colors.card,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: Colors.border,
        width: '100%',
        marginTop: 24,
        marginBottom: 24,
        overflow: 'hidden',
        borderStyle: 'dashed',
    },
    opTicketHeader: {
        backgroundColor: '#F8FAFC',
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    opTicketLabel: {
        fontSize: 10,
        fontWeight: '800',
        color: Colors.muted,
        letterSpacing: 1,
    },
    opTicketHospital: {
        fontSize: FontSize.base,
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    opTicketDivider: {
        height: 1,
        backgroundColor: Colors.border,
        marginHorizontal: 16,
    },
    opTicketBody: {
        padding: 20,
    },
    opTicketRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    opInfoLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: Colors.textSecondary,
        marginBottom: 4,
    },
    opInfoValue: {
        fontSize: FontSize.sm,
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    opTicketFooter: {
        padding: 12,
        backgroundColor: '#F0F9FF',
        alignItems: 'center',
    },
    opFooterText: {
        fontSize: FontSize.xs,
        color: Colors.primary,
        fontWeight: '600',
    },

    // Info step styles
    card: {
        backgroundColor: Colors.card,
        borderRadius: 24,
        padding: 24,
        ...Shadows.card,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    heroSection: {
        alignItems: 'center',
        marginBottom: 32,
    },
    heroIconBg: {
        width: 100,
        height: 100,
        borderRadius: 35,
        backgroundColor: '#F0F7FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        ...Shadows.float,
    },
    heroTitle: {
        fontSize: 26,
        fontWeight: '900',
        color: Colors.textPrimary,
        textAlign: 'center',
        marginBottom: 12,
        letterSpacing: -0.5,
    },
    heroDesc: {
        fontSize: 15,
        color: Colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
        fontWeight: '500',
    },
    infoGrid: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 12,
    },
    infoItem: {
        flex: 1,
        backgroundColor: '#F8FAFC',
        padding: 16,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    infoLabel: {
        fontSize: 10,
        fontWeight: '800',
        color: Colors.muted,
        marginBottom: 6,
        letterSpacing: 0.5,
    },
    infoValue: {
        fontSize: 15,
        fontWeight: '700',
        color: Colors.textPrimary,
    },

    // Doctor Selection styles
    selectedDoctorWrapper: {
        marginBottom: 12,
        borderRadius: 24,
        borderWidth: 2,
        borderColor: Colors.primary,
        backgroundColor: '#F0F7FF',
        overflow: 'hidden',
    },
    selectionIndicator: {
        backgroundColor: Colors.primary,
        paddingVertical: 4,
        alignItems: 'center',
    },
    selectionCheck: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '800',
    },
});
