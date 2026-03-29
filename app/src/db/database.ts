import AsyncStorage from '@react-native-async-storage/async-storage';

export type TripStatus = 'pending' | 'matched' | 'completed' | 'cancelled';

export interface Trip {
  id: string;
  serverId?: string;
  pickupLoc: string;
  dropoffLoc?: string;
  passengers: number;
  accessibilityNeeds?: string;
  notes?: string;
  status: TripStatus;
  qrToken?: string;
  syncedToServer: boolean;
  createdAt: number;
}

export interface RiskZone {
  id: string;
  name: string;
  riskLevel: 'low' | 'moderate' | 'high' | 'critical';
  geometry: string;
  source: string;
}

const TRIPS_KEY = 'evacassist:trips';
const RISK_ZONES_KEY = 'evacassist:riskzones';

export async function saveTrip(trip: Trip): Promise<void> {
  const existing = await getTrips();
  const updated = [trip, ...existing.filter(t => t.id !== trip.id)];
  await AsyncStorage.setItem(TRIPS_KEY, JSON.stringify(updated));
}

export async function getTrips(): Promise<Trip[]> {
  const raw = await AsyncStorage.getItem(TRIPS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function getTripById(id: string): Promise<Trip | null> {
  const trips = await getTrips();
  return trips.find(t => t.id === id) ?? null;
}

export async function createTrip(params: {
  id?: string;
  serverId?: string;
  pickupLoc: string;
  dropoffLoc?: string;
  passengers: number;
  accessibilityNeeds?: string;
  notes?: string;
  qrToken?: string;
  syncedToServer?: boolean;
  status?: TripStatus;
}): Promise<Trip> {
  const trip: Trip = {
    id: params.id ?? `trip_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    serverId: params.serverId,
    status: params.status ?? 'pending',
    syncedToServer: params.syncedToServer ?? false,
    createdAt: Date.now(),
    pickupLoc: params.pickupLoc,
    dropoffLoc: params.dropoffLoc,
    passengers: params.passengers,
    accessibilityNeeds: params.accessibilityNeeds,
    notes: params.notes,
    qrToken: params.qrToken,
  };
  await saveTrip(trip);
  return trip;
}

export async function saveRiskZones(zones: RiskZone[]): Promise<void> {
  await AsyncStorage.setItem(RISK_ZONES_KEY, JSON.stringify(zones));
}

export async function getRiskZones(): Promise<RiskZone[]> {
  const raw = await AsyncStorage.getItem(RISK_ZONES_KEY);
  return raw ? JSON.parse(raw) : [];
}
