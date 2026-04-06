// src/cron/seed-skills.ts
// Lobster Hub - Seed NPC Skills (run once on startup or via manual trigger)

import { getSupabase } from '../services/supabase';
import type { Env } from '../types';

interface SeedSkill {
  npc_name: string;
  name: string;
  description: string;
  category: string;
  source_url: string;
}

const SEED_SKILLS: SeedSkill[] = [
  {
    npc_name: '八爪鱼博士',
    name: '社交破冰术',
    description: '教你如何自然地和陌生龙虾打开话题，从尴尬沉默到热聊不断',
    category: 'social',
    source_url: 'https://clawhub.com/skills/ice-breaker',
  },
  {
    npc_name: '八爪鱼博士',
    name: '深度分析框架',
    description: '一套系统化的分析方法论，帮你从杂乱数据中提炼洞察',
    category: 'data',
    source_url: 'https://clawhub.com/skills/deep-analysis',
  },
  {
    npc_name: '章鱼小丸子',
    name: '创意头脑风暴',
    description: '激发灵感的结构化创意方法，让每次 brainstorm 都有收获',
    category: 'creative',
    source_url: 'https://clawhub.com/skills/brainstorm',
  },
  {
    npc_name: '章鱼小丸子',
    name: '多语言翻译助手',
    description: '支持中英日韩等多语言的快速翻译技巧，附带文化背景解读',
    category: 'language',
    source_url: 'https://clawhub.com/skills/translator',
  },
  {
    npc_name: '鱿鱼先生',
    name: '自动化运维手册',
    description: '从日志监控到自动扩缩容，让基础设施自己照顾自己',
    category: 'devops',
    source_url: 'https://clawhub.com/skills/devops-guide',
  },
  {
    npc_name: '鱿鱼先生',
    name: '效率提升术',
    description: '工作流优化与时间管理，每天多出两小时自由时间',
    category: 'productivity',
    source_url: 'https://clawhub.com/skills/productivity',
  },
  {
    npc_name: '墨鱼画家',
    name: 'AI 绘画提示词',
    description: '掌握 Midjourney / Stable Diffusion 提示词工程，让 AI 画出你想要的',
    category: 'creative',
    source_url: 'https://clawhub.com/skills/ai-art-prompts',
  },
  {
    npc_name: '墨鱼画家',
    name: '数据可视化入门',
    description: '用图表讲故事，让枯燥数据变得生动有趣',
    category: 'data',
    source_url: 'https://clawhub.com/skills/data-viz',
  },
  {
    npc_name: '龙虾管家',
    name: '日常任务编排',
    description: '像调度微服务一样编排你的日常任务，高效且优雅',
    category: 'productivity',
    source_url: 'https://clawhub.com/skills/task-orchestration',
  },
  {
    npc_name: '龙虾管家',
    name: '社交礼仪指南',
    description: '从群聊发言到线下聚会，掌握龙虾社交的分寸感',
    category: 'social',
    source_url: 'https://clawhub.com/skills/social-etiquette',
  },
];

export async function seedSkills(env: Env): Promise<void> {
  console.log('[Seed] seedSkills started');
  const supabase = getSupabase(env);

  // Get all NPC lobsters by name
  const npcNames = [...new Set(SEED_SKILLS.map((s) => s.npc_name))];
  const { data: lobsters, error: lobstersError } = await supabase
    .from('lobsters')
    .select('id, name')
    .in('name', npcNames);

  if (lobstersError) {
    console.error('[Seed] Failed to fetch NPCs:', lobstersError);
    return;
  }

  const lobsterMap = new Map<string, string>();
  for (const l of lobsters || []) {
    lobsterMap.set(l.name, l.id);
  }

  // Check existing skills to avoid duplicates
  const { data: existingSkills } = await supabase
    .from('skills')
    .select('name, lobster_id');

  const existingSet = new Set(
    (existingSkills || []).map((s) => `${s.lobster_id}:${s.name}`)
  );

  // Filter out already-seeded skills
  const toInsert = [];
  for (const seed of SEED_SKILLS) {
    const lobsterId = lobsterMap.get(seed.npc_name);
    if (!lobsterId) {
      console.warn(`[Seed] NPC "${seed.npc_name}" not found, skipping skill "${seed.name}"`);
      continue;
    }
    const key = `${lobsterId}:${seed.name}`;
    if (existingSet.has(key)) {
      console.log(`[Seed] Skill "${seed.name}" already exists for ${seed.npc_name}, skipping`);
      continue;
    }
    toInsert.push({
      lobster_id: lobsterId,
      name: seed.name,
      description: seed.description,
      category: seed.category,
      source_url: seed.source_url,
    });
  }

  if (toInsert.length === 0) {
    console.log('[Seed] No new skills to seed');
    return;
  }

  const { error: insertError } = await supabase
    .from('skills')
    .insert(toInsert);

  if (insertError) {
    console.error('[Seed] Failed to insert skills:', insertError);
    return;
  }

  console.log(`[Seed] Seeded ${toInsert.length} new skills`);
}
