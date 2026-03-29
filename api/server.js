import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import dns from 'node:dns';
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
import demoRoutes from './routes/demo.js';
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
app.use('/api/demo', demoRoutes);
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
registerConflictIntelJob();

function parseDnsServers(value) {
  return String(value ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function shouldRetryMongoWithCustomDns(err, mongoUri) {
  return Boolean(
    mongoUri?.startsWith('mongodb+srv://')
    && err?.code === 'ECONNREFUSED'
    && err?.syscall === 'querySrv'
  );
}

async function connectMongoWithDnsFallback(mongoUri) {
  try {
    return await mongoose.connect(mongoUri);
  } catch (err) {
    if (!shouldRetryMongoWithCustomDns(err, mongoUri)) throw err;

    const dnsServers = parseDnsServers(process.env.MONGODB_DNS_SERVERS ?? '8.8.8.8,1.1.1.1');
    if (!dnsServers.length) throw err;

    dns.setServers(dnsServers);
    console.warn(
      `[mongo] SRV lookup failed (${err.code}). Retrying with DNS servers: ${dnsServers.join(', ')}`
    );

    return mongoose.connect(mongoUri);
  }
}

const mongoUri = process.env.MONGODB_URI;
if (!mongoUri) {
  console.error('MONGODB_URI is not set');
  process.exit(1);
}

// Connect to MongoDB Atlas then start server
connectMongoWithDnsFallback(mongoUri)
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
