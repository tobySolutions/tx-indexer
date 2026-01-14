/**
 * Performance measurement utilities for the dashboard
 *
 * Usage:
 * - In development, metrics are logged to console
 * - Call `getPerformanceReport()` to get a summary
 * - Call `resetPerformanceMetrics()` to clear metrics
 */

// Only enable in development
const IS_DEV = process.env.NODE_ENV === "development";

// =============================================================================
// TYPES
// =============================================================================

interface ApiCallMetric {
  endpoint: string;
  timestamp: number;
  duration: number;
  cached: boolean;
  tokenCount?: number;
}

interface RenderMetric {
  component: string;
  timestamp: number;
  duration: number;
  reason?: string;
}

interface PerformanceMetrics {
  apiCalls: ApiCallMetric[];
  renders: RenderMetric[];
  cacheHits: number;
  cacheMisses: number;
  startTime: number;
}

// =============================================================================
// METRICS STORAGE
// =============================================================================

const metrics: PerformanceMetrics = {
  apiCalls: [],
  renders: [],
  cacheHits: 0,
  cacheMisses: 0,
  startTime: Date.now(),
};

// =============================================================================
// API CALL TRACKING
// =============================================================================

/**
 * Track an API call
 */
export function trackApiCall(
  endpoint: string,
  duration: number,
  options: { cached?: boolean; tokenCount?: number } = {},
): void {
  if (!IS_DEV) return;

  const metric: ApiCallMetric = {
    endpoint,
    timestamp: Date.now(),
    duration,
    cached: options.cached ?? false,
    tokenCount: options.tokenCount,
  };

  metrics.apiCalls.push(metric);

  // Log to console in dev
  const cacheStatus = options.cached ? "CACHE HIT" : "API CALL";
  console.log(
    `[Perf] ${cacheStatus}: ${endpoint} (${duration.toFixed(1)}ms)`,
    options.tokenCount ? `tokens: ${options.tokenCount}` : "",
  );
}

/**
 * Track a cache hit
 */
export function trackCacheHit(source: string): void {
  if (!IS_DEV) return;
  metrics.cacheHits++;
  console.log(`[Perf] Cache hit: ${source}`);
}

/**
 * Track a cache miss
 */
export function trackCacheMiss(source: string): void {
  if (!IS_DEV) return;
  metrics.cacheMisses++;
  console.log(`[Perf] Cache miss: ${source}`);
}

// =============================================================================
// RENDER TRACKING
// =============================================================================

/**
 * Track a component render
 */
export function trackRender(
  component: string,
  duration: number,
  reason?: string,
): void {
  if (!IS_DEV) return;

  metrics.renders.push({
    component,
    timestamp: Date.now(),
    duration,
    reason,
  });
}

/**
 * Create a render tracker HOC helper
 * Usage: wrap component with `withRenderTracking(MyComponent, 'MyComponent')`
 */
export function createRenderTracker(componentName: string) {
  let renderCount = 0;

  return {
    onRender: () => {
      if (!IS_DEV) return;
      renderCount++;
      console.log(`[Perf] Render #${renderCount}: ${componentName}`);
    },
    getRenderCount: () => renderCount,
    reset: () => {
      renderCount = 0;
    },
  };
}

// =============================================================================
// TIMING UTILITIES
// =============================================================================

/**
 * Measure the duration of an async function
 */
export async function measureAsync<T>(
  name: string,
  fn: () => Promise<T>,
): Promise<T> {
  if (!IS_DEV) return fn();

  const start = performance.now();
  try {
    const result = await fn();
    const duration = performance.now() - start;
    console.log(`[Perf] ${name}: ${duration.toFixed(1)}ms`);
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    console.log(`[Perf] ${name} (failed): ${duration.toFixed(1)}ms`);
    throw error;
  }
}

/**
 * Create a timer for manual start/stop timing
 */
export function createTimer(name: string) {
  let startTime: number | null = null;

  return {
    start: () => {
      startTime = performance.now();
    },
    stop: () => {
      if (startTime === null) return 0;
      const duration = performance.now() - startTime;
      if (IS_DEV) {
        console.log(`[Perf] ${name}: ${duration.toFixed(1)}ms`);
      }
      startTime = null;
      return duration;
    },
  };
}

// =============================================================================
// REPORTING
// =============================================================================

interface PerformanceReport {
  uptime: string;
  apiCalls: {
    total: number;
    cached: number;
    uncached: number;
    cacheHitRate: string;
    avgDuration: string;
    byEndpoint: Record<string, { count: number; avgDuration: string }>;
  };
  cache: {
    hits: number;
    misses: number;
    hitRate: string;
  };
  renders: {
    total: number;
    byComponent: Record<string, number>;
  };
}

/**
 * Get a performance report
 */
export function getPerformanceReport(): PerformanceReport {
  const uptime = Date.now() - metrics.startTime;
  const uptimeMinutes = Math.floor(uptime / 60000);
  const uptimeSeconds = Math.floor((uptime % 60000) / 1000);

  // API call stats
  const cachedCalls = metrics.apiCalls.filter((c) => c.cached).length;
  const uncachedCalls = metrics.apiCalls.filter((c) => !c.cached).length;
  const totalCalls = metrics.apiCalls.length;
  const avgDuration =
    totalCalls > 0
      ? metrics.apiCalls.reduce((sum, c) => sum + c.duration, 0) / totalCalls
      : 0;

  // Group by endpoint
  const byEndpoint: Record<string, { count: number; totalDuration: number }> =
    {};
  for (const call of metrics.apiCalls) {
    const existing = byEndpoint[call.endpoint];
    if (!existing) {
      byEndpoint[call.endpoint] = { count: 1, totalDuration: call.duration };
    } else {
      existing.count++;
      existing.totalDuration += call.duration;
    }
  }

  // Render stats by component
  const byComponent: Record<string, number> = {};
  for (const render of metrics.renders) {
    byComponent[render.component] = (byComponent[render.component] || 0) + 1;
  }

  // Cache stats
  const totalCacheOps = metrics.cacheHits + metrics.cacheMisses;
  const cacheHitRate =
    totalCacheOps > 0 ? (metrics.cacheHits / totalCacheOps) * 100 : 0;

  return {
    uptime: `${uptimeMinutes}m ${uptimeSeconds}s`,
    apiCalls: {
      total: totalCalls,
      cached: cachedCalls,
      uncached: uncachedCalls,
      cacheHitRate:
        totalCalls > 0
          ? `${((cachedCalls / totalCalls) * 100).toFixed(1)}%`
          : "N/A",
      avgDuration: `${avgDuration.toFixed(1)}ms`,
      byEndpoint: Object.fromEntries(
        Object.entries(byEndpoint).map(([endpoint, data]) => [
          endpoint,
          {
            count: data.count,
            avgDuration: `${(data.totalDuration / data.count).toFixed(1)}ms`,
          },
        ]),
      ),
    },
    cache: {
      hits: metrics.cacheHits,
      misses: metrics.cacheMisses,
      hitRate: `${cacheHitRate.toFixed(1)}%`,
    },
    renders: {
      total: metrics.renders.length,
      byComponent,
    },
  };
}

/**
 * Log performance report to console
 */
export function logPerformanceReport(): void {
  if (!IS_DEV) return;

  const report = getPerformanceReport();
  console.group("[Perf] Performance Report");
  console.log("Uptime:", report.uptime);
  console.log("API Calls:", report.apiCalls);
  console.log("Cache:", report.cache);
  console.log("Renders:", report.renders);
  console.groupEnd();
}

/**
 * Reset all metrics
 */
export function resetPerformanceMetrics(): void {
  metrics.apiCalls = [];
  metrics.renders = [];
  metrics.cacheHits = 0;
  metrics.cacheMisses = 0;
  metrics.startTime = Date.now();

  if (IS_DEV) {
    console.log("[Perf] Metrics reset");
  }
}

// =============================================================================
// GLOBAL ACCESS (for console debugging)
// =============================================================================

if (typeof window !== "undefined" && IS_DEV) {
  (window as unknown as Record<string, unknown>).__PERF__ = {
    getReport: getPerformanceReport,
    logReport: logPerformanceReport,
    reset: resetPerformanceMetrics,
    metrics,
  };
  console.log(
    "[Perf] Performance tools available at window.__PERF__ (getReport, logReport, reset)",
  );
}
