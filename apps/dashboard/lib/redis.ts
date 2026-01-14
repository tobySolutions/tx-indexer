import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

// Initialize Redis client lazily to avoid errors when env vars are missing
let _redis: Redis | null = null;

/**
 * Get the Redis client instance
 * Returns null if Redis is not configured
 */
export function getRedis(): Redis | null {
  if (_redis) return _redis;

  if (!isRedisConfigured()) {
    return null;
  }

  _redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });

  return _redis;
}

// Legacy export for backwards compatibility
// Only use this when you've already checked isRedisConfigured()
export const redis = {
  get get() {
    const r = getRedis();
    if (!r) throw new Error("Redis not configured");
    return r.get.bind(r);
  },
  get set() {
    const r = getRedis();
    if (!r) throw new Error("Redis not configured");
    return r.set.bind(r);
  },
  get del() {
    const r = getRedis();
    if (!r) throw new Error("Redis not configured");
    return r.del.bind(r);
  },
  get getdel() {
    const r = getRedis();
    if (!r) throw new Error("Redis not configured");
    return r.getdel.bind(r);
  },
  get scan() {
    const r = getRedis();
    if (!r) throw new Error("Redis not configured");
    return r.scan.bind(r);
  },
};

// Rate limiter - only create if Redis is configured
let _authRateLimiter: Ratelimit | null = null;

export function getAuthRateLimiter(): Ratelimit | null {
  if (_authRateLimiter) return _authRateLimiter;

  const r = getRedis();
  if (!r) return null;

  _authRateLimiter = new Ratelimit({
    redis: r,
    limiter: Ratelimit.slidingWindow(10, "60 s"),
    analytics: true,
    prefix: "ratelimit:auth",
  });

  return _authRateLimiter;
}

// Legacy export for backwards compatibility
export const authRateLimiter = {
  get limit() {
    const limiter = getAuthRateLimiter();
    if (!limiter) throw new Error("Redis not configured");
    return limiter.limit.bind(limiter);
  },
};

// Nonce storage keys
const NONCE_PREFIX = "auth:nonce:";
const NONCE_TTL_SECONDS = 300; // 5 minutes

/**
 * Stores a nonce in Redis with expiration
 */
export async function storeNonce(nonce: string): Promise<void> {
  await redis.set(`${NONCE_PREFIX}${nonce}`, "1", { ex: NONCE_TTL_SECONDS });
}

/**
 * Validates and consumes a nonce (single use)
 * Returns true if nonce was valid and unused, false otherwise
 */
export async function validateAndConsumeNonce(nonce: string): Promise<boolean> {
  // Use GETDEL to atomically get and delete the nonce
  // This ensures the nonce can only be used once
  const result = await redis.getdel(`${NONCE_PREFIX}${nonce}`);
  return result !== null;
}

/**
 * Checks if Redis is configured and available
 */
export function isRedisConfigured(): boolean {
  return !!(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  );
}
