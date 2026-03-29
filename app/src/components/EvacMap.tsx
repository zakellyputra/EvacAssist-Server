import { useRef, useEffect, useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import MapView, { Marker, UrlTile, Polygon, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import { fetchMapRiskZones, MapRiskZone } from '../services/riskZones';

export interface TripMapMarker {
  id: string;
  title: string;
  description?: string;
  coordinate: { latitude: number; longitude: number };
  pinColor?: string;
}

interface Props {
  userLocation: { lat: number; lng: number } | null;
  tripMarkers?: TripMapMarker[];
  focusedLocation?: { latitude: number; longitude: number } | null;
  routePath?: { latitude: number; longitude: number }[];
}

const DEFAULT_REGION = {
  latitude: 37.7749,
  longitude: -122.4194,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

export default function EvacMap({
  userLocation,
  tripMarkers = [],
  focusedLocation = null,
  routePath = [],
}: Props) {
  const mapRef = useRef<MapView>(null);
  const [zones, setZones] = useState<MapRiskZone[]>([]);
  const [usingFallback, setUsingFallback] = useState(false);

  useEffect(() => {
    if (userLocation && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: userLocation.lat,
          longitude: userLocation.lng,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        },
        800
      );
    }
  }, [userLocation]);

  useEffect(() => {
    if (routePath.length >= 2 && mapRef.current) {
      mapRef.current.fitToCoordinates(routePath, {
        edgePadding: { top: 80, right: 60, bottom: 200, left: 60 },
        animated: true,
      });
      return;
    }
  }, [routePath]);

  useEffect(() => {
    if (routePath.length >= 2) return;
    if (!focusedLocation || !mapRef.current) return;
    mapRef.current.animateToRegion(
      {
        latitude: focusedLocation.latitude,
        longitude: focusedLocation.longitude,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015,
      },
      700
    );
  }, [focusedLocation, routePath.length]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const result = await fetchMapRiskZones();
      if (cancelled) return;
      setZones(result.zones);
      setUsingFallback(result.usingFallback);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  function zoneColors(riskLevel: MapRiskZone['riskLevel']) {
    switch (riskLevel) {
      case 'critical':
        return { fill: 'rgba(198, 40, 40, 0.25)', stroke: '#C62828' };
      case 'high':
        return { fill: 'rgba(245, 124, 0, 0.22)', stroke: '#F57C00' };
      case 'moderate':
        return { fill: 'rgba(251, 192, 45, 0.2)', stroke: '#FBC02D' };
      default:
        return { fill: 'rgba(56, 142, 60, 0.2)', stroke: '#388E3C' };
    }
  }

  function zonePinColor(riskLevel: MapRiskZone['riskLevel']) {
    switch (riskLevel) {
      case 'critical':
        return '#C62828';
      case 'high':
        return '#F57C00';
      case 'moderate':
        return '#FBC02D';
      default:
        return '#388E3C';
    }
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={
          userLocation
            ? {
                latitude: userLocation.lat,
                longitude: userLocation.lng,
                latitudeDelta: 0.02,
                longitudeDelta: 0.02,
              }
            : DEFAULT_REGION
        }
        showsUserLocation
        showsMyLocationButton
        showsCompass
        mapType="standard"
      >
        <UrlTile
          urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maximumZ={19}
          flipY={false}
          tileSize={256}
        />

        {userLocation && (
          <Marker
            coordinate={{ latitude: userLocation.lat, longitude: userLocation.lng }}
            title="You are here"
            pinColor="#1976D2"
          />
        )}

        {zones.map((zone) => {
          const colors = zoneColors(zone.riskLevel);
          return (
            <Polygon
              key={zone.id}
              coordinates={zone.coordinates}
              fillColor={colors.fill}
              strokeColor={colors.stroke}
              strokeWidth={2}
            />
          );
        })}

        {zones.map((zone) => (
          <Marker
            key={`${zone.id}-center`}
            coordinate={zone.center}
            title={zone.name}
            description={`${zone.riskLevel.toUpperCase()} risk zone`}
            pinColor={zonePinColor(zone.riskLevel)}
          />
        ))}

        {tripMarkers.map((marker) => (
          <Marker
            key={marker.id}
            coordinate={marker.coordinate}
            title={marker.title}
            description={marker.description}
            pinColor={marker.pinColor ?? '#1565C0'}
          />
        ))}

        {routePath.length >= 2 ? (
          <Polyline
            coordinates={routePath}
            strokeColor="#00BCD4"
            strokeWidth={4}
            lineDashPattern={[1]}
          />
        ) : null}
      </MapView>

      {/* Live chip */}
      <View style={styles.liveChip}>
        <View style={styles.liveDot} />
        <Text style={styles.liveText}>LIVE</Text>
      </View>

      {usingFallback ? (
        <View style={styles.fallbackChip}>
          <Text style={styles.fallbackText}>TEST ZONES</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  liveChip: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(198, 40, 40, 0.9)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  liveText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
  fallbackChip: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(245, 124, 0, 0.95)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  fallbackText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800', letterSpacing: 0.7 },
});
