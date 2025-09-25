import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";

/**
 * Service-role Supabase client for server-side use only.
 * Never import this into client components or expose the key to the browser.
 */
export function createServiceClient() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE ??
    process.env.SERVICE_ROLE_KEY ??
    process.env.EDGE_SERVICE_ROLE_KEY ??
    "";

  if (!url) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) environment variable.",
    );
  }

  if (!serviceRoleKey) {
    throw new Error(
      "Missing service-role key. Set SUPABASE_SERVICE_ROLE_KEY or SERVICE_ROLE_KEY or EDGE_SERVICE_ROLE_KEY.",
    );
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      persistSession: false,
    },
    global: {
      headers: {
        "X-Client-Info": "next-server-service-role",
      },
    },
  });
}
