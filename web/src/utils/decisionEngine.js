const WAITING_THRESHOLD_MINUTES = 10;

const PRIORITY_FACTORS = {
  noDriver: 30,
  criticalAlert: 25,
  delayedDriver: 20,
  overCapacity: 15,
  readinessBlocked: 10,
};

const RECOMMENDATION_CATALOG = {
  REASSIGN_DRIVER: {
    message: 'Reassign a driver to this ride group.',
    reason: 'Driver coverage is missing or no longer reliable for departure.',
  },
  CLOSE_JOINING: {
    message: 'Close joining for this ride group.',
    reason: 'The assigned rider count has reached or exceeded available capacity.',
  },
  ESCALATE_ALERT: {
    message: 'Escalate the linked alert for operator review.',
    reason: 'A critical unresolved alert is affecting this ride group.',
  },
  RESOLVE_FLAG: {
    message: 'Resolve the active operational flag when readiness clears.',
    reason: 'The ride group can return to normal monitoring once blocking conditions are cleared.',
  },
};

function clampScore(value) {
  return Math.max(0, Math.min(100, value));
}

function minutesSince(timestamp) {
  if (!timestamp) return 0;
  const value = new Date(timestamp).getTime();
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.round((Date.now() - value) / 60000));
}

function makeRecommendation(type, severity, confidence) {
  const template = RECOMMENDATION_CATALOG[type];
  return {
    id: `${type.toLowerCase()}-${severity}`,
    type,
    message: template.message,
    reason: template.reason,
    severity,
    confidence,
  };
}

function normalizeDriverState(driver) {
  const rawState = (
    driver?.status
    ?? driver?.operationalState
    ?? driver?.schemaStatus
    ?? ''
  ).toString().toLowerCase();

  if (rawState.includes('delayed')) return 'delayed';
  if (rawState.includes('no driver')) return 'unassigned';
  return rawState;
}

function isReadinessBlocked(rideGroup) {
  const readinessState = (rideGroup?.readinessState ?? '').toString().toUpperCase();
  const actionState = (rideGroup?.actionState ?? '').toString().toUpperCase();
  const readinessCopy = (
    rideGroup?.departureReadinessDetail?.readinessEstimate
    ?? rideGroup?.departureReadiness
    ?? ''
  ).toString().toLowerCase();

  return (
    readinessState === 'BLOCKED'
    || actionState === 'BLOCKED'
    || readinessCopy.includes('blocked')
    || readinessCopy.includes('held')
    || readinessCopy.includes('pending replacement')
  );
}

export function evaluateRideGroup(rideGroup, alerts = [], drivers = []) {
  const assignedDriverId = rideGroup?.schemaRefs?.driverUserId ?? rideGroup?.driverUserId ?? null;
  const assignedDriver = drivers.find((driver) => (
    driver?.userId === assignedDriverId
    || driver?.userId === rideGroup?.driverAssignment?.userId
    || driver?.unitId === rideGroup?.driverAssignment?.unitId
    || driver?.unitId === rideGroup?.driverUnitId
  )) ?? null;

  const riderCount = rideGroup?.assignedRiderCount ?? rideGroup?.ridersJoined ?? 0;
  const capacity = rideGroup?.capacity ?? 0;
  const unresolvedAlerts = alerts.filter((alert) => alert?.status !== 'Resolved');
  const criticalAlerts = unresolvedAlerts.filter((alert) => alert?.severity === 'Critical');
  const waitingMinutes = minutesSince(rideGroup?.createdAt);
  const noDriver = !assignedDriverId;
  const delayedDriver = normalizeDriverState(assignedDriver) === 'delayed';
  const overCapacity = capacity > 0 && riderCount >= capacity;
  const readinessBlocked = isReadinessBlocked(rideGroup);
  const staleUnassigned = noDriver && waitingMinutes > WAITING_THRESHOLD_MINUTES;

  let priorityScore = 0;
  if (noDriver) priorityScore += PRIORITY_FACTORS.noDriver;
  if (criticalAlerts.length > 0) priorityScore += PRIORITY_FACTORS.criticalAlert;
  if (delayedDriver) priorityScore += PRIORITY_FACTORS.delayedDriver;
  if (overCapacity) priorityScore += PRIORITY_FACTORS.overCapacity;
  if (readinessBlocked) priorityScore += PRIORITY_FACTORS.readinessBlocked;

  const recommendations = [];
  const recommendationTypes = new Set();

  if (staleUnassigned || delayedDriver) {
    recommendationTypes.add('REASSIGN_DRIVER');
    recommendations.push(makeRecommendation(
      'REASSIGN_DRIVER',
      criticalAlerts.length > 0 ? 'critical' : 'high',
      staleUnassigned ? 0.94 : 0.81,
    ));
  }

  if (overCapacity) {
    recommendationTypes.add('CLOSE_JOINING');
    recommendations.push(makeRecommendation('CLOSE_JOINING', 'medium', 0.88));
  }

  if (criticalAlerts.length > 0) {
    recommendationTypes.add('ESCALATE_ALERT');
    recommendations.push(makeRecommendation('ESCALATE_ALERT', 'critical', 0.92));
  }

  if (rideGroup?.flagged && !readinessBlocked && criticalAlerts.length === 0) {
    recommendationTypes.add('RESOLVE_FLAG');
    recommendations.push(makeRecommendation('RESOLVE_FLAG', 'low', 0.63));
  }

  const autoFlags = [];
  if (staleUnassigned) autoFlags.push('NO_DRIVER_THRESHOLD_EXCEEDED');
  if (criticalAlerts.length > 0) autoFlags.push('CRITICAL_ALERT_PRESENT');
  if (readinessBlocked) autoFlags.push('READINESS_BLOCKED');

  return {
    priorityScore: clampScore(priorityScore),
    recommendations,
    autoFlags,
    meta: {
      waitingMinutes,
      recommendationTypes: Array.from(recommendationTypes),
    },
  };
}

export function evaluateAlert(alert, rideGroup = null) {
  const isCritical = alert?.severity === 'Critical';
  const isUnresolved = alert?.status !== 'Resolved';
  const relatedRideScore = rideGroup?.priorityScore ?? 0;

  let priorityScore = 0;
  if (isCritical) priorityScore += PRIORITY_FACTORS.criticalAlert;
  if (isUnresolved) priorityScore += 20;
  if (alert?.status === 'In Review') priorityScore += 15;
  if (relatedRideScore >= 60) priorityScore += 20;

  const recommendations = [];
  if (isCritical && isUnresolved) {
    recommendations.push(makeRecommendation('ESCALATE_ALERT', 'critical', 0.9));
  }
  if (rideGroup?.flagged && alert?.status === 'Monitoring') {
    recommendations.push(makeRecommendation('ESCALATE_ALERT', 'high', 0.72));
  }

  return {
    priorityScore: clampScore(priorityScore),
    recommendations,
  };
}

export function buildRideGroupTimeline(rideGroup, alerts = []) {
  const timeline = [
    {
      timestamp: rideGroup?.createdAt,
      type: 'RIDE_CREATED',
      description: `Ride group ${rideGroup?.id ?? 'Unknown'} was created.`,
    },
  ];

  if (rideGroup?.schemaRefs?.driverUserId || rideGroup?.driverAssignment?.assigned) {
    timeline.push({
      timestamp: rideGroup?.schemaSnapshot?.driver?.updatedAt ?? rideGroup?.updatedAt,
      type: 'DRIVER_ASSIGNED',
      description: `${rideGroup?.driverAssignment?.name ?? 'Assigned driver'} is attached to this ride group.`,
    });
  }

  alerts.forEach((alert) => {
    timeline.push({
      timestamp: alert.createdAt,
      type: 'ALERT_TRIGGERED',
      description: `${alert.title} was triggered for this ride group.`,
    });
  });

  timeline.push({
    timestamp: rideGroup?.updatedAt,
    type: 'STATUS_UPDATED',
    description: `Ride group status is ${rideGroup?.status ?? 'Unknown'}.`,
  });

  return timeline
    .filter((event) => event.timestamp)
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

export { WAITING_THRESHOLD_MINUTES };
