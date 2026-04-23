import { createClient, SupabaseClient } from '@supabase/supabase-js';

let cached: SupabaseClient | null = null;

/**
 * Server-side Supabase client using SERVICE_ROLE_KEY.
 * IMPORTANT: bypasses RLS. Use only after auth is verified and workspace
 * membership is checked. Always filter queries by workspace_id explicitly.
 *
 * Untyped on purpose: the typed Database lives in src/ (frontend). We avoid
 * importing across api/<->src/ to keep Vercel function bundles self-contained
 * (cross-tree type-only imports caused ERR_MODULE_NOT_FOUND at runtime).
 */
export function getServiceSupabase(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  }
  cached = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cached;
}
