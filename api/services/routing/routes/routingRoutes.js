import { Router } from 'express';
import { requireAuth } from '../../../middleware/auth.js';
import RoutePlan from '../models/RoutePlan.js';
import buildRoute from '../processors/buildRoute.js';
import checkRouteRisk from '../processors/checkRouteRisk.js';
import estimateRouteMetrics from '../processors/estimateRouteMetrics.js';
import rerouteAroundZones from '../processors/rerouteAroundZones.js';
import scoreRoute from '../processors/scoreRoute.js';

const router = Router();

function serializeRoutePlan(routePlan) {
  return {
    routeRisk: routePlan.routeRisk,
    score: routePlan.score,
    recommendedAction: routePlan.recommendedAction,
    intersectingZones: routePlan.intersectingZones,
    distanceKm: routePlan.distanceKm,
    durationMin: routePlan.durationMin,
    geometry: routePlan.geometry,
    metadata: routePlan.metadata ?? {},
  };
}

function getCoords(input, label) {
  if (!Array.isArray(input) || input.length !== 2) {
    throw new Error(`${label} must be [lng, lat]`);
  }
  return input;
}

router.post('/compute-route', requireAuth, async (req, res) => {
  try {
    const { origin, destination, tripId = null } = req.body ?? {};
    const geometry = buildRoute({
      origin: getCoords(origin, 'origin'),
      destination: getCoords(destination, 'destination'),
    });
    const risk = await checkRouteRisk(geometry);
    const scoring = scoreRoute(risk);
    const metrics = estimateRouteMetrics(geometry);

    const routePlan = await RoutePlan.create({
      tripId,
      origin: { type: 'Point', coordinates: origin },
      destination: { type: 'Point', coordinates: destination },
      geometry: geometry.geometry,
      routeRisk: scoring.routeRisk,
      score: scoring.score,
      recommendedAction: scoring.recommendedAction,
      intersectingZones: risk.intersectingZones.map((zone) => zone.zoneId),
      distanceKm: metrics.distanceKm,
      durationMin: metrics.durationMin,
      metadata: {
        nearbyZones: risk.nearbyZones.map((zone) => zone.zoneId),
        explanation: scoring.explanation,
      },
    });

    res.json({ ok: true, ...serializeRoutePlan(routePlan) });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/check-route', requireAuth, async (req, res) => {
  try {
    const { route } = req.body ?? {};
    const risk = await checkRouteRisk(route?.type ? route : buildRoute({
      origin: getCoords(route?.origin, 'route.origin'),
      destination: getCoords(route?.destination, 'route.destination'),
      waypoints: route?.waypoints ?? [],
    }));
    const scoring = scoreRoute(risk);
    res.json({
      ok: true,
      routeRisk: scoring.routeRisk,
      score: scoring.score,
      recommendedAction: scoring.recommendedAction,
      intersectingZones: risk.intersectingZones.map((zone) => zone.zoneId),
      nearbyZones: risk.nearbyZones.map((zone) => zone.zoneId),
      explanation: scoring.explanation,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/reroute', requireAuth, async (req, res) => {
  try {
    const { origin, destination } = req.body ?? {};
    const directGeometry = buildRoute({
      origin: getCoords(origin, 'origin'),
      destination: getCoords(destination, 'destination'),
    });
    const directRisk = await checkRouteRisk(directGeometry);
    const directScoring = scoreRoute(directRisk);
    const directMetrics = estimateRouteMetrics(directGeometry);

    if (directScoring.routeRisk === 'safe') {
      return res.json({
        ok: true,
        rerouted: false,
        routeRisk: directScoring.routeRisk,
        score: directScoring.score,
        recommendedAction: directScoring.recommendedAction,
        intersectingZones: directRisk.intersectingZones.map((zone) => zone.zoneId),
        distanceKm: directMetrics.distanceKm,
        durationMin: directMetrics.durationMin,
        geometry: directGeometry.geometry,
        explanation: directScoring.explanation,
      });
    }

    const rerouted = await rerouteAroundZones({ origin, destination, directRouteRisk: directRisk });
    res.json({
      ok: true,
      rerouted: rerouted.foundAlternative,
      routeRisk: rerouted.routeRisk,
      score: rerouted.score,
      recommendedAction: rerouted.recommendedAction,
      intersectingZones: rerouted.intersectingZones?.map((zone) => zone.zoneId) ?? [],
      nearbyZones: rerouted.nearbyZones?.map((zone) => zone.zoneId) ?? [],
      distanceKm: rerouted.distanceKm ?? directMetrics.distanceKm,
      durationMin: rerouted.durationMin ?? directMetrics.durationMin,
      geometry: rerouted.geometry?.geometry ?? directGeometry.geometry,
      explanation: rerouted.explanation,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
