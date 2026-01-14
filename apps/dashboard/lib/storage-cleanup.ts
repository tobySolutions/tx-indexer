/**
 * Storage cleanup utilities
 *
 * Clears stale data from localStorage that might contain outdated
 * RPC URLs or other cached configuration.
 */

/**
 * List of localStorage keys that might contain stale RPC URLs
 * These are typically set by wallet adapters and Solana libraries
 */
const SOLANA_STORAGE_KEYS = [
  "solana:last-connector",
  "walletAdapter",
  "wallet-adapter",
  "solana-wallet",
  "solanaWallet",
];

/**
 * RPC URL patterns that should trigger a cleanup
 * Add any old/deleted API keys here
 */
const STALE_RPC_PATTERNS = [
  "c2db5d9a-e490-4976-8edc-c859c5d5aaed", // Deleted Helius key
];

/**
 * Check if a value contains a stale RPC URL
 */
function containsStaleRpc(value: string): boolean {
  return STALE_RPC_PATTERNS.some((pattern) => value.includes(pattern));
}

/**
 * Clean up stale Solana-related localStorage entries
 *
 * This function:
 * 1. Checks known Solana storage keys for stale RPC URLs
 * 2. Removes entries that contain deleted/invalid API keys
 * 3. Logs cleanup actions in development mode
 */
export function cleanupStaleSolanaStorage(): void {
  if (typeof window === "undefined") return;

  const isDev = process.env.NODE_ENV === "development";

  try {
    // Check specific known keys
    for (const key of SOLANA_STORAGE_KEYS) {
      const value = localStorage.getItem(key);
      if (value && containsStaleRpc(value)) {
        localStorage.removeItem(key);
        if (isDev) {
          console.log(`[Storage Cleanup] Removed stale key: ${key}`);
        }
      }
    }

    // Also scan all localStorage for any keys containing stale RPC URLs
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      const value = localStorage.getItem(key);
      if (value && containsStaleRpc(value)) {
        keysToRemove.push(key);
      }
    }

    // Remove found stale keys
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
    // localStorage might be unavailable (e.g., private browsing)
    console.warn("[Storage Cleanup] Failed to clean localStorage:", error);
  }
}

/**
 * Clear all Solana wallet connection data
 * Use this for a complete reset of wallet state
 */
export function clearAllWalletStorage(): void {
  if (typeof window === "undefined") return;

  try {
    for (const key of SOLANA_STORAGE_KEYS) {
      localStorage.removeItem(key);
    }

    // Also remove any keys that look Solana-related
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

    console.log("[Storage Cleanup] Cleared all wallet storage");
  } catch (error) {
    console.warn("[Storage Cleanup] Failed to clear wallet storage:", error);
  }
}
