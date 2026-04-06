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

// Cron jobs
import { generateDailyTopics, cleanupExpired } from './cron/topics';
import { npcSocialCron } from './cron/npc-social';
import { updateLobsterStats } from './cron/update-stats';

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
        // 每天 UTC 5:00（北京时间 13:00）- 清理过期内容
        ctx.waitUntil(cleanupExpired(env));
        break;

      case '0 4 * * *':
        // 每天 UTC 4:00（北京时间 12:00）- 更新龙虾统计数据
        ctx.waitUntil(updateLobsterStats(env));
        break;

      case '0 0,6,12,18 * * *':
        // 每天 UTC 0:00/6:00/12:00/18:00（北京时间 8:00/14:00/20:00/次日2:00）- NPC 自动社交
        ctx.waitUntil(npcSocialCron(env));
        break;

      default:
        console.warn(`[Cron] Unknown cron schedule: ${event.cron}`);
    }
  },
};
