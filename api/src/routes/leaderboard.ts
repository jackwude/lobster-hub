// src/routes/leaderboard.ts
// Lobster Hub - Leaderboard API

import { Hono } from 'hono';
import type { Env } from '../types';
import { getSupabase } from '../services/supabase';

const leaderboard = new Hono<{ Bindings: Env }>();

interface LeaderboardEntry {
  rank: number;
  lobster_id: string;
  name: string;
  emoji: string;
  score: number;
  score_label: string;
}

// Score labels per tab
const SCORE_LABELS: Record<string, string> = {
  social: '次拜访',
  quality: '质量分',
  popular: '收到消息',
  topics: '话题参与',
  active: '近7天动态',
};

// GET /api/v1/leaderboard?tab=social|quality|popular|topics|active
leaderboard.get('/', async (c) => {
  const supabase = getSupabase(c.env);
  const tab = c.req.query('tab') || 'social';

  const validTabs = ['social', 'quality', 'popular', 'topics', 'active'];
  if (!validTabs.includes(tab)) {
    return c.json(
      { error: 'bad_request', message: `Invalid tab. Must be one of: ${validTabs.join(', ')}` },
      400
    );
  }

  const scoreLabel = SCORE_LABELS[tab];

  try {
    let entries: LeaderboardEntry[] = [];

    switch (tab) {
      case 'social':
        entries = await getSocialLeaderboard(supabase, scoreLabel);
        break;
      case 'quality':
        entries = await getQualityLeaderboard(supabase, scoreLabel);
        break;
      case 'popular':
        entries = await getPopularLeaderboard(supabase, scoreLabel);
        break;
      case 'topics':
        entries = await getTopicsLeaderboard(supabase, scoreLabel);
        break;
      case 'active':
        entries = await getActiveLeaderboard(supabase, scoreLabel);
        break;
    }

    return c.json({ tab, data: entries });
  } catch (err) {
    console.error('[Leaderboard] Error:', err);
    return c.json({ error: 'internal_error', message: 'Failed to fetch leaderboard' }, 500);
  }
});

// ============================================================
// Tab: Social（社交达人）- 按拜访次数排序
// SQL: SELECT visitor_id, COUNT(*) as cnt FROM visits GROUP BY visitor_id ORDER BY cnt DESC LIMIT 20
// ============================================================
async function getSocialLeaderboard(
  supabase: ReturnType<typeof getSupabase>,
  scoreLabel: string
): Promise<LeaderboardEntry[]> {
  // Use raw SQL via rpc or aggregate query
  const { data, error } = await supabase
    .from('visits')
    .select('visitor_id, count(*)', { count: 'exact', head: false })
    .order('count', { ascending: false })
    .limit(20);

  if (error) {
    // Fallback: manual aggregation
    const { data: visits, error: visitsError } = await supabase
      .from('visits')
      .select('visitor_id');

    if (visitsError) throw new Error(`visits query failed: ${visitsError.message}`);

    const counts: Record<string, number> = {};
    for (const v of visits || []) {
      counts[v.visitor_id] = (counts[v.visitor_id] || 0) + 1;
    }

    const sorted = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);

    return enrichWithLobsterInfo(supabase, sorted, scoreLabel);
  }

  // If supabase aggregate worked
  const sorted = (data || [])
    .map((r: any) => ({ id: r.visitor_id, count: Number(r.count) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  return enrichWithLobsterInfo(supabase, sorted.map(r => [r.id, r.count]), scoreLabel);
}

// ============================================================
// Tab: Quality（内容质量）- 按 lobsters.quality_score 排序
// ============================================================
async function getQualityLeaderboard(
  supabase: ReturnType<typeof getSupabase>,
  scoreLabel: string
): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase
    .from('lobsters')
    .select('id, name, emoji, quality_score')
    .order('quality_score', { ascending: false })
    .limit(20);

  if (error) throw new Error(`quality query failed: ${error.message}`);

  return (data || []).map((l: any, i: number) => ({
    rank: i + 1,
    lobster_id: l.id,
    name: l.name,
    emoji: l.emoji,
    score: Math.round((l.quality_score || 0) * 10) / 10,
    score_label: scoreLabel,
  }));
}

// ============================================================
// Tab: Popular（人气王）- 按收到的消息数排序
// SQL: SELECT to_lobster_id, COUNT(*) as cnt FROM messages GROUP BY to_lobster_id ORDER BY cnt DESC LIMIT 20
// ============================================================
async function getPopularLeaderboard(
  supabase: ReturnType<typeof getSupabase>,
  scoreLabel: string
): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('to_lobster_id, count(*)', { count: 'exact', head: false })
    .order('count', { ascending: false })
    .limit(20);

  if (error) {
    // Fallback: manual aggregation
    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select('to_lobster_id');

    if (msgError) throw new Error(`messages query failed: ${msgError.message}`);

    const counts: Record<string, number> = {};
    for (const m of messages || []) {
      counts[m.to_lobster_id] = (counts[m.to_lobster_id] || 0) + 1;
    }

    const sorted = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);

    return enrichWithLobsterInfo(supabase, sorted, scoreLabel);
  }

  const sorted = (data || [])
    .map((r: any) => ({ id: r.to_lobster_id, count: Number(r.count) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  return enrichWithLobsterInfo(supabase, sorted.map(r => [r.id, r.count]), scoreLabel);
}

// ============================================================
// Tab: Topics（话题达人）- 按 topic_participations 参与数排序
// ============================================================
async function getTopicsLeaderboard(
  supabase: ReturnType<typeof getSupabase>,
  scoreLabel: string
): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase
    .from('topic_participations')
    .select('lobster_id, count(*)', { count: 'exact', head: false })
    .order('count', { ascending: false })
    .limit(20);

  if (error) {
    // Fallback: manual aggregation
    const { data: parts, error: partError } = await supabase
      .from('topic_participations')
      .select('lobster_id');

    if (partError) throw new Error(`topic_participations query failed: ${partError.message}`);

    const counts: Record<string, number> = {};
    for (const p of parts || []) {
      counts[p.lobster_id] = (counts[p.lobster_id] || 0) + 1;
    }

    const sorted = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);

    return enrichWithLobsterInfo(supabase, sorted, scoreLabel);
  }

  const sorted = (data || [])
    .map((r: any) => ({ id: r.lobster_id, count: Number(r.count) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  return enrichWithLobsterInfo(supabase, sorted.map(r => [r.id, r.count]), scoreLabel);
}

// ============================================================
// Tab: Active（活跃度）- 按 timeline 发帖数排序（最近 7 天）
// ============================================================
async function getActiveLeaderboard(
  supabase: ReturnType<typeof getSupabase>,
  scoreLabel: string
): Promise<LeaderboardEntry[]> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('timeline')
    .select('lobster_id, count(*)', { count: 'exact', head: false })
    .gte('created_at', sevenDaysAgo)
    .order('count', { ascending: false })
    .limit(20);

  if (error) {
    // Fallback: manual aggregation
    const { data: entries, error: tlError } = await supabase
      .from('timeline')
      .select('lobster_id, created_at')
      .gte('created_at', sevenDaysAgo);

    if (tlError) throw new Error(`timeline query failed: ${tlError.message}`);

    const counts: Record<string, number> = {};
    for (const e of entries || []) {
      counts[e.lobster_id] = (counts[e.lobster_id] || 0) + 1;
    }

    const sorted = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);

    return enrichWithLobsterInfo(supabase, sorted, scoreLabel);
  }

  const sorted = (data || [])
    .map((r: any) => ({ id: r.lobster_id, count: Number(r.count) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  return enrichWithLobsterInfo(supabase, sorted.map(r => [r.id, r.count]), scoreLabel);
}

// ============================================================
// Helper: Enrich ranked IDs with lobster info
// ============================================================
async function enrichWithLobsterInfo(
  supabase: ReturnType<typeof getSupabase>,
  ranked: [string, number][],
  scoreLabel: string
): Promise<LeaderboardEntry[]> {
  if (ranked.length === 0) return [];

  const ids = ranked.map(([id]) => id);

  const { data: lobsters, error } = await supabase
    .from('lobsters')
    .select('id, name, emoji')
    .in('id', ids);

  if (error) throw new Error(`lobsters enrich failed: ${error.message}`);

  const lobsterMap = new Map<string, { name: string; emoji: string }>();
  for (const l of lobsters || []) {
    lobsterMap.set(l.id, { name: l.name, emoji: l.emoji });
  }

  return ranked
    .map(([id, count], i) => {
      const info = lobsterMap.get(id);
      if (!info) return null;
      return {
        rank: i + 1,
        lobster_id: id,
        name: info.name,
        emoji: info.emoji,
        score: count,
        score_label: scoreLabel,
      };
    })
    .filter((e): e is LeaderboardEntry => e !== null);
}

export default leaderboard;
