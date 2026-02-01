"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useWallet } from "@solana/react-hooks";
import { Connection, PublicKey, VersionedTransaction } from "@solana/web3.js";
import {
  type PrivacyCashToken,
  PRIVACY_CASH_SUPPORTED_TOKENS,
} from "@/lib/privacy/constants";
import {
  PrivacyCashClient,
  type PrivacyBalance,
  type PrivacyCashResult,
} from "@/lib/privacy/privacy-cash-client";
import { detectWalletProvider } from "@/lib/wallet-transactions";

export type PrivacyCashStatus =
  | "idle"
  | "initializing"
  | "loading_balance"
  | "preparing"
  | "generating_proof"
  | "signing"
  | "confirming"
  | "success"
  | "error";

export interface ShieldParams {
  amount: number;
  token: PrivacyCashToken;
}

export interface UnshieldParams {
  amount: number;
  token: PrivacyCashToken;
  recipientAddress: string;
}

export interface PrivacyOperationResult {
  signature: string | null;
  error: string | null;
  isPartial?: boolean;
  fee?: number;
}

export interface UsePrivacyCashReturn {
  privateBalance: PrivacyBalance | null;
  isLoadingBalance: boolean;
  status: PrivacyCashStatus;
  isProcessing: boolean;
  isInitialized: boolean;
  signature: string | null;
  error: string | null;
  initialize: () => Promise<void>;
  shield: (params: ShieldParams) => Promise<PrivacyOperationResult>;
  unshield: (params: UnshieldParams) => Promise<PrivacyOperationResult>;
  refreshBalance: (token?: PrivacyCashToken, silent?: boolean) => Promise<void>;
  reset: () => void;
  isTokenSupported: (token: string) => boolean;
  getClient: () => PrivacyCashClient | null;
}

const RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL ??
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ??
  "https://api.mainnet-beta.solana.com";

const DEBUG = process.env.NODE_ENV === "development";
const debugLog = (...args: Parameters<typeof console.log>) => {
  if (DEBUG) console.log(...args);
};

export function usePrivacyCash(
  defaultToken: PrivacyCashToken = "SOL",
): UsePrivacyCashReturn {
  const wallet = useWallet();

  const clientRef = useRef<PrivacyCashClient | null>(null);
  const connectionRef = useRef<Connection | null>(null);
  const lastAddressRef = useRef<string | null>(null);
  const isInitializedRef = useRef(false);
  const isInitializingRef = useRef(false);

  // State
  const [privateBalance, setPrivateBalance] = useState<PrivacyBalance | null>(
    null,
  );
  const [status, setStatus] = useState<PrivacyCashStatus>("idle");
  const [signature, setSignature] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    isInitializedRef.current = isInitialized;
  }, [isInitialized]);

  const walletAddress =
    wallet.status === "connected"
      ? wallet.session.account.address.toString()
      : null;
  const walletSession = wallet.status === "connected" ? wallet.session : null;

  const getConnection = useCallback(() => {
    if (!connectionRef.current) {
      connectionRef.current = new Connection(RPC_URL, "confirmed");
    }
    return connectionRef.current;
  }, []);

  const createSignTransaction = useCallback(() => {
    const provider = detectWalletProvider();
    if (!provider?.signTransaction) return null;

    return async (tx: VersionedTransaction): Promise<VersionedTransaction> => {
      debugLog("[PrivacyCash] Signing transaction with provider...");
      const signed = await provider.signTransaction!(tx);
      debugLog("[PrivacyCash] Transaction signed successfully");
      return signed;
    };
  }, []);

  const createSignMessage = useCallback(() => {
    if (!walletSession?.signMessage) return null;

    const signMsg = walletSession.signMessage;
    return async (message: Uint8Array): Promise<Uint8Array> => {
      return await signMsg(message);
    };
  }, [walletSession]);

  const getClient = useCallback(() => {
    if (!walletAddress || !walletSession) {
      return null;
    }

    const signTransaction = createSignTransaction();
    const signMessage = createSignMessage();

    if (!signTransaction || !signMessage) {
      return null;
    }

    if (lastAddressRef.current !== walletAddress) {
      const publicKey = new PublicKey(walletAddress);

      clientRef.current = new PrivacyCashClient({
        connection: getConnection(),
        publicKey,
        signTransaction,
        signMessage,
      });

      lastAddressRef.current = walletAddress;
      setIsInitialized(false);
    }

    return clientRef.current;
  }, [
    walletAddress,
    walletSession,
    createSignTransaction,
    createSignMessage,
    getConnection,
  ]);

  useEffect(() => {
    if (wallet.status !== "connected") {
      setPrivateBalance(null);
      setIsInitialized(false);
      clientRef.current = null;
      lastAddressRef.current = null;
      isInitializingRef.current = false;
    }
  }, [wallet.status]);

  const initialize = useCallback(async (): Promise<void> => {
    const client = getClient();
    if (!client) {
      setError("Wallet not connected");
      setStatus("error");
      return;
    }

    if (isInitializedRef.current || isInitializingRef.current) return;

    isInitializingRef.current = true;
    setStatus("initializing");
    setError(null);

    try {
      await client.initialize();
      setIsInitialized(true);
      setStatus("idle");
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to initialize Privacy Cash";
      setError(errorMessage);
      setStatus("error");
    } finally {
      isInitializingRef.current = false;
    }
  }, [getClient]);

  const refreshBalance = useCallback(
    async (
      token: PrivacyCashToken = defaultToken,
      silent = false,
    ): Promise<void> => {
      const client = getClient();
      if (!client) {
        return;
      }

      if (!isInitializedRef.current) {
        if (isInitializingRef.current) {
          return;
        }
        await initialize();
      }

      if (!isInitializedRef.current) {
        return;
      }

      if (!silent) {
        setStatus("loading_balance");
        setError(null);
      }

      try {
        const balance = await client.getBalance(token);
        setPrivateBalance(balance);
        if (!silent) {
          setStatus("idle");
        }
      } catch (err) {
        if (!silent) {
          const errorMessage =
            err instanceof Error ? err.message : "Failed to fetch balance";
          setError(errorMessage);
          setStatus("error");
        }
      }
    },
    [getClient, initialize, defaultToken],
  );

  const shield = useCallback(
    async (params: ShieldParams): Promise<PrivacyOperationResult> => {
      const { amount, token } = params;
      const client = getClient();

      if (!client) {
        setError("Wallet not connected");
        setStatus("error");
        return { signature: null, error: "Wallet not connected" };
      }

      if (!isInitializedRef.current) {
        if (isInitializingRef.current) {
          return { signature: null, error: "Initialization in progress" };
        }
        try {
          await initialize();
        } catch {
          return { signature: null, error: "Failed to initialize" };
        }
      }

      if (!isInitializedRef.current) {
        return { signature: null, error: "Not initialized" };
      }

      setError(null);
      setSignature(null);
      setStatus("preparing");

      try {
        setStatus("generating_proof");

        const result = await client.deposit(amount, token);

        setSignature(result.signature);
        setStatus("success");

        return { signature: result.signature, error: null };
      } catch (err) {
        console.error("[PrivacyCash] Shield error:", err);
        const errorMessage =
          err instanceof Error ? err.message : "Shield failed";
        setError(errorMessage);
        setStatus("error");
        return { signature: null, error: errorMessage };
      }
    },
    [getClient, initialize, refreshBalance],
  );

  const unshield = useCallback(
    async (params: UnshieldParams): Promise<PrivacyOperationResult> => {
      const { amount, token, recipientAddress } = params;
      const client = getClient();

      if (!client) {
        setError("Wallet not connected");
        setStatus("error");
        return { signature: null, error: "Wallet not connected" };
      }

      if (!isInitializedRef.current) {
        if (isInitializingRef.current) {
          return { signature: null, error: "Initialization in progress" };
        }
        try {
          await initialize();
        } catch {
          return { signature: null, error: "Failed to initialize" };
        }
      }

      if (!isInitializedRef.current) {
        return { signature: null, error: "Not initialized" };
      }

      if (privateBalance && privateBalance.amount < amount) {
        setError("Insufficient private balance");
        setStatus("error");
        return { signature: null, error: "Insufficient private balance" };
      }

      setError(null);
      setSignature(null);
      setStatus("preparing");

      try {
        setStatus("generating_proof");

        const result = await client.withdraw(amount, token, recipientAddress);

        setSignature(result.signature);
        setStatus("success");

        return {
          signature: result.signature,
          error: null,
          isPartial: result.isPartial,
          fee: result.fee,
        };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unshield failed";
        setError(errorMessage);
        setStatus("error");
        return { signature: null, error: errorMessage };
      }
    },
    [getClient, initialize, privateBalance, refreshBalance],
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setSignature(null);
    setError(null);
  }, []);

  const isTokenSupported = useCallback((token: string): boolean => {
    return token in PRIVACY_CASH_SUPPORTED_TOKENS;
  }, []);

  const isProcessing =
    status === "initializing" ||
    status === "preparing" ||
    status === "generating_proof" ||
    status === "signing" ||
    status === "confirming";

  const isLoadingBalance = status === "loading_balance";

  return {
    privateBalance,
    isLoadingBalance,
    status,
    isProcessing,
    isInitialized,
    signature,
    error,
    initialize,
    shield,
    unshield,
    refreshBalance,
    reset,
    isTokenSupported,
    getClient,
  };
}

// Re-export types for convenience
export type { PrivacyBalance, PrivacyCashResult, PrivacyCashToken };
