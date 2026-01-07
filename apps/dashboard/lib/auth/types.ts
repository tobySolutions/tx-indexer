import type { User, Session } from "@supabase/supabase-js";

export interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface AuthContextValue extends AuthState {
  signIn: (walletAddress: string, signMessage: SignMessageFn) => Promise<void>;
  signOut: () => Promise<void>;
}

export type SignMessageFn = (message: Uint8Array) => Promise<Uint8Array>;
