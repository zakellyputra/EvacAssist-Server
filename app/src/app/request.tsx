import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, TextInput, Text, SegmentedButtons, Snackbar, Card } from 'react-native-paper';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useOfflineDatabase } from '../hooks/useOfflineDatabase';
import NetInfo from '@react-native-community/netinfo';
import { requestEvacuation } from '../services/trips';
import AppBackButton from '../components/AppBackButton';
import MapView, { Marker, UrlTile, PROVIDER_DEFAULT } from 'react-native-maps';

export default function RequestScreen() {
  const { createTrip } = useOfflineDatabase();
  const [passengers, setPassengers] = useState('1');
  const [notes, setNotes] = useState('');
  const [accessibility, setAccessibility] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isOnline, setIsOnline] = useState(true);
  const [pinMode, setPinMode] = useState<'pickup' | 'dropoff'>('pickup');
  const [pickupCoords, setPickupCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [dropoffCoords, setDropoffCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [dropoffDetails, setDropoffDetails] = useState('');

  React.useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected ?? false);
    });
    return unsubscribe;
  }, []);

  React.useEffect(() => {
    (async () => {
      const permission = await Location.getForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        const asked = await Location.requestForegroundPermissionsAsync();
        if (asked.status !== 'granted') return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      setPickupCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      setDropoffCoords((current) => current ?? {
        lat: loc.coords.latitude + 0.01,
        lng: loc.coords.longitude + 0.01,
      });
    })();
  }, []);

  async function submitRequest() {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const netState = await NetInfo.fetch();
      const onlineNow = netState.isConnected ?? false;
      setIsOnline(onlineNow);

      if (!pickupCoords || !dropoffCoords) {
        throw new Error('Please place both pickup and drop-off pins on the map.');
      }

      const pickupPoint = {
        type: 'Point' as const,
        coordinates: [pickupCoords.lng, pickupCoords.lat] as [number, number],
      };
      const dropoffPoint = {
        type: 'Point' as const,
        coordinates: [dropoffCoords.lng, dropoffCoords.lat] as [number, number],
      };
      const normalizedPassengers = passengers === '5+' ? 5 : parseInt(passengers, 10);
      if (!Number.isFinite(normalizedPassengers) || normalizedPassengers < 1) {
        throw new Error('Please select a valid passenger count.');
      }

      const combinedNotes = [notes.trim(), dropoffDetails.trim()]
        .filter(Boolean)
        .join(' | ');

      if (onlineNow) {
        try {
          const remoteTrip = await requestEvacuation({
            pickupLoc: pickupPoint,
            dropoffLoc: dropoffPoint,
            passengers: normalizedPassengers,
            accessibilityNeeds: accessibility || undefined,
            notes: combinedNotes || undefined,
          });

          await createTrip({
            id: remoteTrip.id || undefined,
            serverId: remoteTrip.id || undefined,
            pickupLoc: JSON.stringify(pickupPoint),
            dropoffLoc: JSON.stringify(dropoffPoint),
            passengers: normalizedPassengers,
            accessibilityNeeds: accessibility || undefined,
            notes: combinedNotes || undefined,
            qrToken: remoteTrip.qrToken || undefined,
            syncedToServer: true,
            status: 'pending',
          });

          setSuccess('Evacuation request sent successfully.');
          setPassengers('1');
          setAccessibility('');
          setNotes('');
          setDropoffDetails('');
          return;
        } catch (remoteError: any) {
          const backendMessage = remoteError?.message ?? 'Backend unreachable';
          setError(`Saved offline. Will sync later. ${backendMessage}`);
        }
      }

      await createTrip({
        pickupLoc: JSON.stringify(pickupPoint),
        dropoffLoc: JSON.stringify(dropoffPoint),
        passengers: normalizedPassengers,
        accessibilityNeeds: accessibility || undefined,
        notes: combinedNotes || undefined,
        syncedToServer: false,
      });

      setSuccess('Request saved offline. It will sync when online.');
    } catch (e: any) {
      setError(e.message ?? 'Request failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <AppBackButton fallbackHref="/home" />

      <Card style={styles.card} mode="elevated">
        <Card.Content style={styles.cardContent}>
          <Text variant="titleSmall" style={styles.sectionTitle}>📍 Pickup & Drop-off Pins</Text>
          <Text variant="bodySmall" style={styles.sectionSub}>
            Select a pin mode, then tap the map to place pickup and drop-off points.
          </Text>
          <SegmentedButtons
            value={pinMode}
            onValueChange={(value) => setPinMode(value as 'pickup' | 'dropoff')}
            buttons={[
              { value: 'pickup', label: 'Set Pickup' },
              { value: 'dropoff', label: 'Set Drop-off' },
            ]}
            style={styles.segments}
          />
          <View style={styles.mapWrap}>
            <MapView
              style={styles.map}
              provider={PROVIDER_DEFAULT}
              onPress={(event) => {
                const { latitude, longitude } = event.nativeEvent.coordinate;
                if (pinMode === 'pickup') setPickupCoords({ lat: latitude, lng: longitude });
                else setDropoffCoords({ lat: latitude, lng: longitude });
              }}
              initialRegion={
                pickupCoords
                  ? {
                      latitude: pickupCoords.lat,
                      longitude: pickupCoords.lng,
                      latitudeDelta: 0.04,
                      longitudeDelta: 0.04,
                    }
                  : {
                      latitude: 37.7749,
                      longitude: -122.4194,
                      latitudeDelta: 0.07,
                      longitudeDelta: 0.07,
                    }
              }
            >
              <UrlTile
                urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                maximumZ={19}
                flipY={false}
                tileSize={256}
              />
              {pickupCoords ? (
                <Marker
                  coordinate={{ latitude: pickupCoords.lat, longitude: pickupCoords.lng }}
                  title="Pickup"
                  pinColor="#1565C0"
                />
              ) : null}
              {dropoffCoords ? (
                <Marker
                  coordinate={{ latitude: dropoffCoords.lat, longitude: dropoffCoords.lng }}
                  title="Drop-off"
                  pinColor="#2E7D32"
                />
              ) : null}
            </MapView>
          </View>
        </Card.Content>
      </Card>

      {/* Connection status banner */}
      <View style={[styles.statusBanner, isOnline ? styles.bannerOnline : styles.bannerOffline]}>
        <Text style={styles.statusBannerText}>
          {isOnline
            ? '✓  Connected — request will be sent immediately'
            : '⚠  Offline — request will sync when back online'}
        </Text>
      </View>

      {/* Passengers */}
      <Card style={styles.card} mode="elevated">
        <Card.Content style={styles.cardContent}>
          <Text variant="titleSmall" style={styles.sectionTitle}>👥  Passengers</Text>
          <Text variant="bodySmall" style={styles.sectionSub}>How many people need evacuation?</Text>
          <SegmentedButtons
            value={passengers}
            onValueChange={setPassengers}
            buttons={['1', '2', '3', '4', '5+'].map((v) => ({ value: v, label: v }))}
            style={styles.segments}
          />
        </Card.Content>
      </Card>

      {/* Special requirements */}
      <Card style={styles.card} mode="elevated">
        <Card.Content style={styles.cardContent}>
          <Text variant="titleSmall" style={styles.sectionTitle}>♿  Special Requirements</Text>
          <TextInput
            label="Accessibility needs (optional)"
            value={accessibility}
            onChangeText={setAccessibility}
            mode="outlined"
            placeholder="e.g. wheelchair, stretcher, oxygen"
            style={styles.input}
          />
        </Card.Content>
      </Card>

      {/* Notes for driver */}
      <Card style={styles.card} mode="elevated">
        <Card.Content style={styles.cardContent}>
          <Text variant="titleSmall" style={styles.sectionTitle}>📝  Notes for Driver</Text>
          <TextInput
            label="Additional notes (optional)"
            value={notes}
            onChangeText={setNotes}
            mode="outlined"
            placeholder="e.g. rooftop access, bring water, north entrance"
            multiline
            numberOfLines={3}
            style={styles.input}
          />
        </Card.Content>
      </Card>

      <Card style={styles.card} mode="elevated">
        <Card.Content style={styles.cardContent}>
          <Text variant="titleSmall" style={styles.sectionTitle}>📌 Drop-off Details</Text>
          <TextInput
            label="Drop-off landmark / destination details"
            value={dropoffDetails}
            onChangeText={setDropoffDetails}
            mode="outlined"
            placeholder="e.g. City shelter entrance, building name, checkpoint"
            style={styles.input}
          />
        </Card.Content>
      </Card>

      {/* Submit */}
      <Button
        mode="contained"
        onPress={submitRequest}
        loading={loading}
        disabled={loading}
        icon="send"
        style={styles.submitBtn}
        contentStyle={styles.submitBtnContent}
        labelStyle={styles.submitBtnLabel}
      >
        {loading ? 'Sending Request…' : 'Send Evacuation Request'}
      </Button>

      <Text style={styles.disclaimer}>
        Your GPS location will be shared with nearby drivers. Response times vary.
      </Text>

      <Snackbar visible={!!error} onDismiss={() => setError('')} duration={4000}>
        {error}
      </Snackbar>
      <Snackbar
        visible={!!success}
        onDismiss={() => {
          setSuccess('');
          router.replace('/home');
        }}
        duration={2500}
        onIconPress={() => {
          setSuccess('');
          router.replace('/home');
        }}
      >
        {success}
      </Snackbar>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { backgroundColor: '#F0F2F5' },
  container: { padding: 16, gap: 12, paddingBottom: 36 },

  statusBanner: {
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
  },
  bannerOnline: { backgroundColor: '#E8F5E9', borderLeftColor: '#388E3C' },
  bannerOffline: { backgroundColor: '#FFF3E0', borderLeftColor: '#E65100' },
  statusBannerText: { fontSize: 13, color: '#37474F' },

  card: { borderRadius: 12 },
  cardContent: { gap: 8, paddingVertical: 4 },
  mapWrap: { height: 220, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#CFD8DC' },
  map: { flex: 1 },
  sectionTitle: { fontWeight: '700', color: '#1A237E', fontSize: 14 },
  sectionSub: { color: '#78909C' },
  segments: { marginTop: 4 },
  input: { backgroundColor: '#FFFFFF' },

  submitBtn: {
    borderRadius: 10,
    marginTop: 8,
    backgroundColor: '#C62828',
  },
  submitBtnContent: { paddingVertical: 6 },
  submitBtnLabel: { fontSize: 16, fontWeight: '700', letterSpacing: 0.4 },

  disclaimer: {
    textAlign: 'center',
    color: '#90A4AE',
    fontSize: 12,
    marginTop: 4,
  },
});
