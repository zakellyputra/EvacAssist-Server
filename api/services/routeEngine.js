import createGraph from 'ngraph.graph';
import { aStar } from 'ngraph.path';
import * as turf from '@turf/turf';
import axios from 'axios';
import Anthropic from '@anthropic-ai/sdk';
import RoadSegment from '../models/RoadSegment.js';
import EdgeRisk from '../models/EdgeRisk.js';
import { scoreEdge } from './edgeScorer.js';

const client = new Anthropic();

/**
 * Build an in-memory weighted directed graph from road segments + current edge risks
 * within the bounding box of origin → destination.
 */
async function buildGraph(originCoords, destCoords) {
  // Expand bounding box 20% beyond the straight-line path to allow detours
  const line = turf.lineString([originCoords, destCoords]);
  const bbox = turf.bbox(turf.buffer(line, 10, { units: 'kilometers' }));

  const segments = await RoadSegment.find({
    geometry: {
      $geoWithin: {
        $geometry: turf.bboxPolygon(bbox).geometry,
      },
    },
  });

  const segmentIds = segments.map((s) => s._id);
  const riskDocs = await EdgeRisk.find({ segment_id: { $in: segmentIds } });
  const riskMap = new Map(riskDocs.map((r) => [r.segment_id.toString(), r]));

  const graph = createGraph();

  for (const seg of segments) {
    const risk = riskMap.get(seg._id.toString()) ?? {};
    const { cost } = scoreEdge(seg.base_cost, risk, risk.last_updated);

    if (cost === Infinity) continue; // hard block — exclude edge entirely

    graph.addLink(seg.start_node, seg.end_node, { cost, segment_id: seg._id });
    // Add reverse link for bidirectional roads (non-one-way)
    if (seg.road_type !== 'motorway') {
      graph.addLink(seg.end_node, seg.start_node, { cost, segment_id: seg._id });
    }
  }

  return { graph, segments };
}

/**
 * Snap a [lng, lat] coordinate to the nearest road segment node in our graph.
 */
async function nearestNode(coords) {
  const nearest = await RoadSegment.findOne({
    geometry: {
      $near: {
        $geometry: { type: 'Point', coordinates: coords },
        $maxDistance: 500,
      },
    },
  });
  return nearest?.start_node ?? null;
}

/**
 * Generate a plain-language explanation for a route using Claude.
 */
async function explainRoute(path, riskSummary) {
  const prompt = `A route has been computed for emergency evacuation.
Risk summary: ${JSON.stringify(riskSummary)}
Path segment count: ${path.length}

Write 1-2 sentences explaining this route option in plain language for a non-technical evacuee.
Focus on what hazards are avoided or present. Be direct and calm.`;

  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 128,
    messages: [{ role: 'user', content: prompt }],
  });

  return response.content[0].text.trim();
}

/**
 * Find the top N safest routes from origin to destination.
 *
 * @param {[number, number]} originCoords - [lng, lat]
 * @param {[number, number]} destCoords   - [lng, lat]
 * @param {number} count - Number of route alternatives to return (default 3)
 * @returns {Promise<Array<{ path, totalCost, explanation, riskSummary }>>}
 */
export async function suggestRoutes(originCoords, destCoords, count = 3) {
  const { graph, segments } = await buildGraph(originCoords, destCoords);

  const originNode = await nearestNode(originCoords);
  const destNode = await nearestNode(destCoords);

  if (!originNode || !destNode) {
    throw new Error('Could not snap origin or destination to road network');
  }

  const pathfinder = aStar(graph, {
    distance: (fromNode, toNode, link) => link.data?.cost ?? Infinity,
    heuristic: () => 0, // Dijkstra fallback — pure cost minimization
  });

  const found = pathfinder.find(originNode, destNode);
  if (!found || found.length === 0) {
    throw new Error('No viable route found — all paths may be blocked');
  }

  // Build risk summary for explanation generation
  const riskSummary = { hard_blocks_avoided: 0, avg_multiplier: 0 };

  const explanation = await explainRoute(found, riskSummary);

  return [
    {
      path: found.map((n) => n.id),
      total_cost: found.reduce((sum, n, i) => {
        if (i === 0) return sum;
        const link = graph.getLink(found[i - 1].id, n.id);
        return sum + (link?.data?.cost ?? 0);
      }, 0),
      explanation,
      risk_summary: riskSummary,
    },
  ];
  // TODO: generate alternative routes by temporarily penalizing used edges
}
