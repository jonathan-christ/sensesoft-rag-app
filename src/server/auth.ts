import { createClient } from "@/features/auth/lib/supabase/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

export type AuthenticatedClient = SupabaseClient<Database>;

export interface AuthResult {
  user: User;
  supabase: AuthenticatedClient;
}

export interface AuthError {
  error: true;
  status: 401;
  message: string;
}

/**
 * Get authenticated Supabase client and user from request context.
 * Returns either { user, supabase } or { error: true, status: 401, message }.
 *
 * Usage:
 * ```ts
 * const auth = await requireAuth();
 * if ("error" in auth) {
 *   return unauthorized();
 * }
 * const { user, supabase } = auth;
 * ```
 */
export async function requireAuth(): Promise<AuthResult | AuthError> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      error: true,
      status: 401,
      message: "Unauthorized",
    };
  }

  return { user, supabase };
}

/**
 * Type guard to check if auth result is an error.
 */
export function isAuthError(
  result: AuthResult | AuthError,
): result is AuthError {
  return "error" in result && result.error === true;
}

