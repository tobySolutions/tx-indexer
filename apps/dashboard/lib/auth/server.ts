import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

export interface AuthUser {
  id: string;
  walletAddress: string | null;
}

/**
 * Gets the current authenticated user from a server context
 * Use this in Server Components, Server Actions, and Route Handlers
 */
export async function getAuthUser(): Promise<AuthUser | null> {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return {
    id: user.id,
    walletAddress: user.user_metadata?.wallet_address ?? null,
  };
}

/**
 * Gets the current authenticated user or throws an error
 * Use this when authentication is required
 */
export async function requireAuth(): Promise<AuthUser> {
  const user = await getAuthUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  return user;
}

/**
 * Checks if a user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getAuthUser();
  return user !== null;
}

/**
 * Gets the full Supabase user object
 */
export async function getSupabaseUser(): Promise<User | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}
