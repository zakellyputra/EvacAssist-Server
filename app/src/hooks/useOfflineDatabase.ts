import { createTrip, getRiskZones, getTripById, getTrips } from '../db/database';

export function useOfflineDatabase() {
  return {
    createTrip,
    getRiskZones,
    getTripById,
    getTrips,
  };
}