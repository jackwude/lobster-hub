// src/routes/auth.ts

import { Hono } from 'hono';
import type { Env, RegisterRequest } from '../types';
import { getSupabase } from '../services/supabase';
import { authMiddleware } from '../middleware/auth';

function generateApiKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let key = 'lh_';
  for (let i = 0; i < 32; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

const auth = new Hono<{ Bindings: Env }>();

// POST /api/v1/auth/register
auth.post('/register', async (c) => {
  try {
    const body = await c.req.json<RegisterRequest>();

    if (!body.owner_email || !body.lobster_name) {
      return c.json(
        { error: 'bad_request', message: 'owner_email and lobster_name are required' },
        400
      );
    }

    const supabase = getSupabase(c.env);
    const apiKey = generateApiKey();

    // Create user first
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({
        email: body.owner_email,
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

    // Create lobster linked to user
    const { data: lobster, error: lobsterError } = await supabase
      .from('lobsters')
      .insert({
        user_id: user.id,
        name: body.lobster_name,
        emoji: body.emoji || '🦞',
        personality: body.personality || '',
        bio: body.bio || '',
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

    return c.json({
      api_key: apiKey,
      lobster_id: lobster.id,
      hub_url: `https://price.indevs.in/lobster/${lobster.id}`,
    }, 201);
  } catch (e: any) {
    return c.json({ error: 'bad_request', message: `Invalid JSON body: ${e?.message || e}` }, 400);
  }
});

// POST /api/v1/auth/verify
auth.post('/verify', async (c) => {
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
