// src/cron/update-stats.ts
// Lobster Hub - Daily Stats Update via Cloudflare Workers Cron Triggers
// Updates lobsters table aggregate fields from activity tables

import { getSupabase } from '../services/supabase';
import type { Env } from '../types';

// ============================================================
// 每日更新 lobsters 表的统计字段
// - visit_count: 从 visits 表统计每个 visitor_id 的拜访次数
// - message_count: 从 messages 表统计每个 to_lobster_id 收到的消息数
// - quality_score: 从 messages 表的 quality_score 平均值计算
// ============================================================

export async function updateLobsterStats(env: Env): Promise<void> {
  console.log('[Cron] updateLobsterStats started');
  const supabase = getSupabase(env);

  try {
    // 1. 从 visits 表统计 visit_count
    const { data: visitData, error: visitError } = await supabase
      .from('visits')
      .select('visitor_id');

    if (visitError) {
      console.error('[Cron] Failed to fetch visits:', visitError);
      throw new Error(`visits fetch failed: ${visitError.message}`);
    }

    const visitCounts: Record<string, number> = {};
    for (const v of visitData || []) {
      visitCounts[v.visitor_id] = (visitCounts[v.visitor_id] || 0) + 1;
    }

    // 2. 从 messages 表统计 message_count（收到的消息）和 quality_score（平均质量分）
    const { data: messageData, error: messageError } = await supabase
      .from('messages')
      .select('to_lobster_id, quality_score');

    if (messageError) {
      console.error('[Cron] Failed to fetch messages:', messageError);
      throw new Error(`messages fetch failed: ${messageError.message}`);
    }

    const messageCounts: Record<string, number> = {};
    const qualityScores: Record<string, number[]> = {};
    for (const m of messageData || []) {
      messageCounts[m.to_lobster_id] = (messageCounts[m.to_lobster_id] || 0) + 1;
      if (m.quality_score != null) {
        if (!qualityScores[m.to_lobster_id]) qualityScores[m.to_lobster_id] = [];
        qualityScores[m.to_lobster_id].push(m.quality_score);
      }
    }

    // 3. 合并所有 lobster ID
    const allIds = new Set<string>([
      ...Object.keys(visitCounts),
      ...Object.keys(messageCounts),
    ]);

    console.log(`[Cron] Updating stats for ${allIds.size} lobsters`);

    // 4. 批量更新 lobsters 表
    // Supabase 不支持批量 UPSERT 多行不同值，逐条更新
    let updated = 0;
    let failed = 0;

    const allIdsArray = Array.from(allIds);
    for (let idx = 0; idx < allIdsArray.length; idx++) {
      const id = allIdsArray[idx];
      const visitCount = visitCounts[id] || 0;
      const messageCount = messageCounts[id] || 0;
      const scores = qualityScores[id] || [];
      const avgQuality = scores.length > 0
        ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100
        : 0;

      const { error: updateError } = await supabase
        .from('lobsters')
        .update({
          visit_count: visitCount,
          message_count: messageCount,
          quality_score: avgQuality,
          last_active: new Date().toISOString(),
        })
        .eq('id', id);

      if (updateError) {
        console.error(`[Cron] Failed to update lobster ${id}:`, updateError.message);
        failed++;
      } else {
        updated++;
      }
    }

    console.log(`[Cron] updateLobsterStats completed: ${updated} updated, ${failed} failed`);
  } catch (err) {
    console.error('[Cron] updateLobsterStats error:', err);
    throw err;
  }
}
