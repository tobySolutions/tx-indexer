// Server-side only - do not import in client components
export {
  getAuthUser,
  requireAuth,
  isAuthenticated,
  getSupabaseUser,
  type AuthUser,
} from "./server";
