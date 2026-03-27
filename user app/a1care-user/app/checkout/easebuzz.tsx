import React, { useState, useRef } from "react";
import { View, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { WebView } from "react-native-webview";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { paymentService } from "../../services/payment.service";

export default function EasebuzzCheckout() {
    const router = useRouter();
    const params = useLocalSearchParams() as any;
    const [loading, setLoading] = useState(true);
    const webViewRef = useRef<WebView>(null);

    // Easebuzz requires a POST request with the specific parameters
    // Since we're in a browser/webview, we can inject a script to submit a form automatically
    const accessKey = params.accessKey;
    const checkoutUrl = params.env === 'prod' 
        ? `https://pay.easebuzz.in/pay/${accessKey}`
        : `https://testpay.easebuzz.in/pay/${accessKey}`;

    const handleNavigationStateChange = (navState: any) => {
        const { url } = navState;
        console.log("Navigating to:", url);
        
        // Detection of Success or Failure
        if (url.includes('gateway-response') || url.includes('success') || url.includes('failure')) {
            // Give it a moment to let the backend process the redirect or inquiry
            setTimeout(async () => {
                try {
                    const orderStatus = await paymentService.verifyPayment(params.orderId);
                    
                    router.replace({
                        pathname: "/checkout/status",
                        params: {
                            status: orderStatus.status,
                            txnId: orderStatus.txnId,
                            amount: orderStatus.amount,
                            type: orderStatus.type
                        }
                    });
                } catch (err) {
                    router.replace("/wallet");
                }
            }, 2000); // Increased timeout slightly for reliable inquiry
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.container}>
                <WebView
                    ref={webViewRef}
                    source={{ uri: checkoutUrl }}
                    onNavigationStateChange={handleNavigationStateChange}
                    onLoadEnd={() => setLoading(false)}
                    style={{ flex: 1 }}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                    originWhitelist={['*']}
                    mixedContentMode="always"
                />
                {loading && (
                    <View style={styles.loader}>
                        <ActivityIndicator size="large" color="#1A7FD4" />
                    </View>
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#fff" },
    loader: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.7)",
    },
});
