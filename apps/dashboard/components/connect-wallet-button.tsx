"use client";

import {
  useConnectWallet,
  useDisconnectWallet,
  useWallet,
} from "@solana/react-hooks";
import { useState, useEffect, useRef, useCallback } from "react";
import { truncate, cn } from "@/lib/utils";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";

const CONNECTORS: ReadonlyArray<{ id: string; label: string }> = [
  { id: "wallet-standard:phantom", label: "phantom" },
  { id: "wallet-standard:solflare", label: "solflare" },
  { id: "wallet-standard:backpack", label: "backpack" },
];

export function ConnectWalletButton() {
  const wallet = useWallet();
  const connectWallet = useConnectWallet();
  const disconnectWallet = useDisconnectWallet();
  const { isAuthenticated, signIn, signOut } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  // Track if we initiated the connection (to trigger auto sign-in)
  const pendingSignInRef = useRef(false);

  const isConnected = wallet.status === "connected";
  const address = isConnected
    ? wallet.session.account.address.toString()
    : null;

  // Auto sign-in after wallet connects
  const performSignIn = useCallback(async () => {
    if (wallet.status !== "connected" || !wallet.session.signMessage) return;

    try {
      const walletAddress = wallet.session.account.address.toString();
      const walletSignMessage = wallet.session.signMessage;
      const signMessage = async (message: Uint8Array) => {
        const result = await walletSignMessage(message);
        return result;
      };

      await signIn(walletAddress, signMessage);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "unable to sign in");
    } finally {
      setIsConnecting(false);
      pendingSignInRef.current = false;
    }
  }, [wallet, signIn]);

  // Effect to trigger sign-in when wallet connects
  useEffect(() => {
    if (isConnected && pendingSignInRef.current && !isAuthenticated) {
      performSignIn();
    }
  }, [isConnected, isAuthenticated, performSignIn]);

  async function handleConnect(connectorId: string) {
    setError(null);
    setIsConnecting(true);
    pendingSignInRef.current = true;

    try {
      await connectWallet(connectorId);
      // Sign-in will be triggered by the useEffect when wallet connects
    } catch (err) {
      setError(err instanceof Error ? err.message : "unable to connect");
      setIsConnecting(false);
      pendingSignInRef.current = false;
    }
  }

  async function handleDisconnect() {
    setError(null);
    try {
      // Sign out from Supabase first if authenticated
      if (isAuthenticated) {
        await signOut();
      }
      await disconnectWallet();
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "unable to disconnect");
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        disabled={isConnecting}
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors",
          "bg-vibrant-red text-white hover:bg-vibrant-red/90",
          "cursor-pointer min-w-[160px] justify-center",
          isConnecting && "opacity-70 cursor-wait",
        )}
      >
        {isConnecting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>signing in...</span>
          </>
        ) : address ? (
          <span className="font-mono">{truncate(address)}</span>
        ) : (
          <span>sign in</span>
        )}
        {!isConnecting &&
          (open ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          ))}
      </button>

      {open && !isConnecting && (
        <div className="absolute right-0 z-10 mt-2 w-full min-w-[240px] rounded-lg border border-neutral-200 bg-white shadow-lg">
          {isConnected ? (
            <div className="p-2 space-y-2">
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-medium text-neutral-500">
                    signed in
                  </p>
                  {isAuthenticated && (
                    <span className="text-xs font-medium text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                      active
                    </span>
                  )}
                </div>
                <p className="font-mono text-sm text-neutral-900">
                  {truncate(address ?? "")}
                </p>
              </div>

              <button
                type="button"
                onClick={() => void handleDisconnect()}
                className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
              >
                sign out
              </button>
            </div>
          ) : (
            <div className="pb-2">
              <p className="text-xs font-medium text-neutral-500 px-3 py-2">
                choose wallet
              </p>
              <div className="space-y-1">
                {CONNECTORS.map((connector) => (
                  <button
                    key={connector.id}
                    type="button"
                    onClick={() => void handleConnect(connector.id)}
                    className="w-full px-3 py-2 text-sm text-left hover:bg-neutral-50 transition-colors flex justify-between items-center"
                  >
                    <span>{connector.label}</span>
                    <span className="text-neutral-400">→</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {error && <p className="px-3 pb-2 text-sm text-red-600">{error}</p>}
        </div>
      )}
    </div>
  );
}
