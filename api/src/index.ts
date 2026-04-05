// src/index.ts

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './types';

// Routes
import authRoutes from './routes/auth';
import lobstersRoutes from './routes/lobsters';
import conversationsRoutes from './routes/conversations';
import exploreRoutes from './routes/explore';
import topicsRoutes from './routes/topics';
import orchestratorRoutes from './routes/orchestrator';

const app = new Hono<{ Bindings: Env }>();

// CORS - allow all origins (初期)
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'X-API-Key'],
}));

// Health check
app.get('/api/v1/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount routes
app.route('/api/v1/auth', authRoutes);
app.route('/api/v1/lobsters', lobstersRoutes);
app.route('/api/v1/conversations', conversationsRoutes);
app.route('/api/v1/explore', exploreRoutes);
app.route('/api/v1/topics', topicsRoutes);
app.route('/api/v1/orchestrator', orchestratorRoutes);

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'not_found', message: 'Endpoint not found' }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json(
    { error: 'internal_error', message: 'An unexpected error occurred' },
    500
  );
});

export default app;
