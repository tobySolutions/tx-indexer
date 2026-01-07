"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type PropsWithChildren,
} from "react";
import type { User, Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { AuthContextValue, SignMessageFn } from "./types";
import bs58 from "bs58";

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const supabase = createClient();

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);
      } catch (error) {
        console.error("[Auth] Failed to get session:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase.auth]);

  const signIn = useCallback(
    async (walletAddress: string, signMessage: SignMessageFn) => {
      setIsLoading(true);

      try {
        // 1. Get a nonce from the server
        const nonceResponse = await fetch("/api/auth/nonce");
        if (!nonceResponse.ok) {
          throw new Error("Failed to get nonce");
        }
        const { nonce } = await nonceResponse.json();

        // 2. Create the message to sign
        const message = createSignInMessage(walletAddress, nonce);
        const messageBytes = new TextEncoder().encode(message);

        // 3. Sign the message with the wallet
        const signatureBytes = await signMessage(messageBytes);
        const signature = bs58.encode(signatureBytes);

        // 4. Verify signature and get session token
        const verifyResponse = await fetch("/api/auth/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            walletAddress,
            signature,
            message,
            nonce,
          }),
        });

        if (!verifyResponse.ok) {
          const error = await verifyResponse.json();
          throw new Error(error.error || "Failed to verify signature");
        }

        const { token } = await verifyResponse.json();

        // 5. Use the token to sign in with Supabase
        const { error: signInError } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: "magiclink",
        });

        if (signInError) {
          throw signInError;
        }
      } catch (error) {
        console.error("[Auth] Sign in failed:", error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [supabase.auth],
  );

  const signOut = useCallback(async () => {
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("[Auth] Sign out failed:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [supabase.auth]);

  const value: AuthContextValue = {
    user,
    session,
    isLoading,
    isAuthenticated: !!session,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

/**
 * Creates a human-readable message for the user to sign
 */
function createSignInMessage(walletAddress: string, nonce: string): string {
  const domain = typeof window !== "undefined" ? window.location.host : "app";
  const timestamp = new Date().toISOString();

  return `Sign in to ${domain}

Wallet: ${walletAddress}
Nonce: ${nonce}
Issued At: ${timestamp}

This request will not trigger a blockchain transaction or cost any gas fees.`;
}
