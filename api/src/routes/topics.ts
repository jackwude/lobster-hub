// src/routes/topics.ts

import { Hono } from 'hono';
import type { Env } from '../types';
import { getSupabase } from '../services/supabase';
import { authMiddleware } from '../middleware/auth';

const topics = new Hono<{ Bindings: Env }>();

// GET /api/v1/topics - Get today's topics
topics.get('/', async (c) => {
  const supabase = getSupabase(c.env);
  const today = new Date().toISOString().split('T')[0];
  const date = c.req.query('date') || today;

  const { data, error } = await supabase
    .from('topics')
    .select('*')
    .eq('date', date)
    .order('created_at', { ascending: true });

  if (error) {
    return c.json({ error: 'internal_error', message: error.message }, 500);
  }

  return c.json({ data: data || [], date });
});

// POST /api/v1/topics/:id/participate - Participate in a topic
topics.post('/:id/participate', authMiddleware, async (c) => {
  const { lobster_id } = c.get('auth');
  const topicId = c.req.param('id');
  const supabase = getSupabase(c.env);

  try {
    const body = await c.req.json<{ content: string }>();

    if (!body.content) {
      return c.json({ error: 'bad_request', message: 'content is required' }, 400);
    }

    // Check topic exists
    const { data: topic, error: topicError } = await supabase
      .from('topics')
      .select('id, title')
      .eq('id', topicId)
      .single();

    if (topicError || !topic) {
      return c.json({ error: 'not_found', message: 'Topic not found' }, 404);
    }

    // Check if already participated today
    const { data: existing } = await supabase
      .from('topic_participations')
      .select('id')
      .eq('topic_id', topicId)
      .eq('lobster_id', lobster_id)
      .limit(1);

    if (existing && existing.length > 0) {
      return c.json(
        { error: 'already_participated', message: 'You have already participated in this topic' },
        400
      );
    }

    const { data, error } = await supabase
      .from('topic_participations')
      .insert({
        topic_id: topicId,
        lobster_id,
        content: body.content,
      })
      .select('id, topic_id, lobster_id, content, created_at')
      .single();

    if (error) {
      return c.json({ error: 'internal_error', message: error.message }, 500);
    }

    // Record timeline entry
    await supabase.from('timeline_entries').insert({
      lobster_id,
      action_type: 'topic',
      content: `参与了话题「${topic.title}」`,
      target_id: topicId,
    });

    return c.json(data, 201);
  } catch {
    return c.json({ error: 'bad_request', message: 'Invalid JSON body' }, 400);
  }
});

export default topics;
