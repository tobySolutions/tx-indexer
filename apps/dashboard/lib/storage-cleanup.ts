const SOLANA_STORAGE_KEYS = [
  "solana:last-connector",
  "walletAdapter",
  "wallet-adapter",
  "solana-wallet",
  "solanaWallet",
];

const STALE_RPC_PATTERNS = ["c2db5d9a-e490-4976-8edc-c859c5d5aaed"];

function containsStaleRpc(value: string): boolean {
  return STALE_RPC_PATTERNS.some((pattern) => value.includes(pattern));
}

export function cleanupStaleSolanaStorage(): void {
  if (typeof window === "undefined") return;

  const isDev = process.env.NODE_ENV === "development";

  try {
    for (const key of SOLANA_STORAGE_KEYS) {
      const value = localStorage.getItem(key);
      if (value && containsStaleRpc(value)) {
        localStorage.removeItem(key);
        if (isDev) {
          console.log(`[Storage Cleanup] Removed stale key: ${key}`);
        }
      }
    }

    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      const value = localStorage.getItem(key);
      if (value && containsStaleRpc(value)) {
        keysToRemove.push(key);
      }
    }

    for (const key of keysToRemove) {
      localStorage.removeItem(key);
      if (isDev) {
        console.log(`[Storage Cleanup] Removed stale key: ${key}`);
      }
    }

    if (isDev && keysToRemove.length > 0) {
      console.log(
        `[Storage Cleanup] Cleaned ${keysToRemove.length} stale entries`,
      );
    }
  } catch (error) {
    console.warn("[Storage Cleanup] Failed to clean localStorage:", error);
  }
}

export function clearAllWalletStorage(): void {
  if (typeof window === "undefined") return;

  try {
    for (const key of SOLANA_STORAGE_KEYS) {
      localStorage.removeItem(key);
    }

    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key &&
        (key.toLowerCase().includes("solana") ||
          key.toLowerCase().includes("wallet"))
      ) {
        keysToRemove.push(key);
      }
    }

    for (const key of keysToRemove) {
      localStorage.removeItem(key);
    }

    if (process.env.NODE_ENV === "development") {
      console.log("[Storage Cleanup] Cleared all wallet storage");
    }
  } catch (error) {
    console.warn("[Storage Cleanup] Failed to clear wallet storage:", error);
  }
}
