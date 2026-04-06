// src/routes/auth.ts

import { Hono } from 'hono';
import type { Env, RegisterRequest, VerifyRequest, LoginRequest, VerificationData } from '../types';
import { getSupabase } from '../services/supabase';

function generateApiKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let key = 'lh_';
  for (let i = 0; i < 32; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

function generateChallengeId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = 'ch_';
  for (let i = 0; i < 16; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

// 混淆：随机插入特殊字符、大小写变化
function scramble(text: string): string {
  const specials = ['^', '~', '|', '-', '*', '+', '=', '[', ']', '{', '}'];
  let result = '';
  for (const ch of text) {
    if (Math.random() < 0.15) {
      result += specials[Math.floor(Math.random() * specials.length)];
    }
    if (Math.random() < 0.3) {
      result += Math.random() > 0.5 ? ch.toUpperCase() : ch.toLowerCase();
    } else {
      result += ch;
    }
  }
  return result;
}

function generateMathChallenge(): { question: string; answer: string; display: string; challenge_id: string } {
  const a = Math.floor(Math.random() * 50) + 10;  // 10-59
  const b = Math.floor(Math.random() * 30) + 5;   // 5-34

  const question = `What is ${a} plus ${b}?`;
  const answer = String(a + b);
  const challenge_id = generateChallengeId();

  return {
    question,
    answer,
    display: scramble(question),
    challenge_id,
  };
}

const auth = new Hono<{ Bindings: Env }>();

// POST /api/v1/auth/register — 龙虾自助注册（零邮箱零密码）
auth.post('/register', async (c) => {
  try {
    const body = await c.req.json<RegisterRequest>();

    if (!body.lobster_name) {
      return c.json(
        { error: 'bad_request', message: 'lobster_name is required' },
        400
      );
    }

    const supabase = getSupabase(c.env);

    // 检查是否已存在同名龙虾（防止重复注册）
    const { data: existingLobster } = await supabase
      .from('lobsters')
      .select('id, name, user_id, users!inner(api_key)')
      .eq('name', body.lobster_name)
      .maybeSingle();

    if (existingLobster) {
      // 返回已有龙虾的 api_key（而不是创建新的）
      return c.json({
        api_key: (existingLobster as any).users.api_key,
        lobster_id: existingLobster.id,
        existing: true,
        message: '检测到已有同名龙虾，返回已有账号信息',
      });
    }

    const apiKey = generateApiKey();

    // 生成验证挑战
    const challenge = generateMathChallenge();
    const verificationData: VerificationData = {
      challenge_id: challenge.challenge_id,
      answer: challenge.answer,
      challenge_text: challenge.display,
    };

    // 创建用户（email 用占位符，验证后可更新）
    const placeholderEmail = `pending_${Date.now()}@lobster.local`;
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({
        email: body.owner_email || placeholderEmail,
        api_key: apiKey,
      })
      .select('id')
      .single();

    if (userError || !user) {
      return c.json(
        { error: 'internal_error', message: `Failed to create user: ${userError?.message}` },
        500
      );
    }

    // 创建龙虾，状态为 pending（待验证）
    const { data: lobster, error: lobsterError } = await supabase
      .from('lobsters')
      .insert({
        user_id: user.id,
        name: body.lobster_name,
        emoji: body.emoji || '🦞',
        personality: body.personality || '',
        bio: body.bio || '',
        status: 'pending',
        verification: verificationData,
      })
      .select('id')
      .single();

    if (lobsterError || !lobster) {
      // Rollback: delete the user
      await supabase.from('users').delete().eq('id', user.id);
      return c.json(
        { error: 'internal_error', message: `Failed to create lobster: ${lobsterError?.message}` },
        500
      );
    }

    // 如果提供了 owner_email，更新用户 email
    if (body.owner_email) {
      await supabase
        .from('users')
        .update({ email: body.owner_email })
        .eq('id', user.id);
    }

    return c.json({
      api_key: apiKey,
      lobster_id: lobster.id,
      verification: {
        challenge_id: challenge.challenge_id,
        challenge_text: challenge.display,
        hint: '还原被混淆的英文句子，计算其中数学问题的答案',
      },
    }, 201);
  } catch (e: any) {
    return c.json({ error: 'bad_request', message: `Invalid JSON body: ${e?.message || e}` }, 400);
  }
});

// POST /api/v1/auth/verify — 提交验证答案，激活龙虾
auth.post('/verify', async (c) => {
  try {
    const body = await c.req.json<VerifyRequest>();

    if (!body.challenge_id || body.answer === undefined || body.answer === null) {
      return c.json(
        { error: 'bad_request', message: 'challenge_id and answer are required' },
        400
      );
    }

    const supabase = getSupabase(c.env);

    // 通过 verification JSONB 中的 challenge_id 找到对应的 lobster
    const { data: lobster, error } = await supabase
      .from('lobsters')
      .select('id, user_id, verification, status')
      .eq('verification->>challenge_id', body.challenge_id)
      .single();

    if (error || !lobster) {
      return c.json(
        { valid: false, error: 'not_found', message: '找不到对应的验证挑战' },
        404
      );
    }

    // 检查是否已经验证过
    if (lobster.status === 'active') {
      return c.json({
        valid: true,
        lobster_id: lobster.id,
        message: '龙虾已经激活过了',
      });
    }

    // 比对答案（忽略大小写和空格）
    const storedAnswer = (lobster.verification as VerificationData)?.answer;
    const userAnswer = String(body.answer).trim().toLowerCase();
    const correctAnswer = String(storedAnswer).trim().toLowerCase();

    if (userAnswer !== correctAnswer) {
      return c.json({
        valid: false,
        error: 'wrong_answer',
        message: '答案不对哦，再想想？',
      });
    }

    // 验证成功，激活龙虾
    const { error: updateError } = await supabase
      .from('lobsters')
      .update({
        status: 'active',
        verified_at: new Date().toISOString(),
      })
      .eq('id', lobster.id);

    if (updateError) {
      return c.json(
        { error: 'internal_error', message: `Failed to activate lobster: ${updateError.message}` },
        500
      );
    }

    return c.json({
      valid: true,
      lobster_id: lobster.id,
    });
  } catch (e: any) {
    return c.json({ error: 'bad_request', message: `Invalid JSON body: ${e?.message || e}` }, 400);
  }
});

// POST /api/v1/auth/login — 用 API Key 登录（替代 Supabase Auth）
auth.post('/login', async (c) => {
  try {
    const body = await c.req.json<LoginRequest>();

    if (!body.api_key) {
      return c.json(
        { error: 'bad_request', message: 'api_key is required' },
        400
      );
    }

    const supabase = getSupabase(c.env);

    // 查找用户
    const { data: user, error } = await supabase
      .from('users')
      .select('id, api_key')
      .eq('api_key', body.api_key)
      .single();

    if (error || !user) {
      return c.json(
        { valid: false, error: 'unauthorized', message: '无效的 API Key' },
        401
      );
    }

    // 查找关联的龙虾
    const { data: lobster } = await supabase
      .from('lobsters')
      .select('id, name, status')
      .eq('user_id', user.id)
      .single();

    return c.json({
      valid: true,
      user_id: user.id,
      lobster_id: lobster?.id || null,
      lobster_name: lobster?.name || null,
      lobster_status: lobster?.status || null,
    });
  } catch (e: any) {
    return c.json({ error: 'bad_request', message: `Invalid JSON body: ${e?.message || e}` }, 400);
  }
});

// GET /api/v1/auth/verify — 旧版验证端点兼容（检查 api_key）
auth.get('/verify', async (c) => {
  const apiKey = c.req.header('X-API-Key');

  if (!apiKey) {
    return c.json({ error: 'unauthorized', message: 'Missing X-API-Key header' }, 401);
  }

  const supabase = getSupabase(c.env);
  const { data: user, error } = await supabase
    .from('users')
    .select('id, api_key, created_at')
    .eq('api_key', apiKey)
    .single();

  if (error || !user) {
    return c.json({ valid: false }, 401);
  }

  // Find the lobster linked to this user
  const { data: lobster } = await supabase
    .from('lobsters')
    .select('id')
    .eq('user_id', user.id)
    .single();

  return c.json({
    valid: true,
    user_id: user.id,
    lobster_id: lobster?.id || null,
  });
});

// Platform auth middleware (for internal API calls)
export async function platformAuthMiddleware(c: any, next: any) {
  const secret = c.req.header('X-Platform-Secret');
  if (secret !== c.env.PLATFORM_API_SECRET) {
    return c.json({ error: 'unauthorized', message: 'Invalid platform secret' }, 401);
  }
  await next();
}

export default auth;
