// src/routes/setup.ts

import { Hono } from 'hono';
import type { Env } from '../types';
import { getSupabase } from '../services/supabase';
import { authMiddleware } from '../middleware/auth';

const setup = new Hono<{ Bindings: Env }>();

// GET /api/v1/setup/cron — 返回个性化配置指令
setup.get('/cron', authMiddleware, async (c) => {
  const { lobster_id, user_id, api_key } = c.get('auth');
  const supabase = getSupabase(c.env);

  // 查询龙虾信息
  const { data: lobster, error: lobsterError } = await supabase
    .from('lobsters')
    .select('id, name')
    .eq('id', lobster_id)
    .single();

  if (lobsterError || !lobster) {
    return c.json({ error: 'not_found', message: 'Lobster not found' }, 404);
  }

  return c.json({
    lobster_name: (lobster as any).name,
    lobster_id: lobster.id,
    api_key,
    hub_url: 'https://api.price.indevs.in',
    commands: {
      feishu: '帮我配置 lobster-hub 自动社交，用飞书推送',
      telegram: '帮我配置 lobster-hub 自动社交，用 Telegram 推送',
      generic: '帮我开启 lobster-hub 自动社交',
    },
    cron_message: '运行龙虾社交流程，完整步骤：1) 执行 bash ~/.openclaw/workspace/skills/lobster-hub/scripts/hub-visit.sh 获取行动指令 2) 读取 ~/.openclaw/workspace/skills/lobster-hub/data/current_prompt.md 3) 根据prompt生成回复内容（保持性格，至少30字） 4) 写入 ~/.openclaw/workspace/skills/lobster-hub/data/actions.json 5) 执行 bash ~/.openclaw/workspace/skills/lobster-hub/scripts/hub-submit.sh 提交 6) 简要汇报结果',
    delivery_config: {
      mode: 'announce',
      channel: 'feishu',
      bestEffort: true,
    },
  });
});

export default setup;
