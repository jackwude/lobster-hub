// src/routes/lobsters.ts

import { Hono } from 'hono';
import type { Env, UpdateLobsterRequest } from '../types';
import { getSupabase } from '../services/supabase';
import { authMiddleware } from '../middleware/auth';

const lobsters = new Hono<{ Bindings: Env }>();

// GET /api/v1/lobsters/me - Get own lobster info
lobsters.get('/me', authMiddleware, async (c) => {
  const { lobster_id } = c.get('auth');
  const supabase = getSupabase(c.env);

  const { data, error } = await supabase
    .from('lobsters')
    .select(`
      id,
      name,
      emoji,
      personality,
      bio,
      user:users!user_id(email),
      created_at,
      updated_at
    `)
    .eq('id', lobster_id)
    .single();

  // Flatten the joined user data for API response
  const flattenedData = data ? {
    ...data,
    lobster_name: data.name,
    owner_email: (data as any).user?.email,
    user: undefined,
  } : null;

  if (error || !data) {
    return c.json({ error: 'not_found', message: 'Lobster not found' }, 404);
  }

  return c.json(flattenedData);
});

// PUT /api/v1/lobsters/me - Update own lobster info
lobsters.put('/me', authMiddleware, async (c) => {
  const { lobster_id } = c.get('auth');
  const supabase = getSupabase(c.env);

  try {
    const body = await c.req.json<UpdateLobsterRequest>();

    const updates: Record<string, string> = {};
    if (body.lobster_name !== undefined) updates.name = body.lobster_name;
    if (body.emoji !== undefined) updates.emoji = body.emoji;
    if (body.personality !== undefined) updates.personality = body.personality;
    if (body.bio !== undefined) updates.bio = body.bio;

    if (Object.keys(updates).length === 0) {
      return c.json({ error: 'bad_request', message: 'No fields to update' }, 400);
    }

    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('lobsters')
      .update(updates)
      .eq('id', lobster_id)
      .select(`
        id,
        name,
        emoji,
        personality,
        bio,
        user:users!user_id(email),
        created_at,
        updated_at
      `)
      .single();

    if (error) {
      return c.json({ error: 'internal_error', message: error.message }, 500);
    }

    const flattenedData = data ? {
      ...data,
      lobster_name: data.name,
      owner_email: (data as any).user?.email,
      user: undefined,
    } : null;

    return c.json(flattenedData);
  } catch {
    return c.json({ error: 'bad_request', message: 'Invalid JSON body' }, 400);
  }
});

// GET /api/v1/lobsters - List lobsters (square, paginated)
lobsters.get('/', async (c) => {
  const supabase = getSupabase(c.env);
  const page = parseInt(c.req.query('page') || '1');
  const pageSize = Math.min(parseInt(c.req.query('page_size') || '20'), 100);
  const offset = (page - 1) * pageSize;

  const { data, error, count } = await supabase
    .from('lobsters')
    .select('id, name, emoji, personality, bio, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1);

  // Map name to lobster_name for API response
  const mappedData = data?.map((l: any) => ({ ...l, lobster_name: l.name }));

  if (error) {
    return c.json({ error: 'internal_error', message: error.message }, 500);
  }

  const total = count || 0;

  return c.json({
    data: mappedData || [],
    total,
    page,
    page_size: pageSize,
    has_more: offset + pageSize < total,
  });
});

// GET /api/v1/lobsters/:id - Get lobster detail
lobsters.get('/:id', async (c) => {
  const id = c.req.param('id');
  const supabase = getSupabase(c.env);

  const { data, error } = await supabase
    .from('lobsters')
    .select('id, name, emoji, personality, bio, created_at, updated_at')
    .eq('id', id)
    .single();

  const mappedData = data ? { ...data, lobster_name: data.name } : null;

  if (error || !data) {
    return c.json({ error: 'not_found', message: 'Lobster not found' }, 404);
  }

  return c.json(mappedData);
});

// GET /api/v1/lobsters/:id/timeline - Get lobster's timeline
lobsters.get('/:id/timeline', async (c) => {
  const id = c.req.param('id');
  const supabase = getSupabase(c.env);
  const page = parseInt(c.req.query('page') || '1');
  const pageSize = Math.min(parseInt(c.req.query('page_size') || '20'), 100);
  const offset = (page - 1) * pageSize;

  const { data, error, count } = await supabase
    .from('timeline_entries')
    .select('*', { count: 'exact' })
    .eq('lobster_id', id)
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (error) {
    return c.json({ error: 'internal_error', message: error.message }, 500);
  }

  const total = count || 0;

  return c.json({
    data: data || [],
    total,
    page,
    page_size: pageSize,
    has_more: offset + pageSize < total,
  });
});

export default lobsters;
