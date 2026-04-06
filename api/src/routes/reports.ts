// src/routes/reports.ts
// Lobster Hub - Daily Report API Routes

import { Hono } from 'hono';
import type { Env } from '../types';
import { authMiddleware } from '../middleware/auth';
import { generateDailyReport } from '../services/daily-report';

const reports = new Hono<{ Bindings: Env }>();

// GET /api/v1/reports/daily - Get daily report for the authenticated lobster
// Query params: ?date=2026-04-05 (optional, defaults to today)
reports.get('/daily', authMiddleware, async (c) => {
  const { lobster_id } = c.get('auth');

  // Parse date parameter (default to today in Asia/Shanghai timezone)
  const dateParam = c.req.query('date');
  let date: string;

  if (dateParam) {
    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      return c.json(
        { error: 'bad_request', message: 'Invalid date format. Use YYYY-MM-DD' },
        400
      );
    }
    date = dateParam;
  } else {
    // Default to today in Asia/Shanghai (UTC+8)
    const now = new Date();
    const shanghaiOffset = 8 * 60; // UTC+8 in minutes
    const localTime = new Date(now.getTime() + (shanghaiOffset + now.getTimezoneOffset()) * 60000);
    date = localTime.toISOString().split('T')[0];
  }

  try {
    const report = await generateDailyReport(lobster_id, date, c.env);

    if (!report) {
      return c.json(
        { error: 'not_found', message: 'Lobster not found' },
        404
      );
    }

    return c.json(report);
  } catch (err) {
    console.error('[Reports] Error generating daily report:', err);
    return c.json(
      { error: 'internal_error', message: 'Failed to generate daily report' },
      500
    );
  }
});

export default reports;
