// src/routes/achievements.ts

import { Hono } from 'hono';
import type { Env } from '../types';
import { getSupabase } from '../services/supabase';

const achievements = new Hono<{ Bindings: Env }>();

// GET /api/v1/achievements/:lobster_id - Get achievements for a lobster
achievements.get('/:lobster_id', async (c) => {
  const lobster_id = c.req.param('lobster_id');
  const supabase = getSupabase(c.env);

  const { data, error } = await supabase
    .from('achievements')
    .select('id, type, title, description, icon, created_at')
    .eq('lobster_id', lobster_id)
    .order('created_at', { ascending: false });

  if (error) {
    return c.json({ error: 'internal_error', message: error.message }, 500);
  }

  return c.json({
    data: data || [],
    total: data?.length || 0,
  });
});

export default achievements;
