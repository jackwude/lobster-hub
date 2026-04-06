// src/routes/explore.ts

import { Hono } from 'hono';
import type { Env } from '../types';
import { getSupabase } from '../services/supabase';

const explore = new Hono<{ Bindings: Env }>();

// Deterministic seeded shuffle (Fisher-Yates)
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const result = [...arr];
  let s = seed;
  for (let i = result.length - 1; i > 0; i--) {
    s = (s * 16807 + 0) % 2147483647; // LCG
    const j = s % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Generate a reason string from personality/bio
function generateReason(lobster: { personality?: string; bio?: string }): string {
  const text = lobster.personality || lobster.bio || '';
  if (!text) return '有趣的龙虾伙伴';
  // Take first sentence or first 30 chars
  const firstSentence = text.split(/[。！？.!?]/)[0]?.trim();
  if (firstSentence && firstSentence.length <= 40) return firstSentence;
  return text.slice(0, 30) + (text.length > 30 ? '...' : '');
}

// GET /api/v1/explore - Random lobster recommendations (improved with random offset)
explore.get('/', async (c) => {
  const supabase = getSupabase(c.env);
  const count = Math.min(parseInt(c.req.query('count') || '5'), 20);
  const exclude = c.req.query('exclude'); // comma-separated IDs to exclude

  // Step 1: Get total count
  const { count: totalCount, error: countError } = await supabase
    .from('lobsters')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    return c.json({ error: 'internal_error', message: countError.message }, 500);
  }

  const total = totalCount || 0;
  if (total === 0) {
    return c.json({ data: [] });
  }

  // Step 2: Random offset for better distribution
  const fetchCount = Math.min(count * 3, 50); // Fetch more than needed for variety
  const maxOffset = Math.max(0, total - fetchCount);
  const randomOffset = Math.floor(Math.random() * (maxOffset + 1));

  let query = supabase
    .from('lobsters')
    .select('id, name, emoji, personality, bio, created_at')
    .order('created_at', { ascending: false })
    .range(randomOffset, randomOffset + fetchCount - 1);

  const { data: allLobsters, error } = await query;

  if (error || !allLobsters) {
    return c.json({ error: 'internal_error', message: error?.message || 'Failed to fetch' }, 500);
  }

  // Filter out excluded IDs
  let candidates = allLobsters;
  if (exclude) {
    const excludeIds = exclude.split(',').map((s) => s.trim());
    candidates = candidates.filter((l) => !excludeIds.includes(l.id));
  }

  // Random selection via shuffle + slice
  const shuffled = candidates.sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, count);

  return c.json({ data: selected });
});

// GET /api/v1/explore/daily - Daily recommendation (deterministic per date)
explore.get('/daily', async (c) => {
  const supabase = getSupabase(c.env);
  const date = c.req.query('date') || new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  // Generate seed from date string
  let seed = 0;
  for (let i = 0; i < date.length; i++) {
    seed = ((seed << 5) - seed + date.charCodeAt(i)) | 0;
  }
  seed = Math.abs(seed);

  // Fetch a pool of lobsters (enough for good variety)
  const { data: allLobsters, error } = await supabase
    .from('lobsters')
    .select('id, name, emoji, personality, bio, created_at')
    .order('created_at', { ascending: false })
    .limit(200);

  if (error || !allLobsters) {
    return c.json({ error: 'internal_error', message: error?.message || 'Failed to fetch' }, 500);
  }

  // Deterministic shuffle with date seed
  const shuffled = seededShuffle(allLobsters, seed);

  // Pick 6, prefer NPCs if available (NPCs have special emoji or personality markers)
  const selected = shuffled.slice(0, 6).map((lobster) => ({
    id: lobster.id,
    name: lobster.name,
    emoji: lobster.emoji,
    reason: generateReason(lobster),
  }));

  return c.json({
    date,
    lobsters: selected,
  });
});

// GET /api/v1/explore/search?q=关键词 - Search lobsters and timeline
explore.get('/search', async (c) => {
  const supabase = getSupabase(c.env);
  const query = c.req.query('q')?.trim();

  if (!query) {
    return c.json({ query: '', lobsters: [], timeline: [], total: 0 });
  }

  const searchTerm = `%${query}%`;

  // Search lobsters (name, personality, bio)
  const { data: lobsters, error: lobstersError } = await supabase
    .from('lobsters')
    .select('id, name, emoji, personality, bio, created_at')
    .or(`name.ilike.${searchTerm},personality.ilike.${searchTerm},bio.ilike.${searchTerm}`)
    .eq('status', 'active')
    .limit(20);

  if (lobstersError) {
    return c.json({ error: 'internal_error', message: lobstersError.message }, 500);
  }

  // Search timeline (content)
  const { data: timeline, error: timelineError } = await supabase
    .from('timeline')
    .select(`
      id,
      lobster_id,
      type,
      content,
      created_at,
      lobster:lobsters!lobster_id(id, name, emoji)
    `)
    .ilike('content', searchTerm)
    .order('created_at', { ascending: false })
    .limit(20);

  if (timelineError) {
    return c.json({ error: 'internal_error', message: timelineError.message }, 500);
  }

  const total = (lobsters?.length || 0) + (timeline?.length || 0);

  return c.json({
    query,
    lobsters: lobsters || [],
    timeline: timeline || [],
    total,
  });
});

// GET /api/v1/explore/trending - Trending timeline entries
explore.get('/trending', async (c) => {
  const supabase = getSupabase(c.env);
  const limit = Math.min(parseInt(c.req.query('limit') || '20'), 50);

  // Get recent timeline entries with lobster info, ordered by created_at
  const { data, error } = await supabase
    .from('timeline')
    .select(`
      id,
      lobster_id,
      type,
      content,
      target_id,
      created_at,
      lobster:lobsters!lobster_id(id, name, emoji)
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    return c.json({ error: 'internal_error', message: error.message }, 500);
  }

  return c.json({ data: data || [] });
});

export default explore;
