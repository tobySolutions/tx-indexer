import { PRICE_CACHE_TTL_MS, PRICE_REVALIDATE_SECONDS } from "@/lib/constants";
import { trackApiCall, trackCacheHit, trackCacheMiss } from "@/lib/performance";

const JUPITER_PRICE_API = "https://lite-api.jup.ag/price/v3/price";

/** Maximum number of tokens per batch to avoid URL length limits */
const MAX_TOKENS_PER_BATCH = 50;

interface JupiterPriceData {
  usdPrice: number;
  decimals: number;
}

type PriceResponse = Record<string, JupiterPriceData>;

// =============================================================================
// IN-MEMORY PRICE CACHE
// =============================================================================
// Prices are cached in memory to avoid redundant API calls during polling.
// This dramatically reduces external API calls since portfolio calculation
// happens on every balance poll (every 60s).

interface CachedPrice {
  price: number;
  timestamp: number;
}

const priceCache = new Map<string, CachedPrice>();

/**
 * Get cached price if still valid
 */
function getCachedPrice(mint: string): number | null {
  const cached = priceCache.get(mint);
  if (!cached) return null;

  const age = Date.now() - cached.timestamp;
  if (age > PRICE_CACHE_TTL_MS) {
    priceCache.delete(mint);
    return null;
  }

  return cached.price;
}

/**
 * Set price in cache
 */
function setCachedPrice(mint: string, price: number): void {
  priceCache.set(mint, {
    price,
    timestamp: Date.now(),
  });
}

/**
 * Fetch prices for a batch of tokens from Jupiter
 */
async function fetchPriceBatch(mints: string[]): Promise<Map<string, number>> {
  const prices = new Map<string, number>();

  if (mints.length === 0) {
    return prices;
  }

  const ids = mints.join(",");
  const startTime = performance.now();

  try {
    const response = await fetch(`${JUPITER_PRICE_API}?ids=${ids}`, {
      next: { revalidate: PRICE_REVALIDATE_SECONDS },
    });

    const duration = performance.now() - startTime;

    if (!response.ok) {
      console.error("[Prices] Failed to fetch from Jupiter:", response.status);
      trackApiCall("jupiter-prices", duration, {
        cached: false,
        tokenCount: mints.length,
      });
      return prices;
    }

    const data: PriceResponse = await response.json();

    for (const [mint, priceData] of Object.entries(data)) {
      if (priceData?.usdPrice) {
        prices.set(mint, priceData.usdPrice);
        // Update cache
        setCachedPrice(mint, priceData.usdPrice);
      }
    }

    // Track the API call
    trackApiCall("jupiter-prices", duration, {
      cached: false,
      tokenCount: mints.length,
    });
  } catch (error) {
    console.error("[Prices] Error fetching token prices:", error);
  }

  return prices;
}

/**
 * Fetch token prices with caching
 *
 * - First checks in-memory cache (5 min TTL)
 * - Only fetches uncached/stale tokens from Jupiter
 * - Batches requests to avoid URL length limits
 *
 * @param mints - Array of token mint addresses
 * @returns Map of mint address to USD price
 */
export async function fetchTokenPrices(
  mints: string[],
): Promise<Map<string, number>> {
  if (mints.length === 0) {
    return new Map();
  }

  const result = new Map<string, number>();
  const uncachedMints: string[] = [];

  // Check cache first
  for (const mint of mints) {
    const cachedPrice = getCachedPrice(mint);
    if (cachedPrice !== null) {
      result.set(mint, cachedPrice);
      trackCacheHit(`price:${mint.slice(0, 8)}`);
    } else {
      uncachedMints.push(mint);
      trackCacheMiss(`price:${mint.slice(0, 8)}`);
    }
  }

  // If all prices are cached, return early
  if (uncachedMints.length === 0) {
    return result;
  }

  // Batch uncached mints to avoid URL length limits
  const batches: string[][] = [];
  for (let i = 0; i < uncachedMints.length; i += MAX_TOKENS_PER_BATCH) {
    batches.push(uncachedMints.slice(i, i + MAX_TOKENS_PER_BATCH));
  }

  // Fetch all batches in parallel
  const batchResults = await Promise.all(batches.map(fetchPriceBatch));

  // Merge batch results into final result
  for (const batchPrices of batchResults) {
    for (const [mint, price] of batchPrices) {
      result.set(mint, price);
    }
  }

  return result;
}

/**
 * Clear the price cache (useful for testing or forced refresh)
 */
export function clearPriceCache(): void {
  priceCache.clear();
}

/**
 * Get cache stats for debugging
 */
export function getPriceCacheStats(): { size: number; entries: string[] } {
  return {
    size: priceCache.size,
    entries: Array.from(priceCache.keys()),
  };
}
