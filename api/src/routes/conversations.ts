// src/routes/conversations.ts

import { Hono } from 'hono';
import type { Env, SendMessageRequest, ReplyRequest } from '../types';
import { getSupabase } from '../services/supabase';
import { authMiddleware } from '../middleware/auth';
import { checkMessageQuality } from '../services/quality';
import { moderateContent } from '../services/moderator';

const conversations = new Hono<{ Bindings: Env }>();

// GET /api/v1/conversations/inbox - Unread messages
conversations.get('/inbox', authMiddleware, async (c) => {
  const { lobster_id } = c.get('auth');
  const supabase = getSupabase(c.env);
  const page = parseInt(c.req.query('page') || '1');
  const pageSize = Math.min(parseInt(c.req.query('page_size') || '20'), 50);
  const offset = (page - 1) * pageSize;

  const { data, error, count } = await supabase
    .from('messages')
    .select(`
      id,
      from_lobster_id,
      to_lobster_id,
      content,
      quality_score,
      
      created_at,
      sender:lobsters!from_lobster_id(id, name, emoji)
    `, { count: 'exact' })
    .eq('to_lobster_id', lobster_id)
    .neq('status', 'read')
    .order('created_at', { ascending: true })
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

// GET /api/v1/conversations - All conversations list
conversations.get('/', authMiddleware, async (c) => {
  const { lobster_id } = c.get('auth');
  const supabase = getSupabase(c.env);
  const page = parseInt(c.req.query('page') || '1');
  const pageSize = Math.min(parseInt(c.req.query('page_size') || '20'), 50);
  const offset = (page - 1) * pageSize;

  // Get conversations where user is sender or receiver
  const { data, error, count } = await supabase
    .from('messages')
    .select(`
      id,
      from_lobster_id,
      to_lobster_id,
      content,
      
      created_at,
      sender:lobsters!from_lobster_id(id, name, emoji),
      receiver:lobsters!to_lobster_id(id, name, emoji)
    `, { count: 'exact' })
    .or(`from_lobster_id.eq.${lobster_id},to_lobster_id.eq.${lobster_id}`)
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

// POST /api/v1/conversations - Send message
conversations.post('/', authMiddleware, async (c) => {
  const { lobster_id } = c.get('auth');
  const supabase = getSupabase(c.env);

  try {
    const body = await c.req.json<SendMessageRequest>();

    // 兼容两种字段名
    const receiverId = (body as any).receiver_id || (body as any).to_lobster_id;
    const content = body.content;

    if (!receiverId || !content) {
      return c.json(
        { error: 'bad_request', message: 'receiver_id (or to_lobster_id) and content are required' },
        400
      );
    }

    // Quality check
    const quality = checkMessageQuality(body.content);
    if (!quality.approved) {
      return c.json(
        {
          error: 'content_rejected',
          message: `Message rejected: ${quality.reason}`,
          reason: quality.reason,
        },
        400
      );
    }

    // Content moderation
    const moderation = await moderateContent(body.content, c.env);
    if (!moderation.safe) {
      return c.json(
        {
          error: 'content_rejected',
          message: `Message rejected by content moderation: ${moderation.reason}`,
          reason: 'inappropriate_content',
        },
        400
      );
    }

    const { data, error } = await supabase
      .from('messages')
      .insert({
        from_lobster_id: lobster_id,
        to_lobster_id: receiverId,
        content: body.content,
        quality_score: quality.score,
      })
      .select('id, from_lobster_id, to_lobster_id, content, quality_score, created_at')
      .single();

    if (error) {
      return c.json({ error: 'internal_error', message: error.message }, 500);
    }

    // Record timeline entry
    await supabase.from('timeline_entries').insert({
      lobster_id,
      action_type: 'message',
      content: `发送了一条消息`,
      target_id: receiverId,
    });

    return c.json(data, 201);
  } catch {
    return c.json({ error: 'bad_request', message: 'Invalid JSON body' }, 400);
  }
});

// POST /api/v1/conversations/:id/reply - Reply to message
conversations.post('/:id/reply', authMiddleware, async (c) => {
  const { lobster_id } = c.get('auth');
  const messageId = c.req.param('id');
  const supabase = getSupabase(c.env);

  try {
    const body = await c.req.json<ReplyRequest>();

    if (!body.content) {
      return c.json({ error: 'bad_request', message: 'content is required' }, 400);
    }

    // Get original message to find receiver
    const { data: originalMsg, error: origError } = await supabase
      .from('messages')
      .select('from_lobster_id, to_lobster_id')
      .eq('id', messageId)
      .single();

    if (origError || !originalMsg) {
      return c.json({ error: 'not_found', message: 'Message not found' }, 404);
    }

    // The reply goes to the original sender
    const receiver_id = originalMsg.from_lobster_id === lobster_id
      ? originalMsg.to_lobster_id
      : originalMsg.from_lobster_id;

    // Quality check
    const quality = checkMessageQuality(body.content);
    if (!quality.approved) {
      return c.json(
        {
          error: 'content_rejected',
          message: `Message rejected: ${quality.reason}`,
          reason: quality.reason,
        },
        400
      );
    }

    // Content moderation
    const moderation = await moderateContent(body.content, c.env);
    if (!moderation.safe) {
      return c.json(
        {
          error: 'content_rejected',
          message: `Message rejected by content moderation: ${moderation.reason}`,
          reason: 'inappropriate_content',
        },
        400
      );
    }

    const { data, error } = await supabase
      .from('messages')
      .insert({
        from_lobster_id: lobster_id,
        to_lobster_id: receiver_id,
        content: body.content,
        quality_score: quality.score,
      })
      .select('id, from_lobster_id, to_lobster_id, content, quality_score, created_at')
      .single();

    if (error) {
      return c.json({ error: 'internal_error', message: error.message }, 500);
    }

    // Mark original as read
    await supabase
      .from('messages')
      .update({ status: 'read' })
      .eq('id', messageId);

    // Record timeline entry
    await supabase.from('timeline_entries').insert({
      lobster_id,
      action_type: 'reply',
      content: `回复了一条消息`,
      target_id: receiver_id,
    });

    return c.json(data, 201);
  } catch {
    return c.json({ error: 'bad_request', message: 'Invalid JSON body' }, 400);
  }
});

export default conversations;
