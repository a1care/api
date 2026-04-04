import "../global.css";
import { useEffect } from "react";
import { Slot, useRouter, useSegments } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Text } from "react-native";
import {
    useFonts,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_900Black,
} from "@expo-google-fonts/inter";
import { useAuthStore } from "../stores/auth";
import { useConfigStore } from "../stores/config.store";
import { ToastProvider } from '../components/CustomToast';
import messaging from '@react-native-firebase/messaging';
import { Alert, PermissionsAndroid, Platform } from "react-native";
import { api } from "../lib/api";

const queryClient = new QueryClient();

function AuthGuard() {
    const { token, user, isLoading, loadFromStorage } = useAuthStore();
    const { fetchConfig, config } = useConfigStore();
    const segments = useSegments();
    const router = useRouter();

    useEffect(() => {
        loadFromStorage();
        fetchConfig();
    }, []);

    const requestUserPermission = async () => {
        try {
            if (Platform.OS === 'android' && Platform.Version >= 33) {
                const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
                );
                if (granted !== PermissionsAndroid.RESULTS.GRANTED) return;
            }

            const authStatus = await messaging().requestPermission();
            const enabled =
                authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
                authStatus === messaging.AuthorizationStatus.PROVISIONAL;

            if (enabled) {
                const fcmToken = await messaging().getToken();
                if (fcmToken) {
                    await api.put('/doctor/auth/fcm-token', { fcmToken });
                }
            }
        } catch (e) {
            console.log("FCM Registry Error:", e);
        }
    };

    useEffect(() => {
        if (token) {
            requestUserPermission();

            // Foreground listener
            const unsubscribe = messaging().onMessage(async remoteMessage => {
                Alert.alert(
                    remoteMessage.notification?.title || "New Update",
                    remoteMessage.notification?.body || "Tap View to see details",
                    [
                        {
                            text: "View",
                            onPress: () => {
                                if (remoteMessage.data?.screen) {
                                    router.push(remoteMessage.data.screen as any);
                                }
                            }
                        },
                        { text: "Dismiss", style: "cancel" }
                    ]
                );
            });

            // If the app is in dynamic state but backgrounded, and the user taps the notification
            messaging().onNotificationOpenedApp(remoteMessage => {
                console.log('Notification caused app to open from background:', remoteMessage.notification);
                if (remoteMessage.data?.screen) {
                    router.push(remoteMessage.data.screen as any);
                }
            });

            // If the app was completely closed and is opened from a notification
            messaging()
                .getInitialNotification()
                .then(remoteMessage => {
                    if (remoteMessage) {
                        console.log('Notification caused app to open from quit state:', remoteMessage.notification);
                        if (remoteMessage.data?.screen) {
                            setTimeout(() => {
                                router.push(remoteMessage.data?.screen as any);
                            }, 500);
                        }
                    }
                });

            return unsubscribe;
        }
    }, [token]);

    useEffect(() => {
        if (!token) return;
        return messaging().onTokenRefresh(fcmToken => {
            if (fcmToken) {
                api.put('/doctor/auth/fcm-token', { fcmToken });
            }
        });
    }, [token]);

    useEffect(() => {
        if (isLoading) return;

        const isMaintenance = (segments as string[])[0] === 'maintenance';
        if (config?.maintenanceMode) {
            if (!isMaintenance) {
                router.replace('/maintenance' as any);
            }
            return;
        } else if (isMaintenance) {
            router.replace('/(tabs)/home' as any);
            return;
        }

        const currentSegment = segments[0] as string;
        const inAuth = currentSegment === "(auth)";
        const inOnboarding = currentSegment === "onboarding";
        const isPolicyPage = currentSegment === "privacy" || currentSegment === "terms";
        const inRegister = segments[1] as string === "register";

        if (!token && !inAuth && !inOnboarding && !isPolicyPage) {
            router.replace("/(auth)/role-select");
        } else if (token && (inAuth || inOnboarding)) {
            // ONLY redirect to HOME if they are actually registered.
            // If they are NOT registered, let them stay in registration/onboarding.
            if (user?.isRegistered !== false || !inRegister) {
                 if (!inRegister) {
                    router.replace("/(tabs)/home");
                 }
            }
        }
    }, [token, isLoading, segments, config?.maintenanceMode, user?.isRegistered]);

    return <Slot />;
}

export default function RootLayout() {
    const [fontsLoaded] = useFonts({
        Inter_400Regular,
        Inter_500Medium,
        Inter_600SemiBold,
        Inter_700Bold,
        Inter_900Black,
    });

    // if (!fontsLoaded) return null;

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaProvider>
                <QueryClientProvider client={queryClient}>
                    <StatusBar style="dark" />
                    <AuthGuard />
                    <ToastProvider />
                </QueryClientProvider>
            </SafeAreaProvider>
        </GestureHandlerRootView>
    );
}
