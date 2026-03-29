import { View, Text, StyleSheet } from 'react-native';

interface Props {
  userLocation: { lat: number; lng: number } | null;
}

export default function EvacMap({ userLocation }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>🗺️</Text>
      <Text style={styles.title}>Map View</Text>
      <Text style={styles.subtitle}>
        {userLocation
          ? `📍 ${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}`
          : 'Acquiring location...'}
      </Text>
      <Text style={styles.note}>Live hazard map available in full build</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    gap: 8,
  },
  icon: { fontSize: 64 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#2e7d32' },
  subtitle: { fontSize: 14, color: '#555' },
  note: { fontSize: 12, color: '#999', marginTop: 8 },
});