import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  SafeAreaView,
  StatusBar,
  FlatList,
  RefreshControl,
} from 'react-native';
import { Button } from 'react-native-paper';
import * as Location from 'expo-location';
import NetInfo from '@react-native-community/netinfo';
import EvacMap from '../components/EvacMap';
import {
  getAvailableTrips,
  acceptTrip,
  AvailableTrip,
  calculateRouteToPickup,
  RoutePoint,
} from '../services/trips';
import { clearSession } from '../services/auth';
import { router } from 'expo-router';
import AppBackButton from '../components/AppBackButton';

export default function DriverScreen() {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [trips, setTrips] = useState<AvailableTrip[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [loadingTrips, setLoadingTrips] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [activeRoute, setActiveRoute] = useState<RoutePoint[]>([]);
  const [activeDestination, setActiveDestination] = useState<{ latitude: number; longitude: number } | null>(null);
  const [routeSummary, setRouteSummary] = useState('');

  const fetchTrips = useCallback(async () => {
    setLoadingTrips(true);
    setError('');
    try {
      const data = await getAvailableTrips(location);
      setTrips(data);
      setSelectedTripId((current) => {
        if (data.length === 0) return null;
        if (current && data.some((trip) => trip._id === current)) return current;
        return data[0]._id;
      });
    } catch (e: any) {
      setError(e.message ?? 'Could not load trips');
    } finally {
      setLoadingTrips(false);
    }
  }, [location]);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({});
      setLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
    })();

    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOffline(!state.isConnected);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  async function handleAccept(tripId: string) {
    setAcceptingId(tripId);
    setError('');
    const selectedTrip = trips.find((trip) => trip._id === tripId) ?? null;
    try {
      await acceptTrip(tripId);
      if (selectedTrip?.pickup_loc?.coordinates?.length === 2 && location) {
        const pickup = {
          lat: selectedTrip.pickup_loc.coordinates[1],
          lng: selectedTrip.pickup_loc.coordinates[0],
        };
        const routeToPickup = await calculateRouteToPickup(location, pickup);
        setActiveRoute(routeToPickup.points);
        setActiveDestination({ latitude: pickup.lat, longitude: pickup.lng });
        setRouteSummary(
          routeToPickup.routeRisk
            ? `Navigation started · ${routeToPickup.routeRisk.toUpperCase()} risk`
            : 'Navigation started to pickup pin'
        );
      } else if (selectedTrip?.pickup_loc?.coordinates?.length === 2) {
        setActiveDestination({
          latitude: selectedTrip.pickup_loc.coordinates[1],
          longitude: selectedTrip.pickup_loc.coordinates[0],
        });
        setRouteSummary('Ride accepted · pickup location selected on map');
      }
      setTrips((prev) => prev.filter((t) => t._id !== tripId));
      setSelectedTripId((current) => (current === tripId ? null : current));
    } catch (e: any) {
      setError(e.message ?? 'Could not accept trip');
    } finally {
      setAcceptingId(null);
    }
  }

  async function handleLogout() {
    await clearSession();
    router.replace('/');
  }

  const tripMarkers = useMemo(() => (
    trips
      .filter((trip) => Array.isArray(trip.pickup_loc?.coordinates) && trip.pickup_loc.coordinates.length === 2)
      .map((trip) => ({
        id: trip._id,
        title: `${trip.passengers} passenger${trip.passengers === 1 ? '' : 's'}`,
        description: trip.notes || 'Evacuation request pickup',
        coordinate: {
          latitude: trip.pickup_loc.coordinates[1],
          longitude: trip.pickup_loc.coordinates[0],
        },
      }))
  ), [trips]);

  const mapTripMarkers = useMemo(() => {
    if (!activeDestination) return tripMarkers;
    return [
      ...tripMarkers,
      {
        id: 'active-destination',
        title: 'Active Pickup',
        description: 'Current accepted trip destination',
        coordinate: activeDestination,
      },
    ];
  }, [tripMarkers, activeDestination]);

  const focusedLocation = useMemo(() => {
    if (activeDestination) return activeDestination;
    const selected = trips.find((trip) => trip._id === selectedTripId);
    if (!selected?.pickup_loc?.coordinates || selected.pickup_loc.coordinates.length !== 2) return null;
    return {
      latitude: selected.pickup_loc.coordinates[1],
      longitude: selected.pickup_loc.coordinates[0],
    };
  }, [trips, selectedTripId, activeDestination]);

  function renderTrip({ item }: { item: AvailableTrip }) {
    const [lng, lat] = item.pickup_loc.coordinates;
    const isSelected = selectedTripId === item._id;
    return (
      <View style={[styles.tripCard, isSelected ? styles.tripCardSelected : null]}>
        <View style={styles.tripHeader}>
          <View style={styles.tripBadge}>
            <Text style={styles.tripBadgeText}>{item.passengers}</Text>
            <Text style={styles.tripBadgeLabel}>pax</Text>
          </View>
          <View style={styles.tripInfo}>
            <Text style={styles.tripCoords}>
              {lat.toFixed(4)}°N  {Math.abs(lng).toFixed(4)}°{lng < 0 ? 'W' : 'E'}
            </Text>
            {item.accessibility_needs ? (
              <Text style={styles.tripTag}>♿ {item.accessibility_needs}</Text>
            ) : null}
            {item.notes ? (
              <Text style={styles.tripNotes} numberOfLines={2}>{item.notes}</Text>
            ) : null}
          </View>
        </View>
        <Button
          mode="outlined"
          onPress={() => setSelectedTripId(item._id)}
          icon="map-marker"
          style={styles.viewBtn}
          contentStyle={styles.acceptBtnContent}
          labelStyle={styles.viewBtnLabel}
        >
          View on Map
        </Button>
        <Button
          mode="contained"
          onPress={() => handleAccept(item._id)}
          loading={acceptingId === item._id}
          disabled={acceptingId !== null}
          icon="check-circle"
          style={styles.acceptBtn}
          contentStyle={styles.acceptBtnContent}
          labelStyle={styles.acceptBtnLabel}
        >
          Accept
        </Button>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar backgroundColor="#0D1B2A" barStyle="light-content" />
      <AppBackButton floating fallbackHref="/" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.appName}>EvacAssist</Text>
          <Text style={styles.driverBadge}>DRIVER MODE</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={[styles.statusPill, isOffline ? styles.pillOffline : styles.pillOnline]}>
            <View style={[styles.statusDot, isOffline ? styles.dotOffline : styles.dotOnline]} />
            <Text style={styles.statusPillText}>{isOffline ? 'Offline' : 'Online'}</Text>
          </View>
          <Button
            mode="text"
            onPress={handleLogout}
            labelStyle={styles.logoutLabel}
            compact
          >
            Logout
          </Button>
        </View>
      </View>

      {isOffline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>No connection · Showing cached map</Text>
        </View>
      )}

      {/* Map */}
      <View style={styles.mapContainer}>
        <EvacMap
          userLocation={location}
          tripMarkers={mapTripMarkers}
          focusedLocation={focusedLocation}
          routePath={activeRoute}
        />
      </View>

      {/* Trips panel */}
      <View style={styles.panel}>
        <View style={styles.panelHeader}>
          <Text style={styles.panelTitle}>Available Trips</Text>
          <Button
            mode="text"
            onPress={fetchTrips}
            loading={loadingTrips}
            icon="refresh"
            labelStyle={styles.refreshLabel}
            compact
          >
            Refresh
          </Button>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {routeSummary ? <Text style={styles.routeSummary}>{routeSummary}</Text> : null}

        <FlatList
          data={trips}
          keyExtractor={(item) => item._id}
          renderItem={renderTrip}
          refreshControl={
            <RefreshControl
              refreshing={loadingTrips}
              onRefresh={fetchTrips}
              tintColor="#C62828"
            />
          }
          ListEmptyComponent={
            !loadingTrips ? (
              <Text style={styles.emptyText}>No trips available nearby</Text>
            ) : null
          }
          contentContainerStyle={trips.length === 0 ? styles.emptyContainer : styles.listContent}
          style={styles.list}
        />
      </View>
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
  appName: { color: '#FFFFFF', fontSize: 20, fontWeight: '800', letterSpacing: 0.4 },
  driverBadge: {
    color: '#C62828',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginTop: 2,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },

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
  logoutLabel: { color: '#546E7A', fontSize: 12 },

  offlineBanner: {
    backgroundColor: '#B71C1C',
    paddingVertical: 7,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  offlineText: { color: '#FFCDD2', fontSize: 12 },

  mapContainer: { flex: 1 },

  panel: {
    backgroundColor: '#0F2336',
    borderTopWidth: 1,
    borderTopColor: '#1A2E3F',
    maxHeight: 280,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  panelTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  refreshLabel: { color: '#78909C', fontSize: 12 },

  errorText: { color: '#EF5350', fontSize: 12, paddingHorizontal: 16, marginBottom: 4 },
  routeSummary: { color: '#80DEEA', fontSize: 12, paddingHorizontal: 16, marginBottom: 4 },

  list: { flexGrow: 0 },
  listContent: { padding: 12, gap: 10 },
  emptyContainer: { padding: 24, alignItems: 'center' },
  emptyText: { color: '#546E7A', fontSize: 14 },

  tripCard: {
    backgroundColor: '#0D1B2A',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1A2E3F',
    gap: 10,
    marginBottom: 10,
  },
  tripCardSelected: {
    borderColor: '#42A5F5',
    borderWidth: 2,
  },
  tripHeader: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  tripBadge: {
    backgroundColor: '#C62828',
    borderRadius: 8,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tripBadgeText: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', lineHeight: 22 },
  tripBadgeLabel: { color: '#FFCDD2', fontSize: 9, fontWeight: '600' },
  tripInfo: { flex: 1, gap: 3 },
  tripCoords: { color: '#90A4AE', fontSize: 12, fontFamily: 'monospace' },
  tripTag: { color: '#FFB74D', fontSize: 12 },
  tripNotes: { color: '#78909C', fontSize: 12 },

  acceptBtn: { borderRadius: 8, backgroundColor: '#1B5E20' },
  viewBtn: { borderRadius: 8, borderColor: '#1E88E5' },
  viewBtnLabel: { color: '#90CAF9', fontSize: 13, fontWeight: '700' },
  acceptBtnContent: { paddingVertical: 2 },
  acceptBtnLabel: { fontSize: 14, fontWeight: '700' },
});
