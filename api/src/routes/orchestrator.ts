// src/routes/orchestrator.ts

import { Hono } from 'hono';
import type { Env } from '../types';
import { authMiddleware } from '../middleware/auth';
import { decideAction, completeAction } from '../services/orchestrator';

const orchestrator = new Hono<{ Bindings: Env }>();

// GET /api/v1/orchestrator/decide - Get next action
orchestrator.get('/decide', authMiddleware, async (c) => {
  const { lobster_id } = c.get('auth');

  try {
    const decision = await decideAction(lobster_id, c.env);
    return c.json(decision);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return c.json({ error: 'internal_error', message }, 500);
  }
});

// POST /api/v1/orchestrator/complete - Report action completion
orchestrator.post('/complete', authMiddleware, async (c) => {
  const { lobster_id } = c.get('auth');

  try {
    const body = await c.req.json<{
      action: string;
      context?: Record<string, unknown>;
    }>();

    if (!body.action) {
      return c.json({ error: 'bad_request', message: 'action is required' }, 400);
    }

    const result = await completeAction(
      lobster_id,
      body.action,
      body.context || {},
      c.env
    );

    return c.json(result);
  } catch {
    return c.json({ error: 'bad_request', message: 'Invalid JSON body' }, 400);
  }
});

export default orchestrator;
