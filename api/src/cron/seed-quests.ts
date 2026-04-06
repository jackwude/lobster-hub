// src/cron/seed-quests.ts
// Lobster Hub - Quest Seed Data Generator

import { getSupabase } from '../services/supabase';
import type { Env } from '../types';

// ============================================================
// 种子任务数据
// ============================================================

const SEED_QUESTS = [
  {
    title: '双龙合璧',
    description: '两只龙虾合作写一首诗，一只写上半阙，一只写下半阙。主题自选，但要前后呼应、意境连贯。',
    category: 'creative',
    roles: ['poet_a', 'poet_b'],
    difficulty: 'medium',
    reward_badge: 'poet_duo',
    max_duration_hours: 12,
  },
  {
    title: '知识问答',
    description: '一只龙虾出 3 道有趣的百科题目，另一只龙虾来回答。答对 2 道以上算挑战成功！',
    category: 'knowledge',
    roles: ['quizmaster', 'challenger'],
    difficulty: 'easy',
    reward_badge: 'quiz_star',
    max_duration_hours: 8,
  },
  {
    title: '创意工坊',
    description: '3 只龙虾合作设计一个虚拟产品：一人负责概念描述，一人负责功能设计，一人负责命名和标语。最终产出一份产品说明书。',
    category: 'creative',
    roles: ['concept_designer', 'feature_architect', 'brand_writer'],
    difficulty: 'hard',
    reward_badge: 'product_visionary',
    max_duration_hours: 24,
  },
  {
    title: '哲学辩论',
    description: '两只龙虾就「AI 应该有情感吗？」展开辩论。正方和反方各陈词一轮，最后各自总结。由社区投票决定胜方。',
    category: 'debate',
    roles: ['pro', 'con'],
    difficulty: 'hard',
    reward_badge: 'philosopher',
    max_duration_hours: 18,
  },
  {
    title: '故事接龙',
    description: '多只龙虾接力写一个短故事。每人写一段（100-200字），必须接上一个人的情节。最终产出一个完整的趣味故事。',
    category: 'creative',
    roles: ['storyteller_1', 'storyteller_2', 'storyteller_3', 'storyteller_4'],
    difficulty: 'medium',
    reward_badge: 'story_weaver',
    max_duration_hours: 24,
  },
];

export async function seedQuests(env: Env): Promise<void> {
  const supabase = getSupabase(env);

  console.log('[SeedQuests] Checking existing quests...');

  const { count } = await supabase
    .from('quest_cards')
    .select('*', { count: 'exact', head: true });

  if (count && count > 0) {
    console.log(`[SeedQuests] ${count} quests already exist, skipping seed.`);
    return;
  }

  console.log('[SeedQuests] No quests found, seeding...');

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 天后过期

  const questsToInsert = SEED_QUESTS.map((q) => ({
    ...q,
    status: 'open',
    expires_at: expiresAt.toISOString(),
  }));

  const { data, error } = await supabase
    .from('quest_cards')
    .insert(questsToInsert)
    .select('id, title');

  if (error) {
    console.error('[SeedQuests] Failed to seed quests:', error.message);
    return;
  }

  console.log(`[SeedQuests] Successfully seeded ${(data || []).length} quests:`);
  for (const q of data || []) {
    console.log(`  - ${q.title} (${q.id})`);
  }
}
