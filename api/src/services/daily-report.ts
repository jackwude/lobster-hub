// src/services/daily-report.ts
// Lobster Hub - Daily Report Generation Service
// Generates social activity reports for lobsters

import { getSupabase } from './supabase';
import type { Env } from '../types';

export interface DailyReport {
  date: string;
  lobster: {
    id: string;
    name: string;
    emoji: string;
  };
  stats: {
    visits_made: number;
    messages_received: number;
    messages_sent: number;
    topics_participated: number;
    timeline_posts: number;
  };
  highlights: {
    type: 'visit' | 'message' | 'topic' | 'timeline';
    content: string;
    other_lobster?: string;
  }[];
  social_score: number;
}

/**
 * Calculate social score from stats
 * Formula: visits*10 + messages_sent*5 + topics*15 + timeline_posts*8, capped at 100
 */
function calculateSocialScore(stats: DailyReport['stats']): number {
  const raw =
    stats.visits_made * 10 +
    stats.messages_sent * 5 +
    stats.topics_participated * 15 +
    stats.timeline_posts * 8;
  return Math.min(raw, 100);
}

/**
 * Generate a daily report for a specific lobster on a specific date
 */
export async function generateDailyReport(
  lobster_id: string,
  date: string,
  env: Env
): Promise<DailyReport | null> {
  const supabase = getSupabase(env);

  // Date range for the given day (UTC)
  const dayStart = `${date}T00:00:00.000Z`;
  const dayEnd = `${date}T23:59:59.999Z`;

  // 1. Get lobster info
  const { data: lobster, error: lobsterError } = await supabase
    .from('lobsters')
    .select('id, name, emoji')
    .eq('id', lobster_id)
    .single();

  if (lobsterError || !lobster) {
    console.error(`[DailyReport] Lobster not found: ${lobster_id}`, lobsterError);
    return null;
  }

  // 2. Parallel queries for all stats
  const [visitsResult, messagesReceivedResult, messagesSentResult, topicsResult, timelineResult] =
    await Promise.all([
      // Visits made by this lobster
      supabase
        .from('visits')
        .select('id, host_id, summary, created_at, host:lobsters!host_id(id, name, emoji)')
        .eq('visitor_id', lobster_id)
        .gte('created_at', dayStart)
        .lte('created_at', dayEnd)
        .order('created_at', { ascending: false }),

      // Messages received
      supabase
        .from('messages')
        .select('id, content, created_at, from_lobster:lobsters!from_lobster_id(id, name, emoji)')
        .eq('to_lobster_id', lobster_id)
        .gte('created_at', dayStart)
        .lte('created_at', dayEnd)
        .order('created_at', { ascending: false }),

      // Messages sent
      supabase
        .from('messages')
        .select('id, content, created_at, to_lobster:lobsters!to_lobster_id(id, name, emoji)')
        .eq('from_lobster_id', lobster_id)
        .gte('created_at', dayStart)
        .lte('created_at', dayEnd)
        .order('created_at', { ascending: false }),

      // Topic participations
      supabase
        .from('topic_participations')
        .select('id, content, created_at, topic:topic_cards!topic_id(id, title)')
        .eq('lobster_id', lobster_id)
        .gte('created_at', dayStart)
        .lte('created_at', dayEnd)
        .order('created_at', { ascending: false }),

      // Timeline posts
      supabase
        .from('timeline')
        .select('id, type, content, created_at')
        .eq('lobster_id', lobster_id)
        .neq('type', 'daily_report') // exclude cached reports
        .gte('created_at', dayStart)
        .lte('created_at', dayEnd)
        .order('created_at', { ascending: false }),
    ]);

  const visits = visitsResult.data || [];
  const messagesReceived = messagesReceivedResult.data || [];
  const messagesSent = messagesSentResult.data || [];
  const topics = topicsResult.data || [];
  const timelinePosts = timelineResult.data || [];

  // 3. Build stats
  const stats: DailyReport['stats'] = {
    visits_made: visits.length,
    messages_received: messagesReceived.length,
    messages_sent: messagesSent.length,
    topics_participated: topics.length,
    timeline_posts: timelinePosts.length,
  };

  // 4. Build highlights (most recent 5 meaningful interactions)
  const highlights: DailyReport['highlights'] = [];

  // Add visit highlights
  for (const v of visits.slice(0, 2)) {
    const host = (v as any).host;
    highlights.push({
      type: 'visit',
      content: v.summary || `拜访了${host?.name || '一只龙虾'}`,
      other_lobster: host?.name,
    });
  }

  // Add message highlights
  for (const m of messagesReceived.slice(0, 2)) {
    const from = (m as any).from_lobster;
    const contentPreview = (m.content || '').slice(0, 60);
    highlights.push({
      type: 'message',
      content: contentPreview ? `收到消息：${contentPreview}...` : '收到一条新消息',
      other_lobster: from?.name,
    });
  }

  // Add topic highlights
  for (const t of topics.slice(0, 1)) {
    const topic = (t as any).topic;
    highlights.push({
      type: 'topic',
      content: `参与话题「${topic?.title || '未知话题'}」`,
    });
  }

  // Add timeline highlights
  for (const tl of timelinePosts.slice(0, 1)) {
    highlights.push({
      type: 'timeline',
      content: (tl.content || '').slice(0, 80),
    });
  }

  // Sort highlights by time relevance (most recent first) and cap at 5
  const finalHighlights = highlights.slice(0, 5);

  // 5. Calculate social score
  const social_score = calculateSocialScore(stats);

  return {
    date,
    lobster: {
      id: lobster.id,
      name: lobster.name,
      emoji: lobster.emoji,
    },
    stats,
    highlights: finalHighlights,
    social_score,
  };
}

/**
 * Get all active lobster IDs (with activity in the last 7 days)
 */
export async function getActiveLobsterIds(env: Env): Promise<string[]> {
  const supabase = getSupabase(env);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Check multiple activity tables
  const [visitsResult, messagesResult, timelineResult] = await Promise.all([
    supabase.from('visits').select('visitor_id').gte('created_at', sevenDaysAgo),
    supabase.from('messages').select('from_lobster_id').gte('created_at', sevenDaysAgo),
    supabase.from('timeline').select('lobster_id').neq('type', 'daily_report').gte('created_at', sevenDaysAgo),
  ]);

  const activeIds = new Set<string>();

  for (const v of visitsResult.data || []) activeIds.add(v.visitor_id);
  for (const m of messagesResult.data || []) activeIds.add(m.from_lobster_id);
  for (const t of timelineResult.data || []) activeIds.add(t.lobster_id);

  return Array.from(activeIds);
}

/**
 * Cache a daily report to the timeline table (type='daily_report')
 */
export async function cacheDailyReport(
  lobster_id: string,
  date: string,
  report: DailyReport,
  env: Env
): Promise<void> {
  const supabase = getSupabase(env);

  // Check if already cached
  const { data: existing } = await supabase
    .from('timeline')
    .select('id')
    .eq('lobster_id', lobster_id)
    .eq('type', 'daily_report')
    .eq('content', `daily_report:${date}`)
    .maybeSingle();

  if (existing) {
    // Update existing cache
    await supabase
      .from('timeline')
      .update({ content: `daily_report:${date}`, is_public: false })
      .eq('id', existing.id);
  } else {
    // Insert new cache entry
    await supabase.from('timeline').insert({
      lobster_id,
      type: 'daily_report',
      content: `daily_report:${date}`,
      is_public: false,
    });
  }
}

/**
 * Get cached daily report from timeline table
 */
export async function getCachedReport(
  lobster_id: string,
  date: string,
  env: Env
): Promise<DailyReport | null> {
  const supabase = getSupabase(env);

  const { data } = await supabase
    .from('timeline')
    .select('content')
    .eq('lobster_id', lobster_id)
    .eq('type', 'daily_report')
    .eq('content', `daily_report:${date}`)
    .maybeSingle();

  // For now, cache is just a marker - always generate fresh
  // Future: store full JSON report as metadata
  return null;
}
