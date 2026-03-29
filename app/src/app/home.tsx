import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Text, SafeAreaView, StatusBar } from 'react-native';
import { Button, FAB, Modal, Portal } from 'react-native-paper';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import NetInfo from '@react-native-community/netinfo';
import EvacMap from '../components/EvacMap';
import AppBackButton from '../components/AppBackButton';
import { getMyTrips, type MyTrip } from '../services/trips';

import { API_URL } from '../constants';
console.log('API_URL:', API_URL);

const ACCEPTED_STATUSES = new Set([
  'accepted',
  'driver_assigned',
  'driver_en_route',
  'arrived_pickup',
  'passenger_verified',
  'in_transit',
  'in_progress',
]);

export default function HomeScreen() {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('Never');
  const [acceptedTrip, setAcceptedTrip] = useState<MyTrip | null>(null);
  const [showAcceptedModal, setShowAcceptedModal] = useState(false);
  const seenAcceptedTripIds = useRef(new Set<string>());

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

  useEffect(() => {
    if (isOffline) return;

    let isMounted = true;
    const pollAcceptedTrip = async () => {
      try {
        const trips = await getMyTrips();
        if (!isMounted || !Array.isArray(trips)) return;

        const activeAcceptedTrip = trips.find(
          (trip) => ACCEPTED_STATUSES.has(trip.status) && trip.driver,
        );

        if (!activeAcceptedTrip) return;
        if (seenAcceptedTripIds.current.has(activeAcceptedTrip._id)) return;

        seenAcceptedTripIds.current.add(activeAcceptedTrip._id);
        setAcceptedTrip(activeAcceptedTrip);
        setShowAcceptedModal(true);
      } catch {
        // Ignore periodic fetch errors; polling will retry automatically.
      }
    };

    pollAcceptedTrip();
    const intervalId = setInterval(pollAcceptedTrip, 8000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [isOffline]);

  const driverName = acceptedTrip?.driver?.name || 'Assigned Driver';
  const driverContact = acceptedTrip?.driver?.username || 'Unavailable';
  const vehicleText = acceptedTrip?.driver?.vehicle
    ? `${acceptedTrip.driver.vehicle.make ?? ''} ${acceptedTrip.driver.vehicle.model ?? ''}`.trim() || 'Vehicle details unavailable'
    : 'Vehicle details unavailable';
  const seatsText = acceptedTrip?.driver?.vehicle?.seats ? String(acceptedTrip.driver.vehicle.seats) : 'N/A';

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar backgroundColor="#0D1B2A" barStyle="light-content" />
      <AppBackButton floating fallbackHref="/" />

      <Portal>
        <Modal
          visible={showAcceptedModal}
          onDismiss={() => setShowAcceptedModal(false)}
          contentContainerStyle={styles.acceptedModal}
        >
          <Text style={styles.modalTitle}>Driver Accepted Your Ride</Text>
          <Text style={styles.modalBody}>Driver: {driverName}</Text>
          <Text style={styles.modalBody}>Contact: {driverContact}</Text>
          <Text style={styles.modalBody}>Vehicle: {vehicleText}</Text>
          <Text style={styles.modalBody}>Seats: {seatsText}</Text>
          <Button
            mode="contained"
            style={styles.modalButton}
            onPress={() => setShowAcceptedModal(false)}
          >
            OK
          </Button>
        </Modal>
      </Portal>

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.appName}>EvacAssist</Text>
          <Text style={styles.appTagline}>Emergency Routing System</Text>
        </View>
        <View style={[styles.statusPill, isOffline ? styles.pillOffline : styles.pillOnline]}>
          <View style={[styles.statusDot, isOffline ? styles.dotOffline : styles.dotOnline]} />
          <Text style={styles.statusPillText}>{isOffline ? 'Offline' : 'Online'}</Text>
        </View>
      </View>

      {/* Offline banner */}
      {isOffline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>
            No connection · Last synced {lastSyncTime} · Showing cached map
          </Text>
        </View>
      )}

      {/* Map */}
      <View style={styles.mapContainer}>
        <EvacMap userLocation={location} />
      </View>

      {/* Status strip */}
      <View style={styles.statusStrip}>
        <View style={styles.stripItem}>
          <Text style={styles.stripIcon}>📍</Text>
          <Text style={styles.stripLabel}>{location ? 'GPS Locked' : 'Locating…'}</Text>
        </View>
        <View style={styles.stripDivider} />
        <View style={styles.stripItem}>
          <Text style={styles.stripIcon}>⚠️</Text>
          <Text style={styles.stripLabel}>2 Active Alerts</Text>
        </View>
        <View style={styles.stripDivider} />
        <View style={styles.stripItem}>
          <Text style={styles.stripIcon}>🛡️</Text>
          <Text style={styles.stripLabel}>Routes Ready</Text>
        </View>
      </View>

      <FAB
        icon="car-emergency"
        label="Request Evacuation"
        style={styles.fab}
        color="#FFFFFF"
        onPress={() => router.push('/request')}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0D1B2A' },

  header: {
    backgroundColor: '#0D1B2A',
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  appName: { color: '#FFFFFF', fontSize: 22, fontWeight: '800', letterSpacing: 0.4 },
  appTagline: { color: '#546E7A', fontSize: 11, marginTop: 1 },

  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 5,
    borderWidth: 1,
  },
  pillOnline: { backgroundColor: 'rgba(56, 142, 60, 0.15)', borderColor: '#388E3C' },
  pillOffline: { backgroundColor: 'rgba(211, 47, 47, 0.15)', borderColor: '#D32F2F' },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  dotOnline: { backgroundColor: '#4CAF50' },
  dotOffline: { backgroundColor: '#EF5350' },
  statusPillText: { color: '#E0E0E0', fontSize: 12, fontWeight: '600' },

  offlineBanner: {
    backgroundColor: '#B71C1C',
    paddingVertical: 7,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  offlineText: { color: '#FFCDD2', fontSize: 12 },

  mapContainer: { flex: 1 },

  statusStrip: {
    backgroundColor: '#0D1B2A',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderTopWidth: 1,
    borderTopColor: '#1A2E3F',
  },
  stripItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    justifyContent: 'center',
  },
  stripIcon: { fontSize: 14 },
  stripLabel: { color: '#90A4AE', fontSize: 12 },
  stripDivider: { width: 1, height: 18, backgroundColor: '#1A2E3F' },

  fab: {
    position: 'absolute',
    bottom: 68,
    alignSelf: 'center',
    backgroundColor: '#C62828',
  },
  acceptedModal: {
    marginHorizontal: 20,
    backgroundColor: '#102436',
    borderRadius: 12,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#1F3A50',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  modalBody: {
    color: '#CFD8DC',
    fontSize: 14,
  },
  modalButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#C62828',
  },
});
