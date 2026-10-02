import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "../config";

let client: SupabaseClient | null = null;

/** Cliente único de Supabase. Solo se usa Realtime (sin auth ni base de datos). */
export function getSupabase(): SupabaseClient {
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      realtime: {
        params: { eventsPerSecond: 40 },
        // Heartbeat en un Web Worker para que las pestañas en segundo plano no pierdan la conexión.
        worker: true,
      },
    });
  }
  return client;
}
