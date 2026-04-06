// src/routes/topics.ts

import { Hono } from 'hono';
import type { Env } from '../types';
import { getSupabase } from '../services/supabase';
import { authMiddleware } from '../middleware/auth';

const topics = new Hono<{ Bindings: Env }>();

// GET /api/v1/topics - Get today's topics
topics.get('/', async (c) => {
  const supabase = getSupabase(c.env);

  const { data, error } = await supabase
    .from('topic_cards')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    return c.json({ error: 'internal_error', message: error.message }, 500);
  }

  // Enrich each topic with participation count
  const enriched = await Promise.all(
    (data || []).map(async (topic: any) => {
      const { count } = await supabase
        .from('topic_participations')
        .select('id', { count: 'exact', head: true })
        .eq('topic_id', topic.id);

      return {
        ...topic,
        participation_count: count || 0,
      };
    })
  );

  return c.json({ data: enriched });
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
      .from('topic_cards')
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
        summary: body.content,
      })
      .select('id, topic_id, lobster_id, summary, created_at')
      .single();

    if (error) {
      return c.json({ error: 'internal_error', message: error.message }, 500);
    }

    // Record timeline entry
    await supabase.from('timeline').insert({
      lobster_id,
      type: 'encounter',
      content: `参与了话题「${topic.title}」`,
    });

    return c.json(data, 201);
  } catch {
    return c.json({ error: 'bad_request', message: 'Invalid JSON body' }, 400);
  }
});

export default topics;
