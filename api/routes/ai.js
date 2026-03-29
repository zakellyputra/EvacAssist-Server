import { Router } from 'express';
import { z } from 'zod';
import { generateRideAssistantResponse } from '../services/openaiRideAssistant.js';

const router = Router();

const rideAssistantRequestSchema = z.object({
  rideGroupId: z.string().optional(),
  operatorQuestion: z.string().max(240).optional(),
  rideContext: z.object({
    id: z.string(),
    priorityScore: z.number().optional(),
    lifecycleStatus: z.string().optional(),
    actionState: z.string().optional(),
    readinessState: z.string().optional(),
    departureReadiness: z.string().optional(),
    vehicleId: z.string().nullable().optional(),
    driverAssignment: z.object({
      name: z.string().nullable().optional(),
      status: z.string().optional(),
      unitId: z.string().nullable().optional(),
      vehicleId: z.string().nullable().optional(),
      assigned: z.boolean().optional(),
    }).optional(),
    activeIssues: z.array(z.object({
      label: z.string().optional(),
      status: z.string().optional(),
      severity: z.string().optional(),
    })).optional(),
    linkedAlerts: z.array(z.object({
      id: z.string(),
      code: z.string().optional(),
      title: z.string().optional(),
      status: z.string().optional(),
      severity: z.string().optional(),
    })).optional(),
    recommendations: z.array(z.object({
      type: z.string().optional(),
      message: z.string().optional(),
      reason: z.string().optional(),
    })).optional(),
    timeline: z.array(z.object({
      timestamp: z.string().optional(),
      type: z.string().optional(),
      description: z.string().optional(),
    })).optional(),
    auditTrail: z.array(z.object({
      timestamp: z.string().optional(),
      actionType: z.string().optional(),
      actor: z.string().optional(),
      description: z.string().optional(),
      note: z.string().optional(),
    })).optional(),
  }),
});

router.post('/ride-assistant', async (req, res) => {
  try {
    const parsed = rideAssistantRequestSchema.parse(req.body);
    const result = await generateRideAssistantResponse({
      rideContext: parsed.rideContext,
      operatorQuestion: parsed.operatorQuestion ?? '',
    });
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid ride assistant payload', details: error.flatten() });
    }

    const status = error.status ?? 500;
    return res.status(status).json({
      error: error.message || 'Could not generate recommendations',
    });
  }
});

export default router;

