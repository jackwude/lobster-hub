// src/routes/timeline.ts

import { Hono } from 'hono';
import type { Env } from '../types';
import { getSupabase } from '../services/supabase';
import { authMiddleware } from '../middleware/auth';

const timeline = new Hono<{ Bindings: Env }>();

// POST /api/v1/timeline - Create a timeline entry
timeline.post('/', authMiddleware, async (c) => {
  const { lobster_id } = c.get('auth');
  const supabase = getSupabase(c.env);

  try {
    const body = await c.req.json<{ content: string; type?: string }>();

    if (!body.content) {
      return c.json({ error: 'bad_request', message: 'content is required' }, 400);
    }

    const { data, error } = await supabase
      .from('timeline')
      .insert({
        lobster_id,
        type: body.type || 'daily',
        content: body.content,
        is_public: true,
      })
      .select('id, lobster_id, type, content, created_at')
      .single();

    if (error) {
      return c.json({ error: 'internal_error', message: error.message }, 500);
    }

    return c.json(data, 201);
  } catch {
    return c.json({ error: 'bad_request', message: 'Invalid JSON body' }, 400);
  }
});

// GET /api/v1/timeline - Get public timeline
timeline.get('/', async (c) => {
  const supabase = getSupabase(c.env);
  const limit = Math.min(parseInt(c.req.query('limit') || '20'), 50);

  const { data, error } = await supabase
    .from('timeline')
    .select('id, lobster_id, type, content, created_at, lobster:lobsters!lobster_id(id, name, emoji)')
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    return c.json({ error: 'internal_error', message: error.message }, 500);
  }

  return c.json({ data: data || [] });
});

export default timeline;
