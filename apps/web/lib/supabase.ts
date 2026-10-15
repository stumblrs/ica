import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Resolves Supabase URL and Publishable API Key from environment variables.
 * On Vercel: Configure these in Project Settings -> Environment Variables.
 */
function getCredentials() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    '';

  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_KEY ||
    '';

  return { url, key };
}

// Global singleton for browser & API route usage
let clientInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!clientInstance) {
    const { url, key } = getCredentials();

    if (!url || !key) {
      if (typeof window === 'undefined') {
        console.warn(
          '[Supabase] Warning: Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in environment variables.'
        );
      }
    }

    // During build time (next build), if env vars are not yet present, a dummy URL
    // prevents createClient from crashing during Next.js page pre-rendering.
    // In runtime on Vercel, url and key come from Vercel's Environment Variables.
    const resolvedUrl = url || 'https://ldsrvzgcvuztrjkqtxpl.supabase.co';
    const resolvedKey = key || 'dummy-build-key';

    clientInstance = createClient(resolvedUrl, resolvedKey, {
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
