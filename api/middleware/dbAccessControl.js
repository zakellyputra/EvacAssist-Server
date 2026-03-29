// Basic access control middleware
// Maps user roles to collection permissions

const COLLECTION_PERMISSIONS = {
  users: {
    anon: false,
    rider: 'own',
    driver: 'own',
    coordinator: 'read-all',
    admin: 'full'
  },
  trips: {
    anon: false,
    rider: 'own',
    driver: false, // drivers see assigned trips
    coordinator: 'read-all',
    admin: 'full'
  },
  risk_zones: {
    anon: 'read',
    rider: 'read',
    driver: 'read',
    coordinator: 'full',
    admin: 'full'
  },
  road_segments: {
    anon: 'read',
    rider: 'read',
    driver: 'read',
    coordinator: 'read',
    admin: 'full'
  },
  edge_risks: {
    anon: 'read',
    rider: 'read',
    driver: 'read',
    coordinator: 'read',
    admin: 'full'
  },
  incidents: {
    anon: false,
    rider: false,
    driver: 'read', // risk signals only
    coordinator: 'read',
    admin: 'full'
  },
  raw_reports: {
    anon: false,
    rider: 'own',
    driver: 'own',
    coordinator: 'read',
    admin: 'full'
  },
  audit_log: {
    anon: false,
    rider: false,
    driver: false,
    coordinator: 'read-only',
    admin: 'read-only'
  }
};

export function canReadCollection(collection, user = null) {
  const permission = COLLECTION_PERMISSIONS[collection];
  if (!permission) return false;

  if (!user) return permission.anon;

  const userRole = user.role || 'rider';
  const userPermission = permission[userRole];

  if (userPermission === 'read' || userPermission === 'read-all' || userPermission === 'full') {
    return true;
  }

  if (userPermission === 'own' || userPermission === 'read-only') {
    return true; // Additional checks needed in route handlers
  }

  return false;
}

export function canWriteCollection(collection, user = null) {
  const permission = COLLECTION_PERMISSIONS[collection];
  if (!permission) return false;

  if (!user) return false;

  const userRole = user.role || 'rider';
  const userPermission = permission[userRole];

  return userPermission === 'full';
}

// Middleware for collection access
export function requireCollectionRead(collection) {
  return (req, res, next) => {
    if (!canReadCollection(collection, req.user)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    next();
  };
}

export function requireCollectionWrite(collection) {
  return (req, res, next) => {
    if (!canWriteCollection(collection, req.user)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    next();
  };
}