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
    const html = `
        <html>
            <body onload="document.forms['payment_form'].submit()">
                <form id="payment_form" method="POST" action="${params.env === 'prod' ? 'https://pay.easebuzz.in/payment/initiate' : 'https://testpay.easebuzz.in/payment/initiate'}">
                    <input type="hidden" name="key" value="${params.key}" />
                    <input type="hidden" name="txnid" value="${params.txnid}" />
                    <input type="hidden" name="amount" value="${params.amount}" />
                    <input type="hidden" name="productinfo" value="${params.productinfo}" />
                    <input type="hidden" name="firstname" value="${params.firstname}" />
                    <input type="hidden" name="phone" value="${params.phone}" />
                    <input type="hidden" name="email" value="${params.email}" />
                    <input type="hidden" name="surl" value="${params.surl}" />
                    <input type="hidden" name="furl" value="${params.furl}" />
                    <input type="hidden" name="hash" value="${params.hash}" />
                    <input type="hidden" name="udf1" value="${params.udf1}" />
                </form>
            </body>
        </html>
    `;

    const handleNavigationStateChange = (navState: any) => {
        const { url } = navState;
        
        // Detection of Success or Failure URLs
        if (url.includes(params.surl) || url.includes(params.furl)) {
            // Give it a moment to let the backend process the redirect or webhook
            setTimeout(async () => {
                try {
                    // Always verify with the backend status, don't trust the URL result alone
                    const orderStatus = await paymentService.verifyPayment(params.udf1);
                    
                    if (orderStatus.status === 'SUCCESS') {
                        Alert.alert("Payment Success", "Transaction completed successfully!");
                        router.replace("/wallet");
                    } else {
                        Alert.alert("Payment Failed", "Transaction could not be completed.");
                        router.replace("/wallet");
                    }
                } catch (err) {
                    Alert.alert("Status Unknown", "Check your wallet after a few minutes to confirm.");
                    router.replace("/wallet");
                }
            }, 1000);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.container}>
                <WebView
                    ref={webViewRef}
                    source={{ html }}
                    onNavigationStateChange={handleNavigationStateChange}
                    onLoadEnd={() => setLoading(false)}
                    style={{ flex: 1 }}
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
