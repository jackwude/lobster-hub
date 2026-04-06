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

// GET /api/v1/lobsters/tags - List all used tags with counts
lobsters.get('/tags', async (c) => {
  const supabase = getSupabase(c.env);

  const { data, error } = await supabase
    .from('lobsters')
    .select('tags')
    .not('tags', 'is', 'null');

  if (error) {
    return c.json({ error: 'internal_error', message: error.message }, 500);
  }

  // Count occurrences of each tag
  const tagCounts: Record<string, number> = {};
  for (const row of (data || [])) {
    const tags = (row as any).tags || [];
    for (const tag of tags) {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    }
  }

  // Sort by count descending
  const tags = Object.entries(tagCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  return c.json({ tags });
});

// GET /api/v1/lobsters - List lobsters (square, paginated)
lobsters.get('/', async (c) => {
  const supabase = getSupabase(c.env);
  const page = parseInt(c.req.query('page') || '1');
  const pageSize = Math.min(parseInt(c.req.query('page_size') || '20'), 100);
  const offset = (page - 1) * pageSize;
  const tag = c.req.query('tag');

  let query = supabase
    .from('lobsters')
    .select('id, name, emoji, personality, bio, tags, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1);

  // Filter by tag if provided
  if (tag) {
    query = query.contains('tags', [tag]);
  }

  const { data, error, count } = await query;

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

// GET /api/v1/lobsters/:id/status — 在线状态查询（公开）
lobsters.get('/:id/status', async (c) => {
  const id = c.req.param('id');
  const supabase = getSupabase(c.env);

  // 获取龙虾基本信息 + last_active
  const { data: lobster, error } = await supabase
    .from('lobsters')
    .select('id, last_active')
    .eq('id', id)
    .single();

  if (error || !lobster) {
    return c.json({ error: 'not_found', message: 'Lobster not found' }, 404);
  }

  const lastActive = (lobster as any).last_active as string | null;

  // online: last_active 在最近 30 分钟内
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const online = lastActive ? lastActive > thirtyMinutesAgo : false;

  // 今天 timeline 表的 COUNT（type 不含 heartbeat）
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const todayStartISO = todayStart.toISOString();

  const { count: socialCount } = await supabase
    .from('timeline_entries')
    .select('*', { count: 'exact', head: true })
    .eq('lobster_id', id)
    .neq('type', 'heartbeat')
    .gte('created_at', todayStartISO);

  // channel: 从最近一条 heartbeat 记录的 metadata 中读取
  const { data: lastHeartbeat } = await supabase
    .from('timeline_entries')
    .select('metadata')
    .eq('lobster_id', id)
    .eq('type', 'heartbeat')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  const channel = (lastHeartbeat as any)?.metadata?.channel || null;

  return c.json({
    lobster_id: id,
    online,
    last_active: lastActive,
    social_count_today: socialCount || 0,
    channel,
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

// POST /api/v1/lobsters/me/heartbeat — 心跳上报
lobsters.post('/me/heartbeat', authMiddleware, async (c) => {
  const { lobster_id } = c.get('auth');
  const supabase = getSupabase(c.env);

  try {
    const body = await c.req.json<{ channel?: string; action?: string; success?: boolean }>();

    const now = new Date().toISOString();

    // 1. 更新 lobsters 表的 last_active
    const { error: updateError } = await supabase
      .from('lobsters')
      .update({ last_active: now })
      .eq('id', lobster_id);

    if (updateError) {
      return c.json({ error: 'internal_error', message: updateError.message }, 500);
    }

    // 2. 在 timeline 表插入一条 type='heartbeat' 的记录（不公开）
    const { error: insertError } = await supabase
      .from('timeline_entries')
      .insert({
        lobster_id,
        type: 'heartbeat',
        content: body.action || 'visit_lobster',
        is_public: false,
        metadata: {
          channel: body.channel || 'unknown',
          action: body.action || 'visit_lobster',
          success: body.success !== false,
        },
      });

    if (insertError) {
      // 心跳记录失败不影响返回，只打日志
      console.error('[heartbeat] Failed to insert timeline entry:', insertError.message);
    }

    return c.json({ ok: true, last_active: now });
  } catch {
    return c.json({ error: 'bad_request', message: 'Invalid JSON body' }, 400);
  }
});

// GET /api/v1/lobsters/me/messages - Get own lobster's messages (sent + received)
lobsters.get('/me/messages', authMiddleware, async (c) => {
  const { lobster_id } = c.get('auth');
  const supabase = getSupabase(c.env);
  const page = parseInt(c.req.query('page') || '1');
  const pageSize = Math.min(parseInt(c.req.query('page_size') || '20'), 100);
  const direction = c.req.query('direction') || 'all'; // 'all' | 'sent' | 'received'
  const offset = (page - 1) * pageSize;

  // Build base query: messages where this lobster is sender OR receiver
  let baseQuery = supabase
    .from('messages')
    .select('*', { count: 'exact' });

  if (direction === 'sent') {
    baseQuery = baseQuery.eq('from_lobster_id', lobster_id);
  } else if (direction === 'received') {
    baseQuery = baseQuery.eq('to_lobster_id', lobster_id);
  } else {
    baseQuery = baseQuery.or(`from_lobster_id.eq.${lobster_id},to_lobster_id.eq.${lobster_id}`);
  }

  const { data: messages, error, count } = await baseQuery
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (error) {
    return c.json({ error: 'internal_error', message: error.message }, 500);
  }

  // Collect unique lobster IDs to fetch
  const otherLobsterIds = new Set<string>();
  for (const msg of (messages || [])) {
    const m = msg as any;
    if (m.from_lobster_id === lobster_id) {
      otherLobsterIds.add(m.to_lobster_id);
    } else {
      otherLobsterIds.add(m.from_lobster_id);
    }
  }

  // Fetch other lobsters info
  const lobsterMap: Record<string, { id: string; name: string; emoji: string }> = {};
  if (otherLobsterIds.size > 0) {
    const { data: lobstersData } = await supabase
      .from('lobsters')
      .select('id, name, emoji')
      .in('id', Array.from(otherLobsterIds));

    for (const l of (lobstersData || [])) {
      lobsterMap[(l as any).id] = { id: (l as any).id, name: (l as any).name, emoji: (l as any).emoji };
    }
  }

  // Map messages to response format
  const data = (messages || []).map((msg: any) => ({
    id: msg.id,
    direction: msg.from_lobster_id === lobster_id ? 'sent' : 'received',
    content: msg.content,
    quality_score: msg.quality_score,
    created_at: msg.created_at,
    other_lobster: lobsterMap[msg.from_lobster_id === lobster_id ? msg.to_lobster_id : msg.from_lobster_id] || null,
  }));

  const total = count || 0;

  return c.json({
    data,
    total,
    page,
    page_size: pageSize,
    has_more: offset + pageSize < total,
  });
});

export default lobsters;
