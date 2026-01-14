/**
 * Redis-backed transaction cache
 *
 * Transactions are immutable once confirmed, so we can cache them aggressively.
 * Using Redis instead of in-memory cache provides:
 * - Persistence across deployments
 * - Shared cache across serverless function instances
 * - 30-minute TTL that survives process restarts
 *
 * Cache strategy:
 * - Cache transactions by wallet address
 * - Store the latest signature to detect new transactions
 * - On refresh, only fetch transactions newer than the latest cached signature
 */

import { getRedis, isRedisConfigured } from "@/lib/redis";
import type { ClassifiedTransaction } from "tx-indexer";
import { TRANSACTION_CACHE_TTL_MS } from "@/lib/constants";
import { trackCacheHit, trackCacheMiss, trackApiCall } from "@/lib/performance";

// =============================================================================
// BigInt Serialization Helpers
// =============================================================================
// Transactions contain BigInt values which JSON.stringify cannot handle.
// We convert BigInt to string for storage and back to BigInt on retrieval.

/**
 * Replacer function for JSON.stringify that converts BigInt to string
 */
function bigIntReplacer(_key: string, value: unknown): unknown {
  if (typeof value === "bigint") {
    return { __type: "bigint", value: value.toString() };
  }
  return value;
}

/**
 * Reviver function for JSON.parse that converts string back to BigInt
 */
function bigIntReviver(_key: string, value: unknown): unknown {
  if (
    value &&
    typeof value === "object" &&
    (value as Record<string, unknown>).__type === "bigint"
  ) {
    return BigInt((value as { value: string }).value);
  }
  return value;
}

/**
 * Serialize data for Redis storage (handles BigInt)
 */
function serialize<T>(data: T): string {
  return JSON.stringify(data, bigIntReplacer);
}

/**
 * Deserialize data from Redis storage (handles BigInt)
 */
function deserialize<T>(data: string): T {
  return JSON.parse(data, bigIntReviver) as T;
}

// Cache TTL in seconds for Redis
const TRANSACTION_CACHE_TTL_SECONDS = Math.floor(
  TRANSACTION_CACHE_TTL_MS / 1000,
);

// Redis key prefix for transaction cache
const TX_CACHE_PREFIX = "tx-cache:";

interface CachedTransactionData {
  transactions: ClassifiedTransaction[];
  latestSignature: string | null;
  oldestSignature: string | null;
  timestamp: number;
  hasMore: boolean;
}

/**
 * Generate Redis key for a wallet's transaction cache
 */
function getCacheKey(walletAddress: string): string {
  return `${TX_CACHE_PREFIX}${walletAddress}`;
}

/**
 * Get cached transactions for a wallet from Redis
 */
export async function getCachedTransactions(
  walletAddress: string,
): Promise<CachedTransactionData | null> {
  // Fall back gracefully if Redis is not configured
  if (!isRedisConfigured()) {
    return null;
  }

  const redis = getRedis();
  if (!redis) {
    return null;
  }

  const startTime = performance.now();

  try {
    const cachedString = await redis.get<string>(getCacheKey(walletAddress));

    const duration = performance.now() - startTime;

    if (!cachedString) {
      trackCacheMiss(`redis:tx:${walletAddress.slice(0, 8)}`);
      trackApiCall("redis-get", duration, { cached: false });
      return null;
    }

    // Deserialize with BigInt support
    const cached = deserialize<CachedTransactionData>(
      typeof cachedString === "string"
        ? cachedString
        : JSON.stringify(cachedString),
    );

    trackCacheHit(`redis:tx:${walletAddress.slice(0, 8)}`);
    trackApiCall("redis-get", duration, { cached: true });

    return cached;
  } catch (error) {
    console.error("[TX Cache] Failed to get from Redis:", error);
    trackCacheMiss(`redis:tx:${walletAddress.slice(0, 8)}:error`);
    return null;
  }
}

/**
 * Store transactions in Redis cache
 */
export async function setCachedTransactions(
  walletAddress: string,
  transactions: ClassifiedTransaction[],
  hasMore: boolean,
): Promise<void> {
  if (!isRedisConfigured() || transactions.length === 0) {
    return;
  }

  const redis = getRedis();
  if (!redis) {
    return;
  }

  const startTime = performance.now();

  try {
    const latestSignature = transactions[0]?.tx.signature ?? null;
    const oldestSignature =
      transactions[transactions.length - 1]?.tx.signature ?? null;

    const cacheData: CachedTransactionData = {
      transactions,
      latestSignature,
      oldestSignature,
      timestamp: Date.now(),
      hasMore,
    };

    // Serialize with BigInt support
    const serialized = serialize(cacheData);

    await redis.set(getCacheKey(walletAddress), serialized, {
      ex: TRANSACTION_CACHE_TTL_SECONDS,
    });

    const duration = performance.now() - startTime;
    trackApiCall("redis-set", duration, { cached: false });
  } catch (error) {
    console.error("[TX Cache] Failed to set in Redis:", error);
  }
}

/**
 * Prepend new transactions to the cache
 */
export async function prependToCache(
  walletAddress: string,
  newTransactions: ClassifiedTransaction[],
): Promise<void> {
  if (!isRedisConfigured() || newTransactions.length === 0) {
    return;
  }

  const redis = getRedis();
  if (!redis) {
    return;
  }

  try {
    const cached = await getCachedTransactions(walletAddress);
    if (!cached) {
      // No existing cache, just set the new transactions
      await setCachedTransactions(walletAddress, newTransactions, true);
      return;
    }

    // Filter out duplicates
    const existingSignatures = new Set(
      cached.transactions.map((tx) => tx.tx.signature),
    );
    const uniqueNew = newTransactions.filter(
      (tx) => !existingSignatures.has(tx.tx.signature),
    );

    if (uniqueNew.length === 0) {
      return;
    }

    // Prepend new transactions and update cache
    const updatedData: CachedTransactionData = {
      ...cached,
      transactions: [...uniqueNew, ...cached.transactions],
      latestSignature: uniqueNew[0]?.tx.signature ?? cached.latestSignature,
      timestamp: Date.now(),
    };

    // Serialize with BigInt support
    const serialized = serialize(updatedData);

    await redis.set(getCacheKey(walletAddress), serialized, {
      ex: TRANSACTION_CACHE_TTL_SECONDS,
    });
  } catch (error) {
    console.error("[TX Cache] Failed to prepend to Redis:", error);
  }
}

/**
 * Append older transactions to the cache (for pagination)
 */
export async function appendToCache(
  walletAddress: string,
  olderTransactions: ClassifiedTransaction[],
  hasMore: boolean,
): Promise<void> {
  if (!isRedisConfigured() || olderTransactions.length === 0) {
    return;
  }

  const redis = getRedis();
  if (!redis) {
    return;
  }

  try {
    const cached = await getCachedTransactions(walletAddress);
    if (!cached) {
      // No existing cache, just set the transactions
      await setCachedTransactions(walletAddress, olderTransactions, hasMore);
      return;
    }

    // Filter out duplicates
    const existingSignatures = new Set(
      cached.transactions.map((tx) => tx.tx.signature),
    );
    const uniqueOlder = olderTransactions.filter(
      (tx) => !existingSignatures.has(tx.tx.signature),
    );

    if (uniqueOlder.length === 0) {
      // Just update hasMore flag if needed
      if (cached.hasMore !== hasMore) {
        const serialized = serialize({ ...cached, hasMore });
        await redis.set(getCacheKey(walletAddress), serialized, {
          ex: TRANSACTION_CACHE_TTL_SECONDS,
        });
      }
      return;
    }

    // Append older transactions and update cache
    const updatedData: CachedTransactionData = {
      ...cached,
      transactions: [...cached.transactions, ...uniqueOlder],
      oldestSignature:
        uniqueOlder[uniqueOlder.length - 1]?.tx.signature ??
        cached.oldestSignature,
      hasMore,
      timestamp: Date.now(),
    };

    // Serialize with BigInt support
    const serialized = serialize(updatedData);

    await redis.set(getCacheKey(walletAddress), serialized, {
      ex: TRANSACTION_CACHE_TTL_SECONDS,
    });
  } catch (error) {
    console.error("[TX Cache] Failed to append to Redis:", error);
  }
}

/**
 * Clear cache for a specific wallet
 */
export async function clearTransactionCache(
  walletAddress: string,
): Promise<void> {
  if (!isRedisConfigured()) {
    return;
  }

  const redis = getRedis();
  if (!redis) {
    return;
  }

  try {
    await redis.del(getCacheKey(walletAddress));
  } catch (error) {
    console.error("[TX Cache] Failed to clear cache:", error);
  }
}

/**
 * Clear all transaction caches (use with caution)
 */
export async function clearAllTransactionCaches(): Promise<void> {
  if (!isRedisConfigured()) {
    return;
  }

  const redis = getRedis();
  if (!redis) {
    return;
  }

  try {
    // Scan for all transaction cache keys and delete them
    // Upstash returns cursor as string
    let cursor: string = "0";

    do {
      const result = await redis.scan(cursor, {
        match: `${TX_CACHE_PREFIX}*`,
        count: 100,
      });
      cursor = String(result[0]);
      const keys = result[1];

      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } while (cursor !== "0");
  } catch (error) {
    console.error("[TX Cache] Failed to clear all caches:", error);
  }
}

/**
 * Get cache stats for debugging
 */
export async function getTransactionCacheStats(): Promise<{
  configured: boolean;
  keyCount: number;
  keys: string[];
} | null> {
  if (!isRedisConfigured()) {
    return { configured: false, keyCount: 0, keys: [] };
  }

  const redis = getRedis();
  if (!redis) {
    return { configured: false, keyCount: 0, keys: [] };
  }

  try {
    const keys: string[] = [];
    let cursor: string = "0";

    do {
      const result = await redis.scan(cursor, {
        match: `${TX_CACHE_PREFIX}*`,
        count: 100,
      });
      cursor = String(result[0]);
      keys.push(...result[1]);
    } while (cursor !== "0");

    return {
      configured: true,
      keyCount: keys.length,
      keys: keys.map((k) => k.replace(TX_CACHE_PREFIX, "")),
    };
  } catch (error) {
    console.error("[TX Cache] Failed to get stats:", error);
    return null;
  }
}
