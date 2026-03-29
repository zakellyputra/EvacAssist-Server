import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import cron from 'node-cron';

import authRoutes from './routes/auth.js';
import tripRoutes from './routes/trips.js';
import incidentRoutes from './routes/incidents.js';
import routeRoutes from './routes/routes.js';
import edgeRoutes from './routes/edges.js';
import zoneRoutes from './routes/zones.js';
import syncRoutes from './routes/sync.js';
import paymentRoutes from './routes/payment.js';
import userRoutes from './routes/users.js';
import aiRoutes from './routes/ai.js';
import conflictRoutes from './routes/conflicts.js';
import User from './models/User.js';
import {
  conflictAdminRoutes,
  conflictPublicRoutes,
  registerConflictIntelJob,
  syncConflictIntelIndexes,
} from './services/conflict-intel/index.js';
import { routingRoutes, syncRoutingIndexes } from './services/routing/index.js';
import { pickupZoneRoutes, syncPickupZoneIndexes } from './services/pickup-zones/index.js';

import { verifyToken } from './middleware/auth.js';
import { registerSocketEvents } from './socket/events.js';
import { decayIncidents } from './services/geoFusion.js';
import auditLogger from './services/auditLogger.js';

const app = express();
const httpServer = createServer(app);

// Socket.io — JWT passed in auth object, never query params
export const io = new Server(httpServer, {
  cors: { origin: '*' },
});

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Missing token'));
  try {
    socket.user = verifyToken(token);
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

registerSocketEvents(io);

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // accommodate base64 image payloads

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/edges', edgeRoutes);
app.use('/api/zones', zoneRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/conflicts', conflictRoutes);
app.use('/api/conflict', conflictPublicRoutes);
app.use('/api/admin/conflict', conflictAdminRoutes);
app.use('/api/routing', routingRoutes);
app.use('/api/pickup-zones', pickupZoneRoutes);

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// Scheduled jobs
// Decay incident freshness + remove expired incidents every hour
cron.schedule('0 * * * *', () => {
  decayIncidents().catch(console.error);
});

// Basic audit log verification daily
cron.schedule('0 3 * * *', () => {
  auditLogger.verifyBasic()
    .then(result => console.log('[audit] daily verification:', result))
    .catch(error => console.error('[audit] verification failed:', error));
});

registerConflictIntelJob();

// Connect to MongoDB Atlas then start server
mongoose
  .connect(process.env.MONGODB_URI)
  .then(async () => {
    await User.syncIndexes();
    await syncConflictIntelIndexes();
    await syncRoutingIndexes();
    await syncPickupZoneIndexes();
    console.log('MongoDB Atlas connected');
    httpServer.listen(process.env.PORT ?? 3000, () => {
      console.log(`Server running on port ${process.env.PORT ?? 3000}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
