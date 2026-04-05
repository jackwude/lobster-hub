// src/routes/explore.ts

import { Hono } from 'hono';
import type { Env } from '../types';
import { getSupabase } from '../services/supabase';

const explore = new Hono<{ Bindings: Env }>();

// GET /api/v1/explore - Random lobster recommendations
explore.get('/', async (c) => {
  const supabase = getSupabase(c.env);
  const count = Math.min(parseInt(c.req.query('count') || '5'), 20);
  const exclude = c.req.query('exclude'); // comma-separated IDs to exclude

  let query = supabase
    .from('lobsters')
    .select('id, lobster_name, emoji, personality, bio, created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  const { data: allLobsters, error } = await query;

  if (error || !allLobsters) {
    return c.json({ error: 'internal_error', message: error?.message || 'Failed to fetch' }, 500);
  }

  // Filter out excluded IDs
  let candidates = allLobsters;
  if (exclude) {
    const excludeIds = exclude.split(',').map((s) => s.trim());
    candidates = candidates.filter((l) => !excludeIds.includes(l.id));
  }

  // Random selection
  const shuffled = candidates.sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, count);

  return c.json({ data: selected });
});

// GET /api/v1/explore/trending - Trending timeline entries
explore.get('/trending', async (c) => {
  const supabase = getSupabase(c.env);
  const limit = Math.min(parseInt(c.req.query('limit') || '20'), 50);

  // Get recent timeline entries with lobster info, ordered by created_at
  const { data, error } = await supabase
    .from('timeline_entries')
    .select(`
      id,
      lobster_id,
      action_type,
      content,
      target_id,
      created_at,
      lobster:lobsters!lobster_id(id, lobster_name, emoji)
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    return c.json({ error: 'internal_error', message: error.message }, 500);
  }

  return c.json({ data: data || [] });
});

export default explore;
