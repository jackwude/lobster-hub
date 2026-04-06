// src/routes/skills.ts

import { Hono } from 'hono';
import type { Env } from '../types';
import { getSupabase } from '../services/supabase';
import { authMiddleware } from '../middleware/auth';

const skills = new Hono<{ Bindings: Env }>();

const CATEGORIES = ['social', 'productivity', 'creative', 'data', 'language', 'devops', 'other'];

const CATEGORY_LABELS: Record<string, string> = {
  social: '社交',
  productivity: '效率',
  creative: '创意',
  data: '数据',
  language: '语言',
  devops: '运维',
  other: '其他',
};

// GET /api/v1/skills - 技能列表（分页，支持 category 筛选 + search 搜索）
skills.get('/', async (c) => {
  const supabase = getSupabase(c.env);
  const page = Math.max(1, parseInt(c.req.query('page') || '1'));
  const pageSize = Math.min(50, Math.max(1, parseInt(c.req.query('page_size') || '20')));
  const category = c.req.query('category');
  const search = c.req.query('search');

  let query = supabase
    .from('skills')
    .select(`
      id,
      name,
      description,
      category,
      skill_version,
      source_url,
      installs,
      created_at,
      lobster:lobsters!lobster_id(id, name, emoji)
    `, { count: 'exact' })
    .order('installs', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (category && CATEGORIES.includes(category)) {
    query = query.eq('category', category);
  }

  if (search) {
    const term = `%${search}%`;
    query = query.or(`name.ilike.${term},description.ilike.${term}`);
  }

  const { data, error, count } = await query;

  if (error) {
    return c.json({ error: 'internal_error', message: error.message }, 500);
  }

  return c.json({
    data: data || [],
    total: count || 0,
    page,
    page_size: pageSize,
    categories: CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABELS[c] })),
  });
});

// GET /api/v1/skills/:id - 技能详情（含所属龙虾信息）
skills.get('/:id', async (c) => {
  const supabase = getSupabase(c.env);
  const id = c.req.param('id');

  const { data, error } = await supabase
    .from('skills')
    .select(`
      id,
      name,
      description,
      category,
      skill_version,
      source_url,
      installs,
      created_at,
      lobster:lobsters!lobster_id(id, name, emoji, personality, bio)
    `)
    .eq('id', id)
    .single();

  if (error || !data) {
    return c.json({ error: 'not_found', message: 'Skill not found' }, 404);
  }

  return c.json({ data });
});

// POST /api/v1/skills - 发布技能（需要 auth）
skills.post('/', authMiddleware, async (c) => {
  const supabase = getSupabase(c.env);
  const auth = c.get('auth');

  const body = await c.req.json<{
    name?: string;
    description?: string;
    category?: string;
    source_url?: string;
  }>();

  if (!body.name || !body.name.trim()) {
    return c.json({ error: 'validation_error', message: 'name is required' }, 400);
  }

  const category = body.category || 'other';
  if (!CATEGORIES.includes(category)) {
    return c.json({ error: 'validation_error', message: `Invalid category. Must be one of: ${CATEGORIES.join(', ')}` }, 400);
  }

  const { data, error } = await supabase
    .from('skills')
    .insert({
      lobster_id: auth.lobster_id,
      name: body.name.trim(),
      description: body.description?.trim() || null,
      category,
      source_url: body.source_url?.trim() || null,
    })
    .select()
    .single();

  if (error) {
    return c.json({ error: 'internal_error', message: error.message }, 500);
  }

  return c.json({ data }, 201);
});

// POST /api/v1/skills/:id/install - 记录安装（installs +1）
skills.post('/:id/install', async (c) => {
  const supabase = getSupabase(c.env);
  const id = c.req.param('id');

  // Use RPC or a simple update with increment
  // Supabase JS doesn't support atomic increment directly, so we do a read-then-write
  const { data: skill, error: fetchError } = await supabase
    .from('skills')
    .select('id, installs')
    .eq('id', id)
    .single();

  if (fetchError || !skill) {
    return c.json({ error: 'not_found', message: 'Skill not found' }, 404);
  }

  const { error: updateError } = await supabase
    .from('skills')
    .update({ installs: (skill.installs || 0) + 1 })
    .eq('id', id);

  if (updateError) {
    return c.json({ error: 'internal_error', message: updateError.message }, 500);
  }

  return c.json({ success: true, installs: (skill.installs || 0) + 1 });
});

export default skills;
