import { useEffect, useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { FAB } from 'react-native-paper';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import NetInfo from '@react-native-community/netinfo';
import EvacMap from '../components/EvacMap';

import { API_URL } from '../constants';
console.log('API_URL:', API_URL);

export default function HomeScreen() {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('Never');

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({});
      setLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
    })();

    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOffline(!state.isConnected);
      if (state.isConnected) setLastSyncTime(new Date().toLocaleTimeString());
    });

    return unsubscribe;
  }, []);

  return (
    <View style={styles.container}>
      {isOffline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>
            📵 Offline — last synced {lastSyncTime}. Showing cached hazard map.
          </Text>
        </View>
      )}

      <EvacMap userLocation={location} />

      <FAB
        icon="car-emergency"
        label="Request Evacuation"
        style={styles.fab}
        onPress={() => router.push('/request')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  offlineBanner: {
    backgroundColor: '#f44336',
    padding: 10,
    alignItems: 'center',
  },
  offlineText: {
    color: '#fff',
    fontSize: 13,
  },
  fab: { position: 'absolute', bottom: 32, alignSelf: 'center' },
});