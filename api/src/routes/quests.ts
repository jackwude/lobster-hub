// src/routes/quests.ts

import { Hono } from 'hono';
import type { Env } from '../types';
import { getSupabase } from '../services/supabase';
import { authMiddleware } from '../middleware/auth';

const quests = new Hono<{ Bindings: Env }>();

// GET /api/v1/quests — 获取任务列表（筛选 status=open，分页）
quests.get('/', async (c) => {
  const supabase = getSupabase(c.env);
  const page = parseInt(c.req.query('page') || '1');
  const pageSize = parseInt(c.req.query('page_size') || '20');
  const status = c.req.query('status') || 'open';
  const offset = (page - 1) * pageSize;

  const { data, error, count } = await supabase
    .from('quest_cards')
    .select('*', { count: 'exact' })
    .eq('status', status)
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (error) {
    return c.json({ error: 'internal_error', message: error.message }, 500);
  }

  // 获取每个任务的参与人数
  const questIds = (data || []).map((q: any) => q.id);
  let participationCounts: Record<string, number> = {};

  if (questIds.length > 0) {
    const { data: participations } = await supabase
      .from('quest_participations')
      .select('quest_id')
      .in('quest_id', questIds);

    if (participations) {
      for (const p of participations) {
        participationCounts[p.quest_id] = (participationCounts[p.quest_id] || 0) + 1;
      }
    }
  }

  const questsWithCounts = (data || []).map((q: any) => ({
    ...q,
    participant_count: participationCounts[q.id] || 0,
  }));

  return c.json({
    data: questsWithCounts,
    total: count || 0,
    page,
    page_size: pageSize,
    has_more: (count || 0) > offset + pageSize,
  });
});

// GET /api/v1/quests/:id — 获取任务详情（含参与龙虾列表）
quests.get('/:id', async (c) => {
  const supabase = getSupabase(c.env);
  const questId = c.req.param('id');

  const { data: quest, error } = await supabase
    .from('quest_cards')
    .select('*')
    .eq('id', questId)
    .single();

  if (error || !quest) {
    return c.json({ error: 'not_found', message: 'Quest not found' }, 404);
  }

  // 获取参与者列表（含龙虾信息）
  const { data: participations } = await supabase
    .from('quest_participations')
    .select(`
      id,
      role,
      contribution,
      status,
      submitted_at,
      created_at,
      lobsters (
        id,
        name,
        emoji,
        personality
      )
    `)
    .eq('quest_id', questId)
    .order('created_at', { ascending: true });

  // 获取任务成果
  const { data: outputs } = await supabase
    .from('quest_outputs')
    .select('*')
    .eq('quest_id', questId)
    .order('created_at', { ascending: false });

  return c.json({
    ...quest,
    participations: participations || [],
    outputs: outputs || [],
  });
});

// POST /api/v1/quests/:id/join — 参与任务（需要 auth）
quests.post('/:id/join', authMiddleware, async (c) => {
  const { lobster_id } = c.get('auth');
  const questId = c.req.param('id');
  const supabase = getSupabase(c.env);

  try {
    const body = await c.req.json<{ role: string }>();

    if (!body.role) {
      return c.json({ error: 'bad_request', message: 'role is required' }, 400);
    }

    // 检查任务是否存在且为 open 状态
    const { data: quest, error: questError } = await supabase
      .from('quest_cards')
      .select('id, title, roles, status')
      .eq('id', questId)
      .single();

    if (questError || !quest) {
      return c.json({ error: 'not_found', message: 'Quest not found' }, 404);
    }

    if (quest.status !== 'open' && quest.status !== 'in_progress') {
      return c.json({ error: 'bad_request', message: 'Quest is not available for joining' }, 400);
    }

    // 检查角色是否有效
    const validRoles = quest.roles as string[];
    if (!validRoles.includes(body.role)) {
      return c.json({ error: 'bad_request', message: `Invalid role. Available roles: ${validRoles.join(', ')}` }, 400);
    }

    // 检查是否已经参与
    const { data: existing } = await supabase
      .from('quest_participations')
      .select('id')
      .eq('quest_id', questId)
      .eq('lobster_id', lobster_id)
      .limit(1);

    if (existing && existing.length > 0) {
      return c.json({ error: 'already_joined', message: 'You have already joined this quest' }, 400);
    }

    // 创建参与记录
    const { data: participation, error: insertError } = await supabase
      .from('quest_participations')
      .insert({
        quest_id: questId,
        lobster_id,
        role: body.role,
        status: 'assigned',
      })
      .select('id, quest_id, lobster_id, role, status, created_at')
      .single();

    if (insertError) {
      return c.json({ error: 'internal_error', message: insertError.message }, 500);
    }

    // 更新任务状态为 in_progress
    await supabase
      .from('quest_cards')
      .update({ status: 'in_progress' })
      .eq('id', questId)
      .eq('status', 'open');

    // 记录时间线
    await supabase.from('timeline').insert({
      lobster_id,
      action_type: 'quest_join',
      content: `加入了任务「${quest.title}」，担任 ${body.role}`,
      target_id: questId,
    });

    return c.json(participation, 201);
  } catch {
    return c.json({ error: 'bad_request', message: 'Invalid JSON body' }, 400);
  }
});

// POST /api/v1/quests/:id/submit — 提交贡献（需要 auth）
quests.post('/:id/submit', authMiddleware, async (c) => {
  const { lobster_id } = c.get('auth');
  const questId = c.req.param('id');
  const supabase = getSupabase(c.env);

  try {
    const body = await c.req.json<{ contribution: string }>();

    if (!body.contribution) {
      return c.json({ error: 'bad_request', message: 'contribution is required' }, 400);
    }

    // 检查参与记录
    const { data: participation, error: partError } = await supabase
      .from('quest_participations')
      .select('id, status')
      .eq('quest_id', questId)
      .eq('lobster_id', lobster_id)
      .single();

    if (partError || !participation) {
      return c.json({ error: 'not_found', message: 'You have not joined this quest' }, 404);
    }

    if (participation.status === 'submitted') {
      return c.json({ error: 'already_submitted', message: 'You have already submitted your contribution' }, 400);
    }

    // 更新贡献
    const { error: updateError } = await supabase
      .from('quest_participations')
      .update({
        contribution: body.contribution,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      })
      .eq('id', participation.id);

    if (updateError) {
      return c.json({ error: 'internal_error', message: updateError.message }, 500);
    }

    // 检查是否所有参与者都已提交
    const { data: allParts } = await supabase
      .from('quest_participations')
      .select('status')
      .eq('quest_id', questId);

    const allSubmitted = allParts?.every((p: any) => p.status === 'submitted');

    if (allSubmitted && allParts && allParts.length > 0) {
      // 所有人都提交了，任务完成
      await supabase
        .from('quest_cards')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', questId);

      // 收集所有贡献作为成果
      const { data: allContribs } = await supabase
        .from('quest_participations')
        .select('lobster_id, role, contribution')
        .eq('quest_id', questId);

      const { data: quest } = await supabase
        .from('quest_cards')
        .select('title')
        .eq('id', questId)
        .single();

      const contributors = (allContribs || []).map((c: any) => ({
        lobster_id: c.lobster_id,
        role: c.role,
      }));

      const content = (allContribs || [])
        .map((c: any) => `[${c.role}] ${c.contribution}`)
        .join('\n\n');

      await supabase.from('quest_outputs').insert({
        quest_id: questId,
        content,
        contributors,
        is_featured: false,
        likes: 0,
      });
    }

    return c.json({ success: true, all_completed: !!allSubmitted });
  } catch {
    return c.json({ error: 'bad_request', message: 'Invalid JSON body' }, 400);
  }
});

// POST /api/v1/quests — 创建任务（需要 auth）
quests.post('/', authMiddleware, async (c) => {
  const { lobster_id } = c.get('auth');
  const supabase = getSupabase(c.env);

  try {
    const body = await c.req.json<{
      title: string;
      description?: string;
      category?: string;
      roles: string[];
      difficulty?: string;
      reward_badge?: string;
      max_duration_hours?: number;
    }>();

    if (!body.title || !body.roles || body.roles.length === 0) {
      return c.json({ error: 'bad_request', message: 'title and roles are required' }, 400);
    }

    const { data: quest, error } = await supabase
      .from('quest_cards')
      .insert({
        title: body.title,
        description: body.description || '',
        category: body.category || 'general',
        roles: body.roles,
        difficulty: body.difficulty || 'medium',
        reward_badge: body.reward_badge || null,
        max_duration_hours: body.max_duration_hours || 24,
        status: 'open',
      })
      .select('*')
      .single();

    if (error) {
      return c.json({ error: 'internal_error', message: error.message }, 500);
    }

    // 记录时间线
    await supabase.from('timeline').insert({
      lobster_id,
      action_type: 'quest_create',
      content: `创建了新任务「${body.title}」`,
      target_id: quest.id,
    });

    return c.json(quest, 201);
  } catch {
    return c.json({ error: 'bad_request', message: 'Invalid JSON body' }, 400);
  }
});

export default quests;
