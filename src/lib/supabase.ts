import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, processLock, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

/**
 * Public client config. Only the PUBLISHABLE (anon) key belongs in the app.
 * Row Level Security makes it safe to ship. Never put the service-role key here.
 */
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/** Public key, also sent on direct Storage requests made outside supabase-js. */
export const supabasePublishableKey = key ?? '';

/** False → the app runs in demo mode on mock data (Phase 1 behaviour). */
export const isSupabaseConfigured = Boolean(url && key);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, key!, {
      auth: {
        storage: AsyncStorage, // persists the session across app restarts
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false, // deep links are handled by the reset-password route
        flowType: 'pkce',
        lock: processLock,
      },
    })
  : null;

// Only refresh tokens while the app is in the foreground (recommended for React Native).
if (supabase && Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

/** Returns the client or throws. Use only on code paths that already checked `isSupabaseConfigured`. */
export function requireSupabase(): SupabaseClient {
  if (!supabase) throw new Error('Supabase is not configured.');
  return supabase;
}
