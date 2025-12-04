import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";
import { getSupabaseUrl, getSupabaseServiceRoleKey } from "@/server/env";

/**
 * Service-role Supabase client for server-side use only.
 * Never import this into client components or expose the key to the browser.
 */
export function createServiceClient() {
  return createClient<Database>(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
    auth: { persistSession: false },
    global: {
      headers: { "X-Client-Info": "next-server-service-role" },
    },
  });
}
