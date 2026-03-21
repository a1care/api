import React from 'react';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    useFonts,
} from '@expo-google-fonts/inter';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { useConfigStore } from '@/stores/config.store';
import { useRouter, useSegments } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { Colors } from '@/constants/colors';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 2, // 2 minutes
            retry: 1,
        },
    },
});

function AuthGuard({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, isLoading, user, initialize } = useAuthStore();
    const { fetchConfig, config } = useConfigStore();
    const router = useRouter();
    const segments = useSegments();

    useEffect(() => {
        console.log('[AuthGuard] Initializing...');
        initialize();
        fetchConfig();
    }, []);

    useEffect(() => {
        console.log('[AuthGuard] State Changed:', { isAuthenticated, isLoading, segments, maintenance: config?.maintenanceMode });
        if (isLoading) return;

        const isMaintenancePage = (segments as string[])[0] === 'maintenance';
        if (config?.maintenanceMode) {
            if (!isMaintenancePage) {
                console.log('[AuthGuard] Redirecting to maintenance');
                router.replace('/maintenance' as any);
            }
            return;
        } else if (isMaintenancePage) {
            router.replace('/' as any);
            return;
        }

        const inAuthGroup = (segments as string[])[0] === '(auth)';
        const isAtRoot = !segments.length || (segments as string[])[0] === 'index';

        if (!isAuthenticated && !inAuthGroup && !isAtRoot) {
            console.log('[AuthGuard] Redirecting to login');
            router.replace('/(auth)/login');
        } else if (isAuthenticated && (inAuthGroup || isAtRoot)) {
            // If registered go to tabs; else go to profile setup
            if (user?.isRegistered) {
                console.log('[AuthGuard] Redirecting to tabs');
                router.replace('/(tabs)');
            } else {
                console.log('[AuthGuard] Redirecting to profile-setup');
                router.replace('/(auth)/profile-setup');
            }
        }
    }, [isAuthenticated, isLoading, user, segments, config?.maintenanceMode]);

    if (isLoading) {
        console.log('[AuthGuard] Rendering Loading State');
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.primary || '#2F80ED' }}>
                <ActivityIndicator size="large" color="#fff" />
            </View>
        );
    }

    console.log('[AuthGuard] Rendering Children');
    return <>{children}</>;
}

export default function RootLayout() {
    console.log('[RootLayout] Starting...');
    const [fontsLoaded] = useFonts({
        Inter_400Regular,
        Inter_500Medium,
        Inter_600SemiBold,
        Inter_700Bold,
    });

    if (!fontsLoaded) {
        console.log('[RootLayout] Fonts NOT Loaded');
        return (
            <View style={{ flex: 1, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#fff" />
            </View>
        );
    }

    console.log('[RootLayout] Fonts Loaded, Rendering Providers');
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <QueryClientProvider client={queryClient}>
                <AuthGuard>
                    <Stack screenOptions={{ headerShown: false }}>
                        <Stack.Screen name="(auth)" />
                        <Stack.Screen name="(tabs)" />
                        <Stack.Screen name="service/[id]" />
                        <Stack.Screen name="doctor/[id]" />
                        <Stack.Screen name="booking/[id]" />
                        <Stack.Screen name="booking/chat" />
                        <Stack.Screen name="booking/track" />
                        <Stack.Screen name="doctor/appointment" />
                        <Stack.Screen name="wallet/index" />
                        <Stack.Screen name="checkout/easebuzz" />
                        <Stack.Screen name="support/chat" />
                        <Stack.Screen name="profile/health-vault" />
                        <Stack.Screen name="faq" />
                        <Stack.Screen name="privacy" />
                        <Stack.Screen name="terms" />
                        <Stack.Screen name="maintenance" />
                    </Stack>
                </AuthGuard>
            </QueryClientProvider>
        </GestureHandlerRootView>
    );
}
