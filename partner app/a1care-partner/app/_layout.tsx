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

const queryClient = new QueryClient();

function AuthGuard() {
    const { token, isLoading, loadFromStorage } = useAuthStore();
    const { fetchConfig, config } = useConfigStore();
    const segments = useSegments();
    const router = useRouter();

    useEffect(() => {
        loadFromStorage();
        fetchConfig();
    }, []);

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

        if (!token && !inAuth && !inOnboarding && !isPolicyPage) {
            router.replace("/onboarding");
        } else if (token && (inAuth || inOnboarding)) {
            router.replace("/(tabs)/home");
        }
    }, [token, isLoading, segments, config?.maintenanceMode]);

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
