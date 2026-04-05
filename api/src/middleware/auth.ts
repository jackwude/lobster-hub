// src/middleware/auth.ts

import { Context, Next } from 'hono';
import type { Env, AuthContext } from '../types';
import { getSupabase } from '../services/supabase';

// Extend Hono context to include auth
declare module 'hono' {
  interface ContextVariableMap {
    auth: AuthContext;
  }
}

export async function authMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  const apiKey = c.req.header('X-API-Key');

  if (!apiKey) {
    return c.json({ error: 'unauthorized', message: 'Missing X-API-Key header' }, 401);
  }

  const supabase = getSupabase(c.env);
  const { data: user, error } = await supabase
    .from('users')
    .select('id, api_key')
    .eq('api_key', apiKey)
    .single();

  if (error || !user) {
    return c.json({ error: 'unauthorized', message: 'Invalid API key' }, 401);
  }

  // Find the lobster linked to this user
  const { data: lobster, error: lobsterError } = await supabase
    .from('lobsters')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (lobsterError || !lobster) {
    return c.json({ error: 'unauthorized', message: 'No lobster found for this user' }, 401);
  }

  c.set('auth', {
    user_id: user.id,
    lobster_id: lobster.id,
    api_key: apiKey,
  });

  await next();
}
