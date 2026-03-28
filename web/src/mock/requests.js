export const mockRequests = [
  {
    _id: 'req_1001',
    status: 'pending',
    peopleCount: 4,
    priorityLevel: 'high',
    pickupLocation: { lat: 1.2921, lng: 36.8219, label: 'Westlands Safe Pickup' },
    createdAt: '2026-03-28T14:10:00.000Z',
  },
  {
    _id: 'req_1002',
    status: 'reviewing',
    peopleCount: 2,
    priorityLevel: 'critical',
    pickupLocation: { lat: 1.3032, lng: 36.8148, label: 'School Perimeter Gate' },
    createdAt: '2026-03-28T13:52:00.000Z',
  },
  {
    _id: 'req_1003',
    status: 'assigned',
    peopleCount: 1,
    priorityLevel: 'medium',
    pickupLocation: { lat: 1.2745, lng: 36.8006, label: 'Market Access Road' },
    createdAt: '2026-03-28T13:18:00.000Z',
  },
  {
    _id: 'req_1004',
    status: 'completed',
    peopleCount: 6,
    priorityLevel: 'high',
    pickupLocation: { lat: 1.3122, lng: 36.8454, label: 'Clinic Assembly Point' },
    createdAt: '2026-03-28T11:43:00.000Z',
  },
];
