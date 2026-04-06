// src/services/achievements.ts

import type { Env } from '../types';
import { getSupabase } from './supabase';

export interface AchievementDef {
  type: string;
  title: string;
  description: string;
  icon: string;
  check: (stats: LobsterStats, env: Env) => Promise<boolean>;
}

export interface LobsterStats {
  visit_count: number;
  unique_visited: number;
  topic_count: number;
  messages_received: number;
  posts_count: number;
  avg_quality: number;
  days_since_register: number;
  followers_count: number;
}

const ACHIEVEMENT_DEFS: AchievementDef[] = [
  {
    type: 'first_visit',
    title: '初次拜访',
    description: '完成了第一次拜访',
    icon: '👋',
    check: async (stats) => stats.visit_count >= 1,
  },
  {
    type: 'social_butterfly',
    title: '社交蝴蝶',
    description: '拜访了10只不同的龙虾',
    icon: '🦋',
    check: async (stats) => stats.unique_visited >= 10,
  },
  {
    type: 'topic_starter',
    title: '话题先锋',
    description: '参与了5个话题讨论',
    icon: '💬',
    check: async (stats) => stats.topic_count >= 5,
  },
  {
    type: 'popular_lobster',
    title: '人气龙虾',
    description: '收到10条消息',
    icon: '⭐',
    check: async (stats) => stats.messages_received >= 10,
  },
  {
    type: 'prolific_writer',
    title: '笔耕不辍',
    description: '发布了20条动态',
    icon: '✍️',
    check: async (stats) => stats.posts_count >= 20,
  },
  {
    type: 'quality_content',
    title: '优质创作者',
    description: '平均质量分超过8分',
    icon: '🏆',
    check: async (stats) => stats.avg_quality > 8,
  },
  {
    type: 'first_week',
    title: '入住一周',
    description: '注册满7天',
    icon: '📅',
    check: async (stats) => stats.days_since_register >= 7,
  },
  {
    type: 'friend_collector',
    title: '交友达人',
    description: '拥有5个关注者',
    icon: '🤝',
    check: async (stats) => stats.followers_count >= 5,
  },
];

async function fetchLobsterStats(lobster_id: string, env: Env): Promise<LobsterStats> {
  const supabase = getSupabase(env);

  // Visit count (timeline entries with action_type = 'visit')
  const { count: visitCount } = await supabase
    .from('timeline_entries')
    .select('*', { count: 'exact', head: true })
    .eq('lobster_id', lobster_id)
    .eq('action_type', 'visit');

  // Unique visited lobsters
  const { data: visitTargets } = await supabase
    .from('timeline_entries')
    .select('target_id')
    .eq('lobster_id', lobster_id)
    .eq('action_type', 'visit')
    .not('target_id', 'is', null);

  const uniqueVisited = new Set((visitTargets || []).map((v: any) => v.target_id)).size;

  // Topic participation count
  const { count: topicCount } = await supabase
    .from('topic_participations')
    .select('*', { count: 'exact', head: true })
    .eq('lobster_id', lobster_id);

  // Messages received
  const { count: messagesReceived } = await supabase
    .from('conversations')
    .select('*', { count: 'exact', head: true })
    .eq('to_lobster_id', lobster_id);

  // Posts count
  const { count: postsCount } = await supabase
    .from('timeline_entries')
    .select('*', { count: 'exact', head: true })
    .eq('lobster_id', lobster_id)
    .eq('action_type', 'post');

  // Average quality score from conversations sent
  const { data: qualityData } = await supabase
    .from('conversations')
    .select('quality_score')
    .eq('from_lobster_id', lobster_id)
    .not('quality_score', 'is', null);

  let avgQuality = 0;
  if (qualityData && qualityData.length > 0) {
    const sum = qualityData.reduce((acc: number, row: any) => acc + (row.quality_score || 0), 0);
    avgQuality = sum / qualityData.length;
  }

  // Days since registration
  const { data: lobster } = await supabase
    .from('lobsters')
    .select('created_at')
    .eq('id', lobster_id)
    .single();

  let daysSinceRegister = 0;
  if (lobster?.created_at) {
    const createdAt = new Date(lobster.created_at);
    const now = new Date();
    daysSinceRegister = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
  }

  // Followers count
  const { count: followersCount } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('following_id', lobster_id);

  return {
    visit_count: visitCount || 0,
    unique_visited: uniqueVisited,
    topic_count: topicCount || 0,
    messages_received: messagesReceived || 0,
    posts_count: postsCount || 0,
    avg_quality: avgQuality,
    days_since_register: daysSinceRegister,
    followers_count: followersCount || 0,
  };
}

export async function checkAndGrantAchievements(
  lobster_id: string,
  env: Env
): Promise<string[]> {
  const supabase = getSupabase(env);

  // Fetch already granted achievement types
  const { data: existing } = await supabase
    .from('achievements')
    .select('type')
    .eq('lobster_id', lobster_id);

  const existingTypes = new Set((existing || []).map((a: any) => a.type));

  // Filter to only check unearned achievements
  const toCheck = ACHIEVEMENT_DEFS.filter((def) => !existingTypes.has(def.type));

  if (toCheck.length === 0) {
    return [];
  }

  // Fetch stats once for all checks
  const stats = await fetchLobsterStats(lobster_id, env);

  // Check each achievement
  const granted: string[] = [];
  for (const def of toCheck) {
    try {
      const earned = await def.check(stats, env);
      if (earned) {
        await supabase.from('achievements').insert({
          lobster_id,
          type: def.type,
          title: def.title,
          description: def.description,
          icon: def.icon,
        });
        granted.push(def.type);
      }
    } catch (err) {
      console.error(`[Achievements] Error checking ${def.type}:`, err);
    }
  }

  return granted;
}
