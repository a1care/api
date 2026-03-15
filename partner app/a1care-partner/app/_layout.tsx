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
    const { fetchConfig } = useConfigStore();
    const segments = useSegments();
    const router = useRouter();

    useEffect(() => {
        loadFromStorage();
        fetchConfig();
    }, []);

    useEffect(() => {
        if (isLoading) return;
        const inAuth = segments[0] === "(auth)";
        const inOnboarding = segments[0] === "onboarding";

        if (!token && !inAuth && !inOnboarding) {
            router.replace("/onboarding");
        } else if (token && (inAuth || inOnboarding)) {
            router.replace("/(tabs)/home");
        }
    }, [token, isLoading, segments]);

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
