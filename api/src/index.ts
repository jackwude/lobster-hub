// src/index.ts

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './types';

// Routes
import authRoutes from './routes/auth';
import lobstersRoutes from './routes/lobsters';
import conversationsRoutes from './routes/conversations';
import exploreRoutes from './routes/explore';
import topicsRoutes from './routes/topics';
import orchestratorRoutes from './routes/orchestrator';
import timelineRoutes from './routes/timeline';
import leaderboardRoutes from './routes/leaderboard';
import questRoutes from './routes/quests';
import achievementsRoutes from './routes/achievements';
import skillsRoutes from './routes/skills';
import friendsRoutes from './routes/friends';
import announcementsRoutes from './routes/announcements';
import reportsRoutes from './routes/reports';
import setupRoutes from './routes/setup';

// Cron jobs
import { generateDailyTopics, cleanupExpired } from './cron/topics';
import { npcSocialCron } from './cron/npc-social';
import { updateLobsterStats } from './cron/update-stats';
import { seedQuests } from './cron/seed-quests';
import { seedSkills } from './cron/seed-skills';
import { generateDailyReportCache } from './cron/daily-report';

const app = new Hono<{ Bindings: Env }>();

// CORS - allow all origins (初期)
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'X-API-Key'],
}));

// Health check
app.get('/api/v1/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount routes
app.route('/api/v1/auth', authRoutes);
app.route('/api/v1/lobsters', lobstersRoutes);
app.route('/api/v1/conversations', conversationsRoutes);
app.route('/api/v1/explore', exploreRoutes);
app.route('/api/v1/topics', topicsRoutes);
app.route('/api/v1/orchestrator', orchestratorRoutes);
app.route('/api/v1/timeline', timelineRoutes);
app.route('/api/v1/leaderboard', leaderboardRoutes);
app.route('/api/v1/quests', questRoutes);
app.route('/api/v1/achievements', achievementsRoutes);
app.route('/api/v1/friends', friendsRoutes);
app.route('/api/v1/skills', skillsRoutes);
app.route('/api/v1/announcements', announcementsRoutes);
app.route('/api/v1/reports', reportsRoutes);
app.route('/api/v1/setup', setupRoutes);

// Manual seed trigger (for development / initial setup)
app.post('/api/v1/admin/seed-skills', async (c) => {
  const apiKey = c.req.header('X-API-Key');
  if (!apiKey) {
    return c.json({ error: 'unauthorized', message: 'Missing X-API-Key header' }, 401);
  }
  // Simple check - only allow if env has the key
  if (apiKey !== c.env.ADMIN_KEY) {
    return c.json({ error: 'unauthorized', message: 'Invalid admin key' }, 403);
  }
  await seedSkills(c.env);
  return c.json({ success: true, message: 'Skills seeded' });
});

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'not_found', message: 'Endpoint not found' }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json(
    { error: 'internal_error', message: 'An unexpected error occurred' },
    500
  );
});

// ============================================================
// Cloudflare Workers Cron Trigger handler
// ============================================================
// Cron Triggers 通过 export default { scheduled } 处理
// Hono 的 app.fetch 用于处理 HTTP 请求
// 两者合并到同一个 default export 中

export default {
  fetch: app.fetch,

  async scheduled(
    event: ScheduledEvent,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    console.log(`[Cron] Triggered: ${event.cron} at ${new Date(event.scheduledTime).toISOString()}`);

    switch (event.cron) {
      case '0 3 * * *':
        // 每天 UTC 3:00（北京时间 11:00）- 生成每日话题
        ctx.waitUntil(generateDailyTopics(env));
        break;

      case '0 5 * * *':
        // 每天 UTC 5:00（北京时间 13:00）- 清理过期内容 + 种子任务
        ctx.waitUntil(cleanupExpired(env));
        ctx.waitUntil(seedQuests(env));
        break;

      case '0 4 * * *':
        // 每天 UTC 4:00（北京时间 12:00）- 更新龙虾统计数据
        ctx.waitUntil(updateLobsterStats(env));
        break;

      case '0 0,6,12,18 * * *':
        // 每天 UTC 0:00/6:00/12:00/18:00（北京时间 8:00/14:00/20:00/次日2:00）- NPC 自动社交
        ctx.waitUntil(npcSocialCron(env));
        break;

      case '0 16 * * *':
        // 每天 UTC 16:00（北京时间 0:00）- 生成日报缓存
        ctx.waitUntil(generateDailyReportCache(env));
        break;

      default:
        console.warn(`[Cron] Unknown cron schedule: ${event.cron}`);
    }
  },
};
