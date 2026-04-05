// src/services/supabase.ts

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Env } from '../types';

let _client: SupabaseClient | null = null;

export function getSupabase(env: Env): SupabaseClient {
  if (!_client) {
    _client = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
  }
  return _client;
}
