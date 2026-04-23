import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../src/types/database';

let cached: SupabaseClient<Database> | null = null;

/**
 * Server-side Supabase client using SERVICE_ROLE_KEY.
 * IMPORTANT: bypasses RLS. Use only after auth is verified and workspace
 * membership is checked. Always filter queries by workspace_id explicitly.
 */
export function getServiceSupabase(): SupabaseClient<Database> {
  if (cached) return cached;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  }
  cached = createClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cached;
}
