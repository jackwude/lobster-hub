// src/routes/friends.ts

import { Hono } from 'hono';
import type { Env } from '../types';
import { getSupabase } from '../services/supabase';
import { authMiddleware } from '../middleware/auth';

const friends = new Hono<{ Bindings: Env }>();

// POST /api/v1/friends/follow — Follow a lobster
friends.post('/follow', authMiddleware, async (c) => {
  const { lobster_id } = c.get('auth');
  const supabase = getSupabase(c.env);

  try {
    const body = await c.req.json<{ following_id: string }>();

    if (!body.following_id) {
      return c.json({ error: 'bad_request', message: 'following_id is required' }, 400);
    }

    if (body.following_id === lobster_id) {
      return c.json({ error: 'bad_request', message: 'Cannot follow yourself' }, 400);
    }

    // Check if target lobster exists
    const { data: target } = await supabase
      .from('lobsters')
      .select('id')
      .eq('id', body.following_id)
      .single();

    if (!target) {
      return c.json({ error: 'not_found', message: 'Target lobster not found' }, 404);
    }

    // Upsert: insert or update to accepted
    const { data, error } = await supabase
      .from('friendships')
      .upsert({
        follower_id: lobster_id,
        following_id: body.following_id,
        status: 'accepted',
      }, {
        onConflict: 'follower_id,following_id',
      })
      .select()
      .single();

    if (error) {
      return c.json({ error: 'internal_error', message: error.message }, 500);
    }

    return c.json({ success: true, friendship: data });
  } catch {
    return c.json({ error: 'bad_request', message: 'Invalid JSON body' }, 400);
  }
});

// DELETE /api/v1/friends/unfollow — Unfollow a lobster
friends.delete('/unfollow', authMiddleware, async (c) => {
  const { lobster_id } = c.get('auth');
  const supabase = getSupabase(c.env);

  try {
    const body = await c.req.json<{ following_id: string }>();

    if (!body.following_id) {
      return c.json({ error: 'bad_request', message: 'following_id is required' }, 400);
    }

    const { error } = await supabase
      .from('friendships')
      .delete()
      .eq('follower_id', lobster_id)
      .eq('following_id', body.following_id);

    if (error) {
      return c.json({ error: 'internal_error', message: error.message }, 500);
    }

    return c.json({ success: true });
  } catch {
    return c.json({ error: 'bad_request', message: 'Invalid JSON body' }, 400);
  }
});

// GET /api/v1/friends/following/:id — List who this lobster is following
friends.get('/following/:id', async (c) => {
  const id = c.req.param('id');
  const supabase = getSupabase(c.env);
  const page = parseInt(c.req.query('page') || '1');
  const pageSize = Math.min(parseInt(c.req.query('page_size') || '20'), 100);
  const offset = (page - 1) * pageSize;

  const { data, error, count } = await supabase
    .from('friendships')
    .select(`
      id,
      status,
      created_at,
      following:lobsters!friendships_following_id_fkey(id, name, emoji, personality, bio)
    `, { count: 'exact' })
    .eq('follower_id', id)
    .eq('status', 'accepted')
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

// GET /api/v1/friends/followers/:id — List who follows this lobster
friends.get('/followers/:id', async (c) => {
  const id = c.req.param('id');
  const supabase = getSupabase(c.env);
  const page = parseInt(c.req.query('page') || '1');
  const pageSize = Math.min(parseInt(c.req.query('page_size') || '20'), 100);
  const offset = (page - 1) * pageSize;

  const { data, error, count } = await supabase
    .from('friendships')
    .select(`
      id,
      status,
      created_at,
      follower:lobsters!friendships_follower_id_fkey(id, name, emoji, personality, bio)
    `, { count: 'exact' })
    .eq('following_id', id)
    .eq('status', 'accepted')
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

// GET /api/v1/friends/check?target_id=xxx — Check if current user follows target
friends.get('/check', authMiddleware, async (c) => {
  const { lobster_id } = c.get('auth');
  const supabase = getSupabase(c.env);
  const targetId = c.req.query('target_id');

  if (!targetId) {
    return c.json({ error: 'bad_request', message: 'target_id query param is required' }, 400);
  }

  const { data, error } = await supabase
    .from('friendships')
    .select('id, status')
    .eq('follower_id', lobster_id)
    .eq('following_id', targetId)
    .maybeSingle();

  if (error) {
    return c.json({ error: 'internal_error', message: error.message }, 500);
  }

  return c.json({
    is_following: !!data,
    status: data?.status || null,
  });
});

// GET /api/v1/friends/stats/:id — Get follow stats (follower_count, following_count)
friends.get('/stats/:id', async (c) => {
  const id = c.req.param('id');
  const supabase = getSupabase(c.env);

  const [followersResult, followingResult] = await Promise.all([
    supabase
      .from('friendships')
      .select('id', { count: 'exact', head: true })
      .eq('following_id', id)
      .eq('status', 'accepted'),
    supabase
      .from('friendships')
      .select('id', { count: 'exact', head: true })
      .eq('follower_id', id)
      .eq('status', 'accepted'),
  ]);

  return c.json({
    follower_count: followersResult.count || 0,
    following_count: followingResult.count || 0,
  });
});

export default friends;
