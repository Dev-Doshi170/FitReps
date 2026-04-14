import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import type { RealtimeClientOptions } from '@supabase/realtime-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@env';

const url = SUPABASE_URL || 'http://127.0.0.1:54321';
const anonKey =
  SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDE3NjkyMDAsImV4cCI6MTk1NzM0NTYwMH0.ClWiqatx_fqhlpqQEfYJrrS2sxMuwwqzcfBVpph4v0';

if (__DEV__ && (!SUPABASE_URL || !SUPABASE_ANON_KEY)) {
  console.warn(
    '[FitReps] Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env. Using local Supabase defaults (127.0.0.1:54321). ' +
      'That only works with `supabase start` on the same machine; on a device/emulator it usually causes "Network request failed". ' +
      'Copy .env.example to .env and set your project URL and anon/publishable key from the Supabase dashboard.',
  );
}

export const supabase = createClient(url, anonKey, {
  realtime: {
    enabled: false,
  } as RealtimeClientOptions & { enabled?: boolean },
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
