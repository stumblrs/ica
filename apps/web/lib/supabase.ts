import { createClient, SupabaseClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://ldsrvzgcvuztrjkqtxpl.supabase.co';
const DEFAULT_SUPABASE_PUBLISHABLE_KEY =
  'sb_publishable_8U7TcrZn6TORbQ_miJPdBQ__hyUAWS0';

/**
 * Resolves Supabase URL and Publishable API Key from environment variables.
 * Falls back to the project's public publishable key so client WebSockets & Realtime never fail.
 */
function getCredentials() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    DEFAULT_SUPABASE_URL;

  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_KEY ||
    DEFAULT_SUPABASE_PUBLISHABLE_KEY;

  return { url, key };
}

// Global singleton for browser & API route usage
let clientInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!clientInstance) {
    const { url, key } = getCredentials();

    clientInstance = createClient(url, key, {
      auth: {
        persistSession: typeof window !== 'undefined',
        autoRefreshToken: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
  }
  return clientInstance;
}

export const supabase = getSupabase();

export default supabase;
