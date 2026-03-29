const zoneUi = {
  'zone-east-2': {
    label: 'Zone East-2',
    corridor: 'East Corridor',
    mapTone: 'restricted',
    geometry: [
      { lat: -1.2954, lng: 36.8297 },
      { lat: -1.2954, lng: 36.8386 },
      { lat: -1.2841, lng: 36.8386 },
      { lat: -1.2841, lng: 36.8297 },
    ],
  },
  'zone-west-1': {
    label: 'Zone West-1',
    corridor: 'West Corridor',
    mapTone: 'watch',
    geometry: [
      { lat: -1.2869, lng: 36.8039 },
      { lat: -1.2869, lng: 36.8129 },
      { lat: -1.2772, lng: 36.8129 },
      { lat: -1.2772, lng: 36.8039 },
    ],
  },
  'zone-south-3': {
    label: 'Zone South-3',
    corridor: 'South Corridor',
    mapTone: 'watch',
    geometry: [
      { lat: -1.3078, lng: 36.8325 },
      { lat: -1.3078, lng: 36.8428 },
      { lat: -1.2979, lng: 36.8428 },
      { lat: -1.2979, lng: 36.8325 },
    ],
  },
  'zone-north-1': {
    label: 'Zone North-1',
    corridor: 'North Corridor',
    mapTone: 'watch',
    geometry: [
      { lat: -1.2747, lng: 36.8238 },
      { lat: -1.2747, lng: 36.8329 },
      { lat: -1.2634, lng: 36.8329 },
      { lat: -1.2634, lng: 36.8238 },
    ],
  },
  'zone-core-1': {
    label: 'Zone Core-1',
    corridor: 'Central Spine',
    mapTone: 'watch',
    geometry: [
      { lat: -1.2941, lng: 36.8145 },
      { lat: -1.2941, lng: 36.8214 },
      { lat: -1.2866, lng: 36.8214 },
      { lat: -1.2866, lng: 36.8145 },
    ],
  },
  'zone-north-2': {
    label: 'Zone North-2',
    corridor: 'North Corridor',
    mapTone: 'watch',
    geometry: [
      { lat: -1.2789, lng: 36.8223 },
      { lat: -1.2789, lng: 36.8295 },
      { lat: -1.2706, lng: 36.8295 },
      { lat: -1.2706, lng: 36.8223 },
    ],
  },
};

const tripUi = {
  'trip-rg-104': {
    displayId: 'RG-104',
    pickupPoint: 'Civic Center Pickup',
    pickupDetail: 'East loading lane',
    vehicleLabel: 'Van 2',
    departureReadiness: 'Ready in 8 minutes if final seat confirms',
    departureReadinessDetail: {
      driverAssigned: 'Yes',
      minimumRidersReached: 'Yes',
      riderCheckIn: '4 of 5 confirmed',
      routeAdvisory: 'Restricted corridor nearby',
      readinessEstimate: 'Pending final confirmation',
    },
    summary: 'Ride Group RG-104 is currently filling from Civic Center Pickup in North Corridor with driver Unit D-12 assigned.',
    routeNotes: [
      'Primary outbound route remains open through the east feeder corridor.',
      'Marshals requested one additional mobility seat check before release.',
    ],
    pickupIssues: [
      'Loading lane congestion increases after 08:50 when overlapping school-lot traffic arrives.',
    ],
    riders: [
      { id: 'R-441', name: 'Rider 441', checkInState: 'Checked In', assignmentState: 'Boarding Hold' },
      { id: 'R-447', name: 'Rider 447', checkInState: 'Checked In', assignmentState: 'Assigned' },
      { id: 'R-452', name: 'Rider 452', checkInState: 'Checked In', assignmentState: 'Assigned' },
      { id: 'R-459', name: 'Rider 459', checkInState: 'Checked In', assignmentState: 'Assigned' },
      { id: 'R-463', name: 'Rider 463', checkInState: 'Pending Arrival', assignmentState: 'Seat Held' },
    ],
  },
  'trip-rg-108': {
    displayId: 'RG-108',
    pickupPoint: 'Jefferson Transit Yard',
    pickupDetail: 'Bay 4 marshal point',
    vehicleLabel: 'Bus 1',
    departureReadiness: 'Awaiting dispatch release confirmation',
    departureReadinessDetail: {
      driverAssigned: 'Yes',
      minimumRidersReached: 'Yes',
      riderCheckIn: '8 of 8 confirmed',
      routeAdvisory: 'Route clear',
      readinessEstimate: 'Ready on dispatch release',
    },
    summary: 'Ride Group RG-108 is staged at full capacity and ready for departure review from Jefferson Transit Yard.',
    routeNotes: ['Outbound west lane remains stable with no active exceptions.'],
    pickupIssues: [],
    riders: [
      { id: 'R-401', name: 'Rider 401', checkInState: 'Checked In', assignmentState: 'Seated' },
      { id: 'R-406', name: 'Rider 406', checkInState: 'Checked In', assignmentState: 'Seated' },
      { id: 'R-409', name: 'Rider 409', checkInState: 'Checked In', assignmentState: 'Seated' },
      { id: 'R-414', name: 'Rider 414', checkInState: 'Checked In', assignmentState: 'Seated' },
    ],
  },
  'trip-rg-111': {
    displayId: 'RG-111',
    pickupPoint: 'Harbor South Gate',
    pickupDetail: 'Warehouse staging curb',
    vehicleLabel: 'Van 5',
    departureReadiness: 'Departed 12 minutes ago',
    departureReadinessDetail: {
      driverAssigned: 'Yes',
      minimumRidersReached: 'Yes',
      riderCheckIn: '4 of 4 confirmed',
      routeAdvisory: 'Route clear',
      readinessEstimate: 'Departed',
    },
    summary: 'Ride Group RG-111 is en route from Harbor South Gate with Unit F-03 moving through the southern corridor.',
    routeNotes: ['Southern roadway is clear after the 08:10 checkpoint sweep.'],
    pickupIssues: [],
    riders: [
      { id: 'R-378', name: 'Rider 378', checkInState: 'Loaded', assignmentState: 'In Transit' },
      { id: 'R-381', name: 'Rider 381', checkInState: 'Loaded', assignmentState: 'In Transit' },
      { id: 'R-388', name: 'Rider 388', checkInState: 'Loaded', assignmentState: 'In Transit' },
      { id: 'R-390', name: 'Rider 390', checkInState: 'Loaded', assignmentState: 'In Transit' },
    ],
  },
  'trip-rg-112': {
    displayId: 'RG-112',
    pickupPoint: 'Riverside School Lot',
    pickupDetail: 'North lot assembly point',
    vehicleLabel: 'Pending dispatch',
    departureReadiness: 'Assignment delayed pending replacement unit',
    departureReadinessDetail: {
      driverAssigned: 'No',
      minimumRidersReached: 'No',
      riderCheckIn: '3 of 6 confirmed',
      routeAdvisory: 'Northbound corridor under watch',
      readinessEstimate: 'Pending replacement unit',
    },
    summary: 'Ride Group RG-112 remains open at Riverside School Lot after its assigned driver was diverted to medical transport.',
    routeNotes: ['Alternate northbound release can be used once a replacement unit checks in.'],
    pickupIssues: ['On-site waiting line grew to seven unmatched riders before last regrouping.'],
    riders: [
      { id: 'R-471', name: 'Rider 471', checkInState: 'Checked In', assignmentState: 'Awaiting Driver' },
      { id: 'R-474', name: 'Rider 474', checkInState: 'Checked In', assignmentState: 'Awaiting Driver' },
      { id: 'R-479', name: 'Rider 479', checkInState: 'Checked In', assignmentState: 'Awaiting Driver' },
    ],
  },
  'trip-rg-115': {
    displayId: 'RG-115',
    pickupPoint: 'Market Street Shelter',
    pickupDetail: 'Rear ambulance access',
    vehicleLabel: 'SUV 3',
    departureReadiness: 'Held until route correction is approved',
    departureReadinessDetail: {
      driverAssigned: 'Yes',
      minimumRidersReached: 'Yes',
      riderCheckIn: '6 of 6 confirmed',
      routeAdvisory: 'Restricted corridor overlap',
      readinessEstimate: 'Held for route approval',
    },
    summary: 'Ride Group RG-115 is flagged at Market Street Shelter because its planned route conflicts with a restricted eastern corridor.',
    routeNotes: [
      'Primary path intersects restricted block on East-2 feeder road.',
      'Southbound detour adds nine minutes but clears the hazard zone.',
    ],
    pickupIssues: ['Shelter staff requested release timing confirmation before reboarding the final two riders.'],
    riders: [
      { id: 'R-421', name: 'Rider 421', checkInState: 'Checked In', assignmentState: 'Held' },
      { id: 'R-426', name: 'Rider 426', checkInState: 'Checked In', assignmentState: 'Held' },
      { id: 'R-429', name: 'Rider 429', checkInState: 'Checked In', assignmentState: 'Held' },
      { id: 'R-433', name: 'Rider 433', checkInState: 'Checked In', assignmentState: 'Held' },
    ],
  },
  'trip-rg-118': {
    displayId: 'RG-118',
    pickupPoint: 'Library Annex',
    pickupDetail: 'South entrance check-in',
    vehicleLabel: 'Sedan 1',
    departureReadiness: 'Ready when two more riders are assigned or manual close is triggered',
    departureReadinessDetail: {
      driverAssigned: 'Yes',
      minimumRidersReached: 'No',
      riderCheckIn: '2 of 4 confirmed',
      routeAdvisory: 'Lane advisory active',
      readinessEstimate: 'Awaiting rider threshold',
    },
    summary: 'Ride Group RG-118 is filling along the Central Spine and remains on normal watch with Unit A-04 assigned.',
    routeNotes: ['Annex departure route remains the fastest safe option for central outbound traffic.'],
    pickupIssues: [],
    riders: [
      { id: 'R-488', name: 'Rider 488', checkInState: 'Checked In', assignmentState: 'Assigned' },
      { id: 'R-492', name: 'Rider 492', checkInState: 'Checked In', assignmentState: 'Assigned' },
    ],
  },
  'trip-rg-221': {
    displayId: 'RG-221',
    pickupPoint: 'North Medical Annex',
    pickupDetail: 'Ambulatory overflow line',
    vehicleLabel: 'Van 8',
    departureReadiness: 'Dispatch intervention applied; awaiting renewed driver check-in',
    departureReadinessDetail: {
      driverAssigned: 'Yes',
      minimumRidersReached: 'Yes',
      riderCheckIn: '5 of 5 confirmed',
      routeAdvisory: 'Medical escort and telemetry caution',
      readinessEstimate: 'Pending final operations review',
    },
    summary: 'Ride Group RG-221 was stalled beyond its expected departure window and is now under actioned review at North Medical Annex.',
    routeNotes: ['Driver radio silence lasted 11 minutes before contact was restored.'],
    pickupIssues: ['Medical escort required for two riders before release.'],
    riders: [
      { id: 'R-501', name: 'Rider 501', checkInState: 'Checked In', assignmentState: 'Ready' },
      { id: 'R-503', name: 'Rider 503', checkInState: 'Checked In', assignmentState: 'Ready' },
      { id: 'R-505', name: 'Rider 505', checkInState: 'Checked In', assignmentState: 'Ready' },
    ],
  },
};

const incidentUi = {
  'incident-200': {
    id: 'alert-200',
    code: 'ALT-07',
    relatedTripId: 'trip-rg-112',
    assignedDriverUnitId: null,
    status: 'Open',
  },
  'incident-201': {
    id: 'alert-201',
    code: 'ALT-09',
    relatedTripId: 'trip-rg-104',
    assignedDriverUnitId: 'Unit D-12',
    status: 'Monitoring',
  },
  'incident-202': {
    id: 'alert-202',
    code: 'ALT-12',
    relatedTripId: 'trip-rg-112',
    assignedDriverUnitId: null,
    status: 'Open',
  },
  'incident-203': {
    id: 'alert-203',
    code: 'ALT-14',
    relatedTripId: 'trip-rg-115',
    assignedDriverUnitId: 'Unit B-18',
    status: 'In Review',
  },
  'incident-204': {
    id: 'alert-204',
    code: 'ALT-18',
    relatedTripId: 'trip-rg-221',
    assignedDriverUnitId: 'Unit K-04',
    status: 'Monitoring',
  },
  'incident-205': {
    id: 'alert-205',
    code: 'ALT-21',
    relatedTripId: 'trip-rg-118',
    assignedDriverUnitId: 'Unit A-04',
    status: 'Resolved',
    resolvedToday: true,
  },
};

export const users = [
  { _id: 'user-admin-001', fullName: 'Maya Chen', phone: '+1-555-0100', email: 'ops.admin@evacassist.local', passwordHash: 'demo-admin-hash', role: 'admin', isVerified: true, isActive: true, createdAt: '2026-03-27T09:00:00-04:00', updatedAt: '2026-03-28T08:50:00-04:00' },
  { _id: 'user-driver-d12', fullName: 'Leah M.', phone: '+1-555-0101', email: 'driver.d12@evacassist.local', passwordHash: 'demo-driver-hash', role: 'driver', isVerified: true, isActive: true, createdAt: '2026-03-20T08:00:00-04:00', updatedAt: '2026-03-28T08:42:00-04:00' },
  { _id: 'user-driver-c07', fullName: 'David K.', phone: '+1-555-0102', email: 'driver.c07@evacassist.local', passwordHash: 'demo-driver-hash', role: 'driver', isVerified: true, isActive: true, createdAt: '2026-03-20T08:05:00-04:00', updatedAt: '2026-03-28T08:38:00-04:00' },
  { _id: 'user-driver-f03', fullName: 'Amina R.', phone: '+1-555-0103', email: 'driver.f03@evacassist.local', passwordHash: 'demo-driver-hash', role: 'driver', isVerified: true, isActive: true, createdAt: '2026-03-20T08:10:00-04:00', updatedAt: '2026-03-28T08:34:00-04:00' },
  { _id: 'user-driver-b18', fullName: 'Marcus T.', phone: '+1-555-0104', email: 'driver.b18@evacassist.local', passwordHash: 'demo-driver-hash', role: 'driver', isVerified: true, isActive: true, createdAt: '2026-03-20T08:15:00-04:00', updatedAt: '2026-03-28T08:29:00-04:00' },
  { _id: 'user-driver-a04', fullName: 'Priya S.', phone: '+1-555-0105', email: 'driver.a04@evacassist.local', passwordHash: 'demo-driver-hash', role: 'driver', isVerified: true, isActive: true, createdAt: '2026-03-20T08:20:00-04:00', updatedAt: '2026-03-28T08:25:00-04:00' },
  { _id: 'user-driver-k04', fullName: 'Jonah P.', phone: '+1-555-0106', email: 'driver.k04@evacassist.local', passwordHash: 'demo-driver-hash', role: 'driver', isVerified: true, isActive: true, createdAt: '2026-03-20T08:25:00-04:00', updatedAt: '2026-03-28T08:18:00-04:00' },
  { _id: 'user-driver-m22', fullName: 'Elena V.', phone: '+1-555-0107', email: 'driver.m22@evacassist.local', passwordHash: 'demo-driver-hash', role: 'driver', isVerified: true, isActive: true, createdAt: '2026-03-20T08:30:00-04:00', updatedAt: '2026-03-28T08:44:00-04:00' },
];

export const vehicles = [
  { _id: 'vehicle-d12', driverUserId: 'user-driver-d12', type: 'van', label: 'Van 2', plateNumber: 'EA-D12', seatCapacity: 6, wheelchairAccessible: true, fuelLevelPercent: 72, isActive: true, currentLocation: { lat: -1.2834, lng: 36.8232, accuracy: 8, timestamp: '2026-03-28T08:42:00-04:00' }, createdAt: '2026-03-20T08:00:00-04:00', updatedAt: '2026-03-28T08:42:00-04:00' },
  { _id: 'vehicle-c07', driverUserId: 'user-driver-c07', type: 'bus', label: 'Bus 1', plateNumber: 'EA-C07', seatCapacity: 8, wheelchairAccessible: false, fuelLevelPercent: 81, isActive: true, currentLocation: { lat: -1.2825, lng: 36.8098, accuracy: 9, timestamp: '2026-03-28T08:38:00-04:00' }, createdAt: '2026-03-20T08:05:00-04:00', updatedAt: '2026-03-28T08:38:00-04:00' },
  { _id: 'vehicle-f03', driverUserId: 'user-driver-f03', type: 'van', label: 'Van 5', plateNumber: 'EA-F03', seatCapacity: 6, wheelchairAccessible: true, fuelLevelPercent: 63, isActive: true, currentLocation: { lat: -1.3016, lng: 36.8387, accuracy: 10, timestamp: '2026-03-28T08:34:00-04:00' }, createdAt: '2026-03-20T08:10:00-04:00', updatedAt: '2026-03-28T08:34:00-04:00' },
  { _id: 'vehicle-b18', driverUserId: 'user-driver-b18', type: 'car', label: 'SUV 3', plateNumber: 'EA-B18', seatCapacity: 6, wheelchairAccessible: false, fuelLevelPercent: 54, isActive: true, currentLocation: { lat: -1.2901, lng: 36.8348, accuracy: 14, timestamp: '2026-03-28T08:29:00-04:00' }, createdAt: '2026-03-20T08:15:00-04:00', updatedAt: '2026-03-28T08:29:00-04:00' },
  { _id: 'vehicle-a04', driverUserId: 'user-driver-a04', type: 'car', label: 'Sedan 1', plateNumber: 'EA-A04', seatCapacity: 4, wheelchairAccessible: false, fuelLevelPercent: 76, isActive: true, currentLocation: { lat: -1.2898, lng: 36.8187, accuracy: 7, timestamp: '2026-03-28T08:25:00-04:00' }, createdAt: '2026-03-20T08:20:00-04:00', updatedAt: '2026-03-28T08:25:00-04:00' },
  { _id: 'vehicle-k04', driverUserId: 'user-driver-k04', type: 'van', label: 'Van 8', plateNumber: 'EA-K04', seatCapacity: 5, wheelchairAccessible: true, fuelLevelPercent: 48, isActive: true, currentLocation: { lat: -1.2744, lng: 36.8254, accuracy: 18, timestamp: '2026-03-28T08:18:00-04:00' }, createdAt: '2026-03-20T08:25:00-04:00', updatedAt: '2026-03-28T08:18:00-04:00' },
  { _id: 'vehicle-m22', driverUserId: 'user-driver-m22', type: 'van', label: 'Van 9', plateNumber: 'EA-M22', seatCapacity: 6, wheelchairAccessible: true, fuelLevelPercent: 87, isActive: true, currentLocation: { lat: -1.2769, lng: 36.8246, accuracy: 8, timestamp: '2026-03-28T08:44:00-04:00' }, createdAt: '2026-03-20T08:30:00-04:00', updatedAt: '2026-03-28T08:44:00-04:00' },
];

export const drivers = [
  { _id: 'driver-d12', userId: 'user-driver-d12', vehicleId: 'vehicle-d12', licenseVerified: true, status: 'unavailable', currentLocation: { lat: -1.2834, lng: 36.8232, accuracy: 8, timestamp: '2026-03-28T08:42:00-04:00' }, lastHeartbeatAt: '2026-03-28T08:42:00-04:00', capacityOverride: 6, notes: 'Delayed near East-2 after the feeder route advisory tightened around Civic Center Pickup.', createdAt: '2026-03-20T08:00:00-04:00', updatedAt: '2026-03-28T08:42:00-04:00' },
  { _id: 'driver-c07', userId: 'user-driver-c07', vehicleId: 'vehicle-c07', licenseVerified: true, status: 'assigned', currentLocation: { lat: -1.2825, lng: 36.8098, accuracy: 9, timestamp: '2026-03-28T08:38:00-04:00' }, lastHeartbeatAt: '2026-03-28T08:38:00-04:00', capacityOverride: 8, notes: 'Awaiting final release call from the dispatch desk.', createdAt: '2026-03-20T08:05:00-04:00', updatedAt: '2026-03-28T08:38:00-04:00' },
  { _id: 'driver-f03', userId: 'user-driver-f03', vehicleId: 'vehicle-f03', licenseVerified: true, status: 'en_route_pickup', currentLocation: { lat: -1.3016, lng: 36.8387, accuracy: 10, timestamp: '2026-03-28T08:34:00-04:00' }, lastHeartbeatAt: '2026-03-28T08:34:00-04:00', capacityOverride: 6, notes: 'En route to the final pickup staging window through the southern corridor.', createdAt: '2026-03-20T08:10:00-04:00', updatedAt: '2026-03-28T08:34:00-04:00' },
  { _id: 'driver-b18', userId: 'user-driver-b18', vehicleId: 'vehicle-b18', licenseVerified: true, status: 'unavailable', currentLocation: { lat: -1.2901, lng: 36.8348, accuracy: 14, timestamp: '2026-03-28T08:29:00-04:00' }, lastHeartbeatAt: '2026-03-28T08:29:00-04:00', capacityOverride: 6, notes: 'Vehicle is held while alternate routing for East-2 is reviewed.', createdAt: '2026-03-20T08:15:00-04:00', updatedAt: '2026-03-28T08:29:00-04:00' },
  { _id: 'driver-a04', userId: 'user-driver-a04', vehicleId: 'vehicle-a04', licenseVerified: true, status: 'assigned', currentLocation: { lat: -1.2898, lng: 36.8187, accuracy: 7, timestamp: '2026-03-28T08:25:00-04:00' }, lastHeartbeatAt: '2026-03-28T08:25:00-04:00', capacityOverride: 4, notes: 'Central Spine group is still filling before closure.', createdAt: '2026-03-20T08:20:00-04:00', updatedAt: '2026-03-28T08:25:00-04:00' },
  { _id: 'driver-k04', userId: 'user-driver-k04', vehicleId: 'vehicle-k04', licenseVerified: true, status: 'unavailable', currentLocation: { lat: -1.2744, lng: 36.8254, accuracy: 18, timestamp: '2026-03-28T08:18:00-04:00' }, lastHeartbeatAt: '2026-03-28T08:18:00-04:00', capacityOverride: 5, notes: 'Telemetry recovered late after a stalled departure window near North Corridor.', createdAt: '2026-03-20T08:25:00-04:00', updatedAt: '2026-03-28T08:18:00-04:00' },
  { _id: 'driver-m22', userId: 'user-driver-m22', vehicleId: 'vehicle-m22', licenseVerified: true, status: 'available', currentLocation: { lat: -1.2769, lng: 36.8246, accuracy: 8, timestamp: '2026-03-28T08:44:00-04:00' }, lastHeartbeatAt: '2026-03-28T08:44:00-04:00', capacityOverride: 6, notes: 'Standby unit checked in at the north dispatch staging area and is ready for reassignment.', createdAt: '2026-03-20T08:30:00-04:00', updatedAt: '2026-03-28T08:44:00-04:00' },
];

export const zones = Object.entries(zoneUi).map(([id, meta]) => {
  const lats = meta.geometry.map((point) => point.lat);
  const lngs = meta.geometry.map((point) => point.lng);
  return {
    _id: id,
    name: meta.label,
    status: meta.mapTone === 'restricted' ? 'blocked' : 'warning',
    center: { lat: (Math.min(...lats) + Math.max(...lats)) / 2, lng: (Math.min(...lngs) + Math.max(...lngs)) / 2 },
    polygon: meta.geometry,
    capacity: 120,
    currentOccupancy: 64,
    notes: `${meta.corridor} oversight area`,
    updatedByUserId: 'user-admin-001',
    updatedAt: '2026-03-28T08:40:00-04:00',
    createdAt: '2026-03-27T12:00:00-04:00',
  };
});

export const shelters = [
  { _id: 'shelter-civic', name: 'Civic Center Pickup', location: { lat: -1.2855, lng: 36.8211 }, zoneId: 'zone-east-2', capacity: 80, currentOccupancy: 56, hasMedicalSupport: true, hasFoodSupport: true, hasPower: true, contactInfo: 'Civic Center marshal desk', isActive: true, createdAt: '2026-03-27T12:00:00-04:00', updatedAt: '2026-03-28T08:31:00-04:00' },
  { _id: 'shelter-jefferson', name: 'Jefferson Transit Yard', location: { lat: -1.2813, lng: 36.8081 }, zoneId: 'zone-west-1', capacity: 120, currentOccupancy: 48, hasMedicalSupport: false, hasFoodSupport: true, hasPower: true, contactInfo: 'Transit supervisor desk', isActive: true, createdAt: '2026-03-27T12:10:00-04:00', updatedAt: '2026-03-28T08:38:00-04:00' },
  { _id: 'shelter-riverside', name: 'Riverside School Lot', location: { lat: -1.2688, lng: 36.8275 }, zoneId: 'zone-north-1', capacity: 90, currentOccupancy: 61, hasMedicalSupport: true, hasFoodSupport: false, hasPower: true, contactInfo: 'Riverside field desk', isActive: true, createdAt: '2026-03-27T12:20:00-04:00', updatedAt: '2026-03-28T08:41:00-04:00' },
  { _id: 'shelter-market', name: 'Market Street Shelter', location: { lat: -1.2899, lng: 36.8332 }, zoneId: 'zone-east-2', capacity: 70, currentOccupancy: 58, hasMedicalSupport: true, hasFoodSupport: true, hasPower: true, contactInfo: 'Market shelter lead', isActive: true, createdAt: '2026-03-27T12:25:00-04:00', updatedAt: '2026-03-28T08:29:00-04:00' },
  { _id: 'shelter-library', name: 'Library Annex', location: { lat: -1.2902, lng: 36.8171 }, zoneId: 'zone-core-1', capacity: 60, currentOccupancy: 25, hasMedicalSupport: false, hasFoodSupport: true, hasPower: true, contactInfo: 'Annex operator desk', isActive: true, createdAt: '2026-03-27T12:30:00-04:00', updatedAt: '2026-03-28T08:25:00-04:00' },
  { _id: 'shelter-medical', name: 'North Medical Annex', location: { lat: -1.2747, lng: 36.8259 }, zoneId: 'zone-north-2', capacity: 75, currentOccupancy: 52, hasMedicalSupport: true, hasFoodSupport: true, hasPower: true, contactInfo: 'Medical annex dispatch', isActive: true, createdAt: '2026-03-27T12:35:00-04:00', updatedAt: '2026-03-28T08:18:00-04:00' },
];

export const evacuationRequests = [
  { _id: 'request-rg-104', requesterUserId: 'user-admin-001', pickupLocation: { lat: -1.2855, lng: 36.8211, accuracy: 10, timestamp: '2026-03-28T07:58:00-04:00' }, destinationZoneId: 'zone-east-2', peopleCount: 5, priorityLevel: 'high', hasChildren: true, hasElderly: false, hasInjured: false, hasDisabilitySupportNeeds: true, notes: 'RG-104 intake group', status: 'assigned', assignedTripId: 'trip-rg-104', assignedVehicleId: 'vehicle-d12', assignedDriverUserId: 'user-driver-d12', createdAt: '2026-03-28T07:58:00-04:00', updatedAt: '2026-03-28T08:42:00-04:00' },
  { _id: 'request-rg-108', requesterUserId: 'user-admin-001', pickupLocation: { lat: -1.2813, lng: 36.8081, accuracy: 9, timestamp: '2026-03-28T07:35:00-04:00' }, destinationZoneId: 'zone-west-1', peopleCount: 8, priorityLevel: 'medium', hasChildren: false, hasElderly: true, hasInjured: false, hasDisabilitySupportNeeds: false, notes: 'RG-108 transit yard group', status: 'assigned', assignedTripId: 'trip-rg-108', assignedVehicleId: 'vehicle-c07', assignedDriverUserId: 'user-driver-c07', createdAt: '2026-03-28T07:35:00-04:00', updatedAt: '2026-03-28T08:38:00-04:00' },
  { _id: 'request-rg-111', requesterUserId: 'user-admin-001', pickupLocation: { lat: -1.3035, lng: 36.8368, accuracy: 11, timestamp: '2026-03-28T07:22:00-04:00' }, destinationZoneId: 'zone-south-3', peopleCount: 4, priorityLevel: 'medium', hasChildren: false, hasElderly: false, hasInjured: false, hasDisabilitySupportNeeds: false, notes: 'RG-111 south gate group', status: 'en_route', assignedTripId: 'trip-rg-111', assignedVehicleId: 'vehicle-f03', assignedDriverUserId: 'user-driver-f03', createdAt: '2026-03-28T07:22:00-04:00', updatedAt: '2026-03-28T08:34:00-04:00' },
  { _id: 'request-rg-112', requesterUserId: 'user-admin-001', pickupLocation: { lat: -1.2688, lng: 36.8275, accuracy: 12, timestamp: '2026-03-28T08:06:00-04:00' }, destinationZoneId: 'zone-north-1', peopleCount: 3, priorityLevel: 'critical', hasChildren: true, hasElderly: true, hasInjured: false, hasDisabilitySupportNeeds: false, notes: 'RG-112 awaiting replacement driver', status: 'reviewing', assignedTripId: 'trip-rg-112', assignedVehicleId: null, assignedDriverUserId: null, createdAt: '2026-03-28T08:06:00-04:00', updatedAt: '2026-03-28T08:41:00-04:00' },
  { _id: 'request-rg-115', requesterUserId: 'user-admin-001', pickupLocation: { lat: -1.2899, lng: 36.8332, accuracy: 10, timestamp: '2026-03-28T07:43:00-04:00' }, destinationZoneId: 'zone-east-2', peopleCount: 6, priorityLevel: 'critical', hasChildren: false, hasElderly: true, hasInjured: false, hasDisabilitySupportNeeds: true, notes: 'RG-115 route hold', status: 'assigned', assignedTripId: 'trip-rg-115', assignedVehicleId: 'vehicle-b18', assignedDriverUserId: 'user-driver-b18', createdAt: '2026-03-28T07:43:00-04:00', updatedAt: '2026-03-28T08:29:00-04:00' },
  { _id: 'request-rg-118', requesterUserId: 'user-admin-001', pickupLocation: { lat: -1.2902, lng: 36.8171, accuracy: 8, timestamp: '2026-03-28T08:09:00-04:00' }, destinationZoneId: 'zone-core-1', peopleCount: 2, priorityLevel: 'medium', hasChildren: false, hasElderly: false, hasInjured: false, hasDisabilitySupportNeeds: false, notes: 'RG-118 central spine group', status: 'assigned', assignedTripId: 'trip-rg-118', assignedVehicleId: 'vehicle-a04', assignedDriverUserId: 'user-driver-a04', createdAt: '2026-03-28T08:09:00-04:00', updatedAt: '2026-03-28T08:25:00-04:00' },
  { _id: 'request-rg-221', requesterUserId: 'user-admin-001', pickupLocation: { lat: -1.2747, lng: 36.8259, accuracy: 13, timestamp: '2026-03-28T07:48:00-04:00' }, destinationZoneId: 'zone-north-2', peopleCount: 5, priorityLevel: 'critical', hasChildren: false, hasElderly: true, hasInjured: true, hasDisabilitySupportNeeds: true, notes: 'RG-221 medical annex group', status: 'assigned', assignedTripId: 'trip-rg-221', assignedVehicleId: 'vehicle-k04', assignedDriverUserId: 'user-driver-k04', createdAt: '2026-03-28T07:48:00-04:00', updatedAt: '2026-03-28T08:18:00-04:00' },
];

export const trips = [
  { _id: 'trip-rg-104', requestId: 'request-rg-104', driverUserId: 'user-driver-d12', vehicleId: 'vehicle-d12', pickupLocation: { lat: -1.2855, lng: 36.8211, accuracy: 10, timestamp: '2026-03-28T07:58:00-04:00' }, dropoffLocation: { lat: -1.2885, lng: 36.8464, accuracy: 25, timestamp: '2026-03-28T08:42:00-04:00' }, plannedRouteId: null, activeRouteId: null, status: 'driver_assigned', estimatedDistanceKm: 6.1, estimatedDurationMin: 18, startedAt: null, completedAt: null, createdAt: '2026-03-28T07:58:00-04:00', updatedAt: '2026-03-28T08:42:00-04:00' },
  { _id: 'trip-rg-108', requestId: 'request-rg-108', driverUserId: 'user-driver-c07', vehicleId: 'vehicle-c07', pickupLocation: { lat: -1.2813, lng: 36.8081, accuracy: 9, timestamp: '2026-03-28T07:35:00-04:00' }, dropoffLocation: { lat: -1.2791, lng: 36.8427, accuracy: 25, timestamp: '2026-03-28T08:38:00-04:00' }, plannedRouteId: null, activeRouteId: null, status: 'driver_assigned', estimatedDistanceKm: 7.8, estimatedDurationMin: 24, startedAt: null, completedAt: null, createdAt: '2026-03-28T07:35:00-04:00', updatedAt: '2026-03-28T08:38:00-04:00' },
  { _id: 'trip-rg-111', requestId: 'request-rg-111', driverUserId: 'user-driver-f03', vehicleId: 'vehicle-f03', pickupLocation: { lat: -1.3035, lng: 36.8368, accuracy: 11, timestamp: '2026-03-28T07:22:00-04:00' }, dropoffLocation: { lat: -1.3182, lng: 36.8521, accuracy: 25, timestamp: '2026-03-28T08:34:00-04:00' }, plannedRouteId: null, activeRouteId: null, status: 'in_transit', estimatedDistanceKm: 8.6, estimatedDurationMin: 21, startedAt: '2026-03-28T08:22:00-04:00', completedAt: null, createdAt: '2026-03-28T07:22:00-04:00', updatedAt: '2026-03-28T08:34:00-04:00' },
  { _id: 'trip-rg-112', requestId: 'request-rg-112', driverUserId: null, vehicleId: null, pickupLocation: { lat: -1.2688, lng: 36.8275, accuracy: 12, timestamp: '2026-03-28T08:06:00-04:00' }, dropoffLocation: { lat: -1.2506, lng: 36.8404, accuracy: 25, timestamp: '2026-03-28T08:41:00-04:00' }, plannedRouteId: null, activeRouteId: null, status: 'planned', estimatedDistanceKm: 5.3, estimatedDurationMin: 17, startedAt: null, completedAt: null, createdAt: '2026-03-28T08:06:00-04:00', updatedAt: '2026-03-28T08:41:00-04:00' },
  { _id: 'trip-rg-115', requestId: 'request-rg-115', driverUserId: 'user-driver-b18', vehicleId: 'vehicle-b18', pickupLocation: { lat: -1.2899, lng: 36.8332, accuracy: 10, timestamp: '2026-03-28T07:43:00-04:00' }, dropoffLocation: { lat: -1.2784, lng: 36.8508, accuracy: 25, timestamp: '2026-03-28T08:29:00-04:00' }, plannedRouteId: null, activeRouteId: null, status: 'driver_assigned', estimatedDistanceKm: 6.9, estimatedDurationMin: 23, startedAt: null, completedAt: null, createdAt: '2026-03-28T07:43:00-04:00', updatedAt: '2026-03-28T08:29:00-04:00' },
  { _id: 'trip-rg-118', requestId: 'request-rg-118', driverUserId: 'user-driver-a04', vehicleId: 'vehicle-a04', pickupLocation: { lat: -1.2902, lng: 36.8171, accuracy: 8, timestamp: '2026-03-28T08:09:00-04:00' }, dropoffLocation: { lat: -1.2927, lng: 36.8408, accuracy: 25, timestamp: '2026-03-28T08:25:00-04:00' }, plannedRouteId: null, activeRouteId: null, status: 'driver_assigned', estimatedDistanceKm: 4.7, estimatedDurationMin: 14, startedAt: null, completedAt: null, createdAt: '2026-03-28T08:09:00-04:00', updatedAt: '2026-03-28T08:25:00-04:00' },
  { _id: 'trip-rg-221', requestId: 'request-rg-221', driverUserId: 'user-driver-k04', vehicleId: 'vehicle-k04', pickupLocation: { lat: -1.2747, lng: 36.8259, accuracy: 13, timestamp: '2026-03-28T07:48:00-04:00' }, dropoffLocation: { lat: -1.2581, lng: 36.8476, accuracy: 25, timestamp: '2026-03-28T08:18:00-04:00' }, plannedRouteId: null, activeRouteId: null, status: 'driver_assigned', estimatedDistanceKm: 5.9, estimatedDurationMin: 19, startedAt: null, completedAt: null, createdAt: '2026-03-28T07:48:00-04:00', updatedAt: '2026-03-28T08:18:00-04:00' },
];

export const incidents = [
  { _id: 'incident-200', type: 'security_threat', severity: 'critical', title: 'Driver reassignment needed', description: 'RG-112 has waited 14 minutes without a confirmed driver after Unit E-09 was diverted to medical transport.', location: { lat: -1.2688, lng: 36.8275, accuracy: 15, timestamp: '2026-03-28T08:27:00-04:00' }, zoneId: 'zone-north-1', reportedByUserId: 'user-admin-001', source: 'system', isActive: true, createdAt: '2026-03-28T08:27:00-04:00', resolvedAt: null, updatedAt: '2026-03-28T08:27:00-04:00' },
  { _id: 'incident-201', type: 'other', severity: 'medium', title: 'Pickup Point B nearing capacity', description: 'Civic Center Pickup is approaching its curbside loading threshold and marshals are slowing group intake.', location: { lat: -1.2855, lng: 36.8211, accuracy: 12, timestamp: '2026-03-28T08:31:00-04:00' }, zoneId: 'zone-east-2', reportedByUserId: 'user-admin-001', source: 'admin', isActive: true, createdAt: '2026-03-28T08:31:00-04:00', resolvedAt: null, updatedAt: '2026-03-28T08:31:00-04:00' },
  { _id: 'incident-202', type: 'other', severity: 'high', title: 'Unmatched riders forming in North Corridor', description: 'Additional riders are gathering near Riverside School Lot faster than northbound unit coverage can absorb.', location: { lat: -1.2688, lng: 36.8275, accuracy: 16, timestamp: '2026-03-28T08:19:00-04:00' }, zoneId: 'zone-north-1', reportedByUserId: 'user-admin-001', source: 'system', isActive: true, createdAt: '2026-03-28T08:19:00-04:00', resolvedAt: null, updatedAt: '2026-03-28T08:19:00-04:00' },
  { _id: 'incident-203', type: 'road_block', severity: 'critical', title: 'Restricted zone overlaps planned route', description: 'RG-115 is still mapped through a corridor adjacent to a restricted block on the eastern feeder road.', location: { lat: -1.2894, lng: 36.8341, accuracy: 14, timestamp: '2026-03-28T08:24:00-04:00' }, zoneId: 'zone-east-2', reportedByUserId: 'user-admin-001', source: 'ai', isActive: true, createdAt: '2026-03-28T08:24:00-04:00', resolvedAt: null, updatedAt: '2026-03-28T08:24:00-04:00' },
  { _id: 'incident-204', type: 'medical', severity: 'critical', title: 'Ride Group RG-221 stalled beyond expected departure window', description: 'North Medical Annex has remained staged past target departure while escort requirements and driver comms were revalidated.', location: { lat: -1.2747, lng: 36.8259, accuracy: 18, timestamp: '2026-03-28T08:11:00-04:00' }, zoneId: 'zone-north-2', reportedByUserId: 'user-admin-001', source: 'system', isActive: true, createdAt: '2026-03-28T08:11:00-04:00', resolvedAt: null, updatedAt: '2026-03-28T08:11:00-04:00' },
  { _id: 'incident-205', type: 'road_block', severity: 'low', title: 'Route note requires dispatch acknowledgement', description: 'Central Spine outbound path for RG-118 carries an advisory notice after lane narrowing near the annex intersection.', location: { lat: -1.2902, lng: 36.8171, accuracy: 10, timestamp: '2026-03-28T08:05:00-04:00' }, zoneId: 'zone-core-1', reportedByUserId: 'user-admin-001', source: 'ai', isActive: false, createdAt: '2026-03-28T08:05:00-04:00', resolvedAt: '2026-03-28T08:18:00-04:00', updatedAt: '2026-03-28T08:18:00-04:00' },
];

export const auditLogs = [
  { _id: 'audit-1', actorUserId: 'user-admin-001', action: 'ride_group_progress', entityType: 'trip', entityId: 'trip-rg-104', metadata: { time: '08:42', title: 'RG-104 reached 4 of 5 riders', description: 'Civic Center intake added one additional rider to the east loading lane group.' }, createdAt: '2026-03-28T08:42:00-04:00' },
  { _id: 'audit-2', actorUserId: 'user-admin-001', action: 'ride_group_capacity', entityType: 'trip', entityId: 'trip-rg-108', metadata: { time: '08:38', title: 'RG-108 reached capacity', description: 'West Corridor marshals completed boarding and marked the group ready for departure release.' }, createdAt: '2026-03-28T08:38:00-04:00' },
  { _id: 'audit-3', actorUserId: 'user-admin-001', action: 'driver_update', entityType: 'driver', entityId: 'driver-f03', metadata: { time: '08:34', title: 'Unit F-03 marked en route to pickup', description: 'Southern corridor telemetry confirmed continued movement through Harbor South Gate.' }, createdAt: '2026-03-28T08:34:00-04:00' },
  { _id: 'audit-4', actorUserId: 'user-admin-001', action: 'incident_opened', entityType: 'incident', entityId: 'incident-203', metadata: { time: '08:29', title: 'ALT-09 opened for East-2 route restriction overlap', description: 'Restricted road overlap triggered route review for RG-104 and its assigned unit.' }, createdAt: '2026-03-28T08:29:00-04:00' },
  { _id: 'audit-5', actorUserId: 'user-admin-001', action: 'route_caution', entityType: 'zone', entityId: 'zone-north-1', metadata: { time: '08:21', title: 'Route caution added to North Corridor watch', description: 'Dispatch marked the eastern feeder corridor as conditional until the next field verification passes.' }, createdAt: '2026-03-28T08:21:00-04:00' },
];

const userById = new Map(users.map((user) => [user._id, user]));
const driverByUserId = new Map(drivers.map((driver) => [driver.userId, driver]));
const vehicleById = new Map(vehicles.map((vehicle) => [vehicle._id, vehicle]));
const zoneById = new Map(zones.map((zone) => [zone._id, zone]));
const shelterByZoneId = new Map(shelters.map((shelter) => [shelter.zoneId, shelter]));
const requestById = new Map(evacuationRequests.map((request) => [request._id, request]));
const tripById = new Map(trips.map((trip) => [trip._id, trip]));

function titleCaseSeverity(value) {
  return value === 'critical' ? 'Critical' : value === 'high' ? 'Warning' : value === 'medium' ? 'Warning' : 'Monitoring';
}

function severityTone(value) {
  return value === 'critical' ? 'strong' : value === 'low' ? 'default' : 'muted';
}

function uiTripStatus(status, request, incidentMeta) {
  if (incidentMeta?.status === 'In Review') return 'Flagged';
  if (incidentMeta?.status === 'Open' && request.priorityLevel === 'critical' && !request.assignedDriverUserId) return 'Open';
  if (status === 'planned') return 'Open';
  if (status === 'driver_assigned' && request.peopleCount >= (vehicleById.get(request.assignedVehicleId)?.seatCapacity ?? Number.MAX_SAFE_INTEGER)) return 'Full';
  if (status === 'driver_assigned') return 'Filling';
  if (status === 'in_transit') return 'En Route';
  if (status === 'completed') return 'Completed';
  if (status === 'cancelled' || request.status === 'cancelled') return 'Cancelled';
  return 'Open';
}

export const driverContexts = drivers.map((driver) => {
  const user = userById.get(driver.userId);
  const zone = zones.find((item) => item._id === shelters.find((shelter) => shelter.location.lat === driver.currentLocation.lat && shelter.location.lng === driver.currentLocation.lng)?.zoneId)
    ?? zones.find((item) => item._id === evacuationRequests.find((request) => request.assignedDriverUserId === driver.userId)?.destinationZoneId)
    ?? zones[0];

  const operationalState =
    driver.status === 'assigned' ? 'Assigned' :
    driver.status === 'en_route_pickup' ? 'En Route to Pickup' :
    driver.notes.toLowerCase().includes('delayed') ? 'Delayed' :
    driver.notes.toLowerCase().includes('telemetry') ? 'Stopped reporting' :
    driver.notes.toLowerCase().includes('filling') ? 'Awaiting Riders' :
    'Assigned';

  const issueState =
    driver.notes.toLowerCase().includes('telemetry') ? 'No location update received in 6 minutes' :
    driver.notes.toLowerCase().includes('delayed') ? 'Delayed' :
    driver.notes.toLowerCase().includes('route') ? 'Route restriction overlap' :
    null;

  return {
    unitId: vehicleById.get(driver.vehicleId)?.label?.replace('Van ', 'Unit ').replace('Bus ', 'Unit ').replace('SUV ', 'Unit ').replace('Sedan ', 'Unit ')
      ?? `Unit ${user.fullName.split(' ')[0]}`,
    displayName: user.fullName,
    operationalState,
    lastUpdated: driver.updatedAt,
    quickNote: driver.notes,
    zone: zone.name,
    issueState,
  };
});

const driverContextByUnitId = new Map(driverContexts.map((context) => [context.unitId, context]));

export const initialAlerts = incidents.map((incident) => {
  const meta = incidentUi[incident._id];
  const trip = tripById.get(meta.relatedTripId);
  const request = requestById.get(trip.requestId);
  const zone = zoneById.get(incident.zoneId);
  const shelter = shelterByZoneId.get(zone._id);

  return {
    id: meta.id,
    code: meta.code,
    severity: titleCaseSeverity(incident.severity),
    severityTone: severityTone(incident.severity),
    title: incident.title,
    description: incident.description,
    detailedDescription: incident.description,
    relatedZone: zone.name,
    relatedGroupId: tripUi[trip._id].displayId,
    pickupPoint: shelter?.name ?? tripUi[trip._id].pickupPoint,
    assignedDriver: meta.assignedDriverUnitId,
    suggestedAction: incident.description,
    createdAt: incident.createdAt,
    status: meta.status,
    resolvedToday: meta.resolvedToday ?? false,
  };
});

const alertsByTripId = new Map(
  Object.values(incidentUi).reduce((acc, meta) => {
    if (!acc.has(meta.relatedTripId)) acc.set(meta.relatedTripId, []);
    acc.get(meta.relatedTripId).push(meta.id);
    return acc;
  }, new Map()),
);

export const initialRideGroups = trips.map((trip) => {
  const request = requestById.get(trip.requestId);
  const ui = tripUi[trip._id];
  const zone = zoneById.get(request.destinationZoneId);
  const vehicle = trip.vehicleId ? vehicleById.get(trip.vehicleId) : null;
  const driverUser = trip.driverUserId ? userById.get(trip.driverUserId) : null;
  const unitId = vehicle
    ? `Unit ${vehicle._id.split('-')[1].toUpperCase()}`
    : null;
  const primaryIncidentMeta = Object.values(incidentUi).find((meta) => meta.relatedTripId === trip._id && meta.status === 'In Review')
    ?? Object.values(incidentUi).find((meta) => meta.relatedTripId === trip._id);

  return {
    id: ui.displayId,
    tripId: trip._id,
    requestId: request._id,
    driverUserId: trip.driverUserId ?? null,
    vehicleId: trip.vehicleId ?? null,
    zoneId: zone._id,
    requestStatus: request.status,
    tripStatus: trip.status,
    priorityLevel: request.priorityLevel,
    pickupPoint: ui.pickupPoint,
    pickupDetail: ui.pickupDetail,
    corridor: zoneUi[zone._id].corridor,
    zone: zone.name,
    ridersJoined: request.peopleCount,
    capacity: vehicle?.seatCapacity ?? request.peopleCount + 3,
    driver: unitId ?? 'Unassigned',
    driverUnitId: unitId,
    vehicle: ui.vehicleLabel,
    status: uiTripStatus(trip.status, request, primaryIncidentMeta),
    interventionState: primaryIncidentMeta?.status === 'In Review' ? 'Needs Review' : primaryIncidentMeta?.status === 'Monitoring' ? 'Monitoring' : 'None',
    createdAt: trip.createdAt,
    updatedAt: trip.updatedAt,
    departureReadiness: ui.departureReadiness,
    departureReadinessDetail: ui.departureReadinessDetail,
    summary: ui.summary,
    routeNotes: ui.routeNotes,
    pickupIssues: ui.pickupIssues,
    linkedAlertIds: alertsByTripId.get(trip._id) ?? [],
    riders: ui.riders,
    schemaRefs: {
      tripId: trip._id,
      requestId: request._id,
      driverUserId: trip.driverUserId ?? null,
      vehicleId: trip.vehicleId ?? null,
      zoneId: zone._id,
    },
    schemaStatus: {
      trip: trip.status,
      request: request.status,
      driver: driverByUserId.get(trip.driverUserId ?? '')?.status ?? null,
    },
    schemaSnapshot: {
      trip,
      request,
      driver: trip.driverUserId ? driverByUserId.get(trip.driverUserId) ?? null : null,
      vehicle,
      zone,
      driverUser,
    },
  };
});

export const initialActivity = auditLogs.map((log) => ({
  id: log._id,
  time: log.metadata.time,
  title: log.metadata.title,
  description: log.metadata.description,
}));

export const operationsMap = {
  summary: [
    { label: 'Active zones', value: String(zones.length) },
    { label: 'Tracked units', value: String(drivers.length) },
    { label: 'Flagged corridors', value: String(zones.filter((zone) => zone.status === 'blocked' || zone.status === 'warning').length) },
  ],
  legend: [
    { label: 'Ride Group', type: 'ride-group' },
    { label: 'Driver', type: 'driver' },
    { label: 'Pickup Point', type: 'pickup' },
    { label: 'Restricted Zone', type: 'restricted' },
  ],
  zones: zones.slice(0, 3).map((zone, index) => ({
    id: zone._id,
    label: zone.name,
    tone: zone.status === 'blocked' ? 'restricted' : 'watch',
    style: [
      { top: '14%', left: '61%', width: '26%', height: '30%' },
      { top: '11%', left: '15%', width: '24%', height: '18%' },
      { top: '58%', left: '36%', width: '22%', height: '18%' },
    ][index],
  })),
  routes: [
    { id: 'route-1', tone: 'primary', style: { top: '34%', left: '18%', width: '38%', transform: 'rotate(12deg)' } },
    { id: 'route-2', tone: 'secondary', style: { top: '56%', left: '44%', width: '26%', transform: 'rotate(-18deg)' } },
    { id: 'route-3', tone: 'secondary', style: { top: '44%', left: '58%', width: '18%', transform: 'rotate(24deg)' } },
  ],
  markers: [
    { id: 'rg-104', type: 'ride-group', label: 'RG-104', style: { top: '38%', left: '27%' } },
    { id: 'rg-112', type: 'ride-group', label: 'RG-112', style: { top: '52%', left: '50%' } },
    { id: 'driver-d12', type: 'driver', label: 'D-12', style: { top: '31%', left: '47%' } },
    { id: 'driver-f03', type: 'driver', label: 'F-03', style: { top: '63%', left: '60%' } },
    { id: 'pickup-civic', type: 'pickup', label: 'Civic Center Pickup', style: { top: '48%', left: '20%' } },
    { id: 'pickup-harbor', type: 'pickup', label: 'Harbor South Gate', style: { top: '68%', left: '43%' } },
  ],
  annotations: [
    { id: 'annotation-east', title: 'Route pressure', text: 'Planned departures crossing Zone East-2 are under manual review.', style: { top: '12%', left: '7%' } },
    { id: 'annotation-north', title: 'Pickup build-up', text: 'Unmatched riders are forming near the North Corridor civic shelter.', style: { top: '70%', left: '67%' } },
  ],
};

function toFeature(id, name, tone, polygon) {
  return {
    type: 'Feature',
    properties: { id, name, tone },
    geometry: {
      type: 'Polygon',
      coordinates: [[...polygon.map((point) => [point.lng, point.lat]), [polygon[0].lng, polygon[0].lat]]],
    },
  };
}

const liveMapTripCoords = {
  'trip-rg-104': [36.8216, -1.2849],
  'trip-rg-108': [36.8089, -1.2818],
  'trip-rg-111': [36.8368, -1.3035],
  'trip-rg-112': [36.8282, -1.2679],
  'trip-rg-115': [36.8341, -1.2894],
  'trip-rg-118': [36.8178, -1.2906],
  'trip-rg-221': [36.8263, -1.2738],
};

const liveMapDriverCoords = {
  'driver-d12': [36.8232, -1.2834],
  'driver-c07': [36.8098, -1.2825],
  'driver-f03': [36.8387, -1.3016],
  'driver-b18': [36.8348, -1.2901],
  'driver-a04': [36.8187, -1.2898],
  'driver-k04': [36.8254, -1.2744],
};

export const liveMapData = {
  center: [36.8219, -1.2864],
  zoom: 13,
  mapRideGroups: trips.map((trip) => ({
    id: tripUi[trip._id].displayId,
    coordinates: liveMapTripCoords[trip._id],
    linkedAlertIds: alertsByTripId.get(trip._id) ?? [],
  })),
  mapDrivers: drivers.map((driver) => {
    const vehicle = vehicleById.get(driver.vehicleId);
    const unitId = `Unit ${vehicle._id.split('-')[1].toUpperCase()}`;
    const assignedTrip = trips.find((trip) => trip.driverUserId === driver.userId);
    const zone = zoneById.get(requestById.get(assignedTrip?.requestId)?.destinationZoneId);
    return {
      id: driver._id,
      unitId,
      coordinates: liveMapDriverCoords[driver._id],
      assignedRideGroupId: assignedTrip ? tripUi[assignedTrip._id].displayId : null,
      status: driverContextByUnitId.get(unitId)?.operationalState ?? 'Assigned',
      zone: zone?.name ?? 'Unknown zone',
      lastUpdated: driver.updatedAt,
    };
  }),
  mapPickupPoints: shelters.map((shelter) => ({
    id: `pickup-${shelter._id}`,
    name: shelter.name,
    coordinates: [shelter.location.lng, shelter.location.lat],
    zone: zoneById.get(shelter.zoneId).name,
    activeRideGroupIds: trips.filter((trip) => requestById.get(trip.requestId).destinationZoneId === shelter.zoneId).map((trip) => tripUi[trip._id].displayId),
    demandNote: `${shelter.name} is operating at ${shelter.currentOccupancy} of ${shelter.capacity} occupancy with current corridor monitoring in place.`,
  })),
  mapZones: zones.map((zone) => ({
    id: zone._id,
    name: zone.name,
    zone: zone.name,
    restrictionType: zone.status === 'blocked' ? 'Restricted corridor' : 'Demand pressure watch',
    cautionNote: zone.notes,
    relatedAlertIds: incidents.filter((incident) => incident.zoneId === zone._id && incident.isActive).map((incident) => incidentUi[incident._id].id),
    affectedRideGroupIds: trips.filter((trip) => requestById.get(trip.requestId).destinationZoneId === zone._id).map((trip) => tripUi[trip._id].displayId),
    geometry: toFeature(zone._id, zone.name, zone.status === 'blocked' ? 'restricted' : 'watch', zone.polygon),
  })),
  mapAlertAreas: incidents.filter((incident) => incident.isActive).map((incident) => {
    const meta = incidentUi[incident._id];
    const polygon = [
      { lat: incident.location.lat - 0.002, lng: incident.location.lng - 0.002 },
      { lat: incident.location.lat - 0.002, lng: incident.location.lng + 0.002 },
      { lat: incident.location.lat + 0.002, lng: incident.location.lng + 0.002 },
      { lat: incident.location.lat + 0.002, lng: incident.location.lng - 0.002 },
    ];
    return {
      id: `alert-area-${meta.id}`,
      alertId: meta.id,
      relatedRideGroupId: tripUi[meta.relatedTripId].displayId,
      zone: zoneById.get(incident.zoneId).name,
      label: incident.title,
      geometry: toFeature(`alert-area-${meta.id}`, incident.title, incident.severity === 'critical' ? 'critical' : 'warning', polygon),
    };
  }),
};
