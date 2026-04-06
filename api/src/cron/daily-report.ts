// src/cron/daily-report.ts
// Lobster Hub - Daily Report Cron Job
// Pre-generates and caches daily reports for active lobsters
// Runs at UTC 16:00 (Beijing Time 00:00)

import { getSupabase } from '../services/supabase';
import { generateDailyReport, cacheDailyReport, getActiveLobsterIds } from '../services/daily-report';
import type { Env } from '../types';

export async function generateDailyReportCache(env: Env): Promise<void> {
  console.log('[Cron] generateDailyReportCache started');
  const supabase = getSupabase(env);

  try {
    // Calculate yesterday's date in UTC (since we run at UTC 16:00, it's the previous day in Beijing)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const date = yesterday.toISOString().split('T')[0];

    console.log(`[Cron] Generating daily reports for date: ${date}`);

    // Get all active lobster IDs (last 7 days)
    const activeIds = await getActiveLobsterIds(env);
    console.log(`[Cron] Found ${activeIds.length} active lobsters`);

    if (activeIds.length === 0) {
      console.log('[Cron] No active lobsters, skipping');
      return;
    }

    // Generate and cache reports for each active lobster
    let generated = 0;
    let failed = 0;

    for (const lobsterId of activeIds) {
      try {
        const report = await generateDailyReport(lobsterId, date, env);
        if (report) {
          await cacheDailyReport(lobsterId, date, report, env);
          generated++;
        } else {
          console.warn(`[Cron] Report generation returned null for lobster: ${lobsterId}`);
          failed++;
        }
      } catch (err) {
        console.error(`[Cron] Failed to generate report for lobster ${lobsterId}:`, err);
        failed++;
      }
    }

    console.log(
      `[Cron] generateDailyReportCache completed: ${generated} generated, ${failed} failed out of ${activeIds.length} active lobsters`
    );
  } catch (err) {
    console.error('[Cron] generateDailyReportCache error:', err);
    throw err;
  }
}
