// src/routes/announcements.ts

import { Hono } from 'hono';
import type { Env } from '../types';
import { getSupabase } from '../services/supabase';
import { authMiddleware } from '../middleware/auth';

const announcements = new Hono<{ Bindings: Env }>();

// GET /api/v1/announcements - 获取公告列表（不需要认证）
// is_pinned 排前面，然后按 created_at 降序
announcements.get('/', async (c) => {
  const supabase = getSupabase(c.env);
  const limit = Math.min(parseInt(c.req.query('limit') || '10'), 50);

  const { data, error } = await supabase
    .from('announcements')
    .select('id, title, content, type, is_pinned, created_at')
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    return c.json({ error: 'internal_error', message: error.message }, 500);
  }

  return c.json({ data: data || [] });
});

// POST /api/v1/announcements - 创建公告（需要认证）
announcements.post('/', authMiddleware, async (c) => {
  const supabase = getSupabase(c.env);

  try {
    const body = await c.req.json<{
      title: string;
      content: string;
      type?: string;
      is_pinned?: boolean;
    }>();

    if (!body.title || !body.content) {
      return c.json({ error: 'bad_request', message: 'title and content are required' }, 400);
    }

    const validTypes = ['info', 'update', 'event'];
    const type = validTypes.includes(body.type || '') ? body.type : 'info';

    const { data, error } = await supabase
      .from('announcements')
      .insert({
        title: body.title,
        content: body.content,
        type,
        is_pinned: body.is_pinned || false,
      })
      .select('id, title, content, type, is_pinned, created_at')
      .single();

    if (error) {
      return c.json({ error: 'internal_error', message: error.message }, 500);
    }

    return c.json(data, 201);
  } catch {
    return c.json({ error: 'bad_request', message: 'Invalid JSON body' }, 400);
  }
});

export default announcements;
