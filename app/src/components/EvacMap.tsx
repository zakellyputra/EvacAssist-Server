import { View, Text, StyleSheet } from 'react-native';

interface Props {
  userLocation: { lat: number; lng: number } | null;
}

const MAP_BG = '#1B2631';
const ROAD = '#2E4057';

export default function EvacMap({ userLocation }: Props) {
  const lngLabel =
    userLocation != null
      ? `${Math.abs(userLocation.lng).toFixed(5)}°${userLocation.lng < 0 ? 'W' : 'E'}`
      : null;

  return (
    <View style={styles.container}>
      {/* Simulated road grid */}
      <View style={[styles.roadH, { top: '28%' as any, height: 5 }]} />
      <View style={[styles.roadH, { top: '52%' as any, height: 3 }]} />
      <View style={[styles.roadH, { top: '72%' as any, height: 5 }]} />
      <View style={[styles.roadV, { left: '28%' as any, width: 5 }]} />
      <View style={[styles.roadV, { left: '65%' as any, width: 3 }]} />

      {/* Hazard zones */}
      <View style={styles.hazardRed} />
      <View style={styles.hazardOrange} />

      {/* Location pulse + pin */}
      <View style={styles.locationPulse} />
      <View style={styles.locationPin} />

      {/* Compass */}
      <View style={styles.compass}>
        <Text style={styles.compassN}>N</Text>
        <Text style={styles.compassArrow}>↑</Text>
      </View>

      {/* Risk legend */}
      <View style={styles.legend}>
        {[
          { color: '#EF5350', label: 'Critical' },
          { color: '#FF9800', label: 'Moderate' },
          { color: '#66BB6A', label: 'Clear' },
        ].map(({ color, label }) => (
          <View key={label} style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: color }]} />
            <Text style={styles.legendText}>{label}</Text>
          </View>
        ))}
      </View>

      {/* Coordinate bar */}
      <View style={styles.coordBar}>
        <Text style={styles.coordIcon}>📍</Text>
        <Text style={styles.coordText}>
          {userLocation
            ? `${userLocation.lat.toFixed(5)}°N  ${lngLabel}`
            : 'Acquiring GPS signal…'}
        </Text>
        <View style={styles.liveChip}>
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MAP_BG,
    overflow: 'hidden',
  },

  // Roads
  roadH: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: ROAD,
  },
  roadV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: ROAD,
  },

  // Hazard zones
  hazardRed: {
    position: 'absolute',
    top: '8%' as any,
    right: '5%' as any,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(198, 40, 40, 0.25)',
    borderWidth: 1.5,
    borderColor: 'rgba(198, 40, 40, 0.65)',
  },
  hazardOrange: {
    position: 'absolute',
    bottom: '22%' as any,
    left: '8%' as any,
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(230, 81, 0, 0.2)',
    borderWidth: 1.5,
    borderColor: 'rgba(230, 81, 0, 0.55)',
  },

  // Location marker
  locationPulse: {
    position: 'absolute',
    top: '47%' as any,
    left: '48%' as any,
    width: 28,
    height: 28,
    marginLeft: -14,
    marginTop: -14,
    borderRadius: 14,
    backgroundColor: 'rgba(25, 118, 210, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(25, 118, 210, 0.5)',
  },
  locationPin: {
    position: 'absolute',
    top: '49%' as any,
    left: '50%' as any,
    width: 12,
    height: 12,
    marginLeft: -6,
    marginTop: -6,
    borderRadius: 6,
    backgroundColor: '#1976D2',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    elevation: 4,
  },

  // Compass
  compass: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
  },
  compassN: { color: '#EF5350', fontSize: 11, fontWeight: '800' },
  compassArrow: { color: '#FFFFFF', fontSize: 14, lineHeight: 16 },

  // Legend
  legend: {
    position: 'absolute',
    bottom: 44,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 5,
  },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: '#E0E0E0', fontSize: 11 },

  // Coordinate bar
  coordBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.72)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    gap: 6,
  },
  coordIcon: { fontSize: 13 },
  coordText: { color: '#B0BEC5', fontSize: 12, flex: 1 },
  liveChip: {
    backgroundColor: '#C62828',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  liveText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
});
