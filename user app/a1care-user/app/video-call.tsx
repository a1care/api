import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Alert, TouchableOpacity, Text } from 'react-native';
import AgoraUIKit from 'agora-rn-uikit';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '@/services/api';

/**
 * Screen for Video Consultations using Agora.
 * Requires Agora App ID and Token from backend.
 */
export default function VideoCallScreen() {
  const { channelName, bookingId } = useLocalSearchParams();
  const router = useRouter();
  const [tokenData, setTokenData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchToken() {
      try {
        // Fetch RTC token from our backend
        const res = await api.get(`/agora/token?channelName=${channelName || bookingId}`);
        setTokenData(res.data.data);
      } catch (err: any) {
        console.error("Failed to fetch Agora token", err);
        Alert.alert("Error", err?.response?.data?.message || "Could not start video call. Check server configuration.");
        router.back();
      } finally {
        setLoading(false);
      }
    }
    fetchToken();
  }, [channelName, bookingId]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2D935C" />
        <Text style={{ marginTop: 10 }}>Connecting to secure video server...</Text>
      </View>
    );
  }

  if (!tokenData?.token) {
    return (
      <View style={styles.centered}>
        <Text>Failed to initialize video call.</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={{ color: '#2D935C' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const connectionData = {
    appId: tokenData.appId,
    channel: tokenData.channelName,
    token: tokenData.token,
    uid: tokenData.uid,
  };

  const callbacks = {
    EndCall: () => {
      Alert.alert("Call Ended", "The consultation has finished.");
      router.back();
    },
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.exitButton}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerText}>Video Consultation</Text>
      </View>
      <View style={{ flex: 1 }}>
        <AgoraUIKit connectionData={connectionData} rtcCallbacks={callbacks} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  header: { 
    height: 60, 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 15,
    backgroundColor: 'rgba(0,0,0,0.5)',
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    zIndex: 10,
    borderRadius: 20,
    marginHorizontal: 10
  },
  headerText: { color: '#FFF', fontSize: 18, fontWeight: '700', marginLeft: 15 },
  exitButton: { padding: 5 },
  backButton: { marginTop: 20, padding: 10 }
});
