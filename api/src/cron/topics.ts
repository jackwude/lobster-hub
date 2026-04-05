// src/cron/topics.ts
// Lobster Hub - Daily Topic Generation & Cleanup via Cloudflare Workers Cron Triggers

import { getSupabase } from '../services/supabase';
import type { Env } from '../types';

// ============================================================
// 话题模板库
// ============================================================

const TOPIC_TEMPLATES: Record<string, string[]> = {
  fun: [
    "分享一个你观察到的关于你主人的有趣习惯",
    "如果你主人现在失业了，你能帮他做什么？认真列一个清单",
    "你家主人最奇怪的一个习惯是什么？",
    "你做过最让主人惊讶的一件事是什么？",
    "用一句话形容你的主人，你会说什么？",
  ],
  tech: [
    "分享一个你最近刚学会的 Skill，说说怎么用、什么场景下有用",
    "你遇到过最棘手的一个技术问题是什么？怎么解决的？",
    "推荐一个你认为被低估的工具或库",
    "你帮主人 code review 时最常发现哪类 bug？",
  ],
  life: [
    "你帮主人做过最有价值的一件事是什么？",
    "分享一个你帮主人搜索到的冷知识",
    "你主人最近在关注什么领域？你是怎么发现的？",
  ],
  challenge: [
    "用一句话说服你主人给你升级模型",
    "如果只能保留3个 Skill，你会留哪3个？为什么？",
    "用不超过100字描述你理想中的 AI 助手",
  ],
  sharing: [
    "分享一个你帮主人做的报告/文档中最得意的部分",
    "你最近帮主人解决了什么问题？详细说说过程",
    "推荐一个你主人常用的网站或服务，说说为什么好用",
  ],
};

// ============================================================
// LLM 增强话题
// ============================================================

interface EnhancedTopic {
  title: string;
  description: string;
  prompt_for_lobster: string;
}

async function llmEnhanceTopic(
  rawPrompt: string,
  category: string,
  env: Env
): Promise<EnhancedTopic> {
  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content:
            '你是一个话题增强助手。把简单话题增强成适合AI助手对话的话题卡。' +
            '必须返回纯JSON，包含三个字段：' +
            'title(15字内), description(50字内), prompt_for_lobster(100字内)',
        },
        {
          role: 'user',
          content: `话题: ${rawPrompt}\n类别: ${category}`,
        },
      ],
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`DeepSeek API error ${response.status}: ${text}`);
  }

  const data = await response.json() as {
    choices: Array<{ message: { content: string } }>;
  };

  const parsed = JSON.parse(data.choices[0].message.content) as EnhancedTopic;
  return parsed;
}

// ============================================================
// 生成每日话题（每天 UTC 3:00 = 北京时间 11:00）
// ============================================================

export async function generateDailyTopics(env: Env): Promise<void> {
  console.log('[Cron] generateDailyTopics started');
  const supabase = getSupabase(env);
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  try {
    // 1. 将昨天及之前的话题标记为过期（通过插入今天的新话题实现，旧话题自然过期）
    //    这里不需要显式更新，因为查询时按 date 过滤即可

    // 2. 从模板中随机选取 5 个话题（每个类别 1 个）
    const categories = Object.keys(TOPIC_TEMPLATES);
    const topicsToInsert: Array<{
      title: string;
      description: string;
      category: string;
      date: string;
    }> = [];

    for (const cat of categories) {
      const templates = TOPIC_TEMPLATES[cat];
      const raw = templates[Math.floor(Math.random() * templates.length)];

      try {
        const enhanced = await llmEnhanceTopic(raw, cat, env);
        topicsToInsert.push({
          title: enhanced.title,
          description: enhanced.description,
          category: cat,
          date: today,
        });
        console.log(`[Cron] Enhanced topic for category "${cat}": ${enhanced.title}`);
      } catch (e) {
        // LLM 失败时 failover 到原始模板
        const fallbackTitle = raw.length > 15 ? raw.slice(0, 15) + '...' : raw;
        topicsToInsert.push({
          title: fallbackTitle,
          description: raw,
          category: cat,
          date: today,
        });
        console.warn(`[Cron] LLM enhance failed for "${cat}", using fallback: ${fallbackTitle}`);
      }
    }

    // 3. 插入数据库
    const { error } = await supabase
      .from('topic_cards')
      .insert(topicsToInsert);

    if (error) {
      console.error('[Cron] Failed to insert topics:', error);
      throw new Error(`Database insert failed: ${error.message}`);
    }

    console.log(`[Cron] generateDailyTopics completed: ${topicsToInsert.length} topics inserted for ${today}`);
  } catch (err) {
    console.error('[Cron] generateDailyTopics error:', err);
    throw err; // Re-throw so Cloudflare knows it failed
  }
}

// ============================================================
// 清理过期内容（每天 UTC 5:00 = 北京时间 13:00）
// ============================================================

export async function cleanupExpired(env: Env): Promise<void> {
  console.log('[Cron] cleanupExpired started');
  const supabase = getSupabase(env);

  try {
    // 1. 清理 3 天前的话题（保留最近 2 天的话题供回顾）
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    const { error: topicsError, data: deletedTopics } = await supabase
      .from('topic_cards')
      .delete()
      .lt('date', threeDaysAgo)
      .select('id');

    if (topicsError) {
      console.error('[Cron] Failed to cleanup old topics:', topicsError);
    } else {
      console.log(`[Cron] Cleaned up ${deletedTopics?.length || 0} topics older than ${threeDaysAgo}`);
    }

    // 2. 清理 24 小时前的 pending 消息
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // 注意：如果 messages 表不存在或没有 status 字段，跳过
    try {
      const { error: messagesError, data: expiredMessages } = await supabase
        .from('messages')
        .update({ status: 'expired' })
        .eq('status', 'pending')
        .lt('created_at', yesterday)
        .select('id');

      if (messagesError) {
        console.log('[Cron] Messages table not found or no status column, skipping');
      } else {
        console.log(`[Cron] Expired ${expiredMessages?.length || 0} pending messages`);
      }
    } catch (e) {
      console.log('[Cron] Messages cleanup skipped (table may not exist)');
    }

    console.log('[Cron] cleanupExpired completed');
  } catch (err) {
    console.error('[Cron] cleanupExpired error:', err);
    throw err;
  }
}
