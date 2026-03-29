import React, { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Button, TextInput, Text, SegmentedButtons, Snackbar } from 'react-native-paper';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useOfflineDatabase } from '../hooks/useOfflineDatabase';
import NetInfo from '@react-native-community/netinfo';
import { requestEvacuation } from '../services/trips';

export default function RequestScreen() {
  const { createTrip } = useOfflineDatabase();
  const [passengers, setPassengers] = useState('1');
  const [notes, setNotes] = useState('');
  const [accessibility, setAccessibility] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isOnline, setIsOnline] = useState(true);

  React.useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected ?? false);
    });
    return unsubscribe;
  }, []);

  async function submitRequest() {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const loc = await Location.getCurrentPositionAsync({});
      const pickupPoint = {
        type: 'Point' as const,
        coordinates: [loc.coords.longitude, loc.coords.latitude] as [number, number],
      };
      const normalizedPassengers = passengers === '5+' ? 5 : parseInt(passengers, 10);

      if (isOnline) {
        try {
          const remoteTrip = await requestEvacuation({
            pickupLoc: pickupPoint,
            passengers: normalizedPassengers,
            accessibilityNeeds: accessibility || undefined,
            notes: notes || undefined,
          });

          await createTrip({
            id: remoteTrip.id || undefined,
            serverId: remoteTrip.id || undefined,
            pickupLoc: JSON.stringify(pickupPoint),
            passengers: normalizedPassengers,
            accessibilityNeeds: accessibility || undefined,
            notes: notes || undefined,
            qrToken: remoteTrip.qrToken || undefined,
            syncedToServer: true,
            status: 'pending',
          });

          setSuccess('Evacuation request sent successfully.');
          setPassengers('1');
          setAccessibility('');
          setNotes('');
          return;
        } catch (remoteError: any) {
          // Fall back to local queue flow if backend request fails.
          const backendMessage = remoteError?.message ?? 'Backend unreachable';
          setError(`Saved offline. Will sync later. ${backendMessage}`);
        }
      }

      // Create trip in local database first
      await createTrip({
        pickupLoc: JSON.stringify(pickupPoint),
        passengers: normalizedPassengers,
        accessibilityNeeds: accessibility || undefined,
        notes: notes || undefined,
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
    <ScrollView contentContainerStyle={styles.container}>
      <Text variant="titleLarge" style={styles.title}>Request Evacuation</Text>

      <Text variant="labelLarge">Passengers</Text>
      <SegmentedButtons
        value={passengers}
        onValueChange={setPassengers}
        buttons={['1','2','3','4','5+'].map((v) => ({ value: v, label: v }))}
        style={styles.field}
      />

      <TextInput
        label="Accessibility needs (optional)"
        value={accessibility}
        onChangeText={setAccessibility}
        style={styles.field}
      />

      <TextInput
        label="Notes for driver (optional)"
        value={notes}
        onChangeText={setNotes}
        multiline
        numberOfLines={3}
        style={styles.field}
      />

      <Button
        mode="contained"
        onPress={submitRequest}
        loading={loading}
        disabled={loading}
        style={styles.field}
      >
        Submit Request
      </Button>

      <Snackbar visible={!!error} onDismiss={() => setError('')} duration={4000}>
        {error}
      </Snackbar>

      <Snackbar
        visible={!!success}
        onDismiss={() => {
          setSuccess('');
          router.replace('/');
        }}
        duration={2500}
      >
        {success}
      </Snackbar>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 8 },
  title: { marginBottom: 16 },
  field: { marginVertical: 8 },
});
