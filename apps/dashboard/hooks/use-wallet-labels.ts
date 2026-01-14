"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { getWalletLabels, type WalletLabel } from "@/app/actions/wallet-labels";
import { useAuth } from "@/lib/auth";

// =============================================================================
// Query Keys
// =============================================================================

export const walletLabelKeys = {
  all: ["wallet-labels"] as const,
  list: () => [...walletLabelKeys.all, "list"] as const,
};

// =============================================================================
// Constants
// =============================================================================

const LABELS_STALE_TIME = 5 * 60 * 1000; // 5 minutes

// =============================================================================
// Hook
// =============================================================================

interface UseWalletLabelsReturn {
  /** Array of all wallet labels */
  labelsList: WalletLabel[];
  /** Map for O(1) lookup by address */
  labels: Map<string, string>;
  /** Loading state */
  isLoading: boolean;
  /** Get label for a specific address */
  getLabel: (address: string) => string | null;
  /** Refresh labels from server */
  refresh: () => Promise<void>;
  /** Invalidate cache (use after saving a new label) */
  invalidate: () => Promise<void>;
}

/**
 * Centralized hook for wallet labels using React Query.
 *
 * Features:
 * - Single source of truth - all components share the same cache
 * - Automatic deduplication - multiple components calling this hook = 1 network request
 * - 5-minute stale time - reduces unnecessary refetches
 * - Auto-refetch on auth change
 *
 * Usage:
 * ```tsx
 * const { labels, getLabel, invalidate } = useWalletLabels();
 *
 * // Lookup a label
 * const label = getLabel("ABC123...");
 *
 * // After saving a new label, invalidate to refetch
 * await upsertWalletLabel(address, label);
 * await invalidate();
 * ```
 */
export function useWalletLabels(): UseWalletLabelsReturn {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: walletLabelKeys.list(),
    queryFn: async () => {
      if (!isAuthenticated) return [];
      return getWalletLabels();
    },
    enabled: isAuthenticated,
    staleTime: LABELS_STALE_TIME,
    // Keep previous data while refetching
    placeholderData: (prev) => prev,
  });

  // Convert array to Map for O(1) lookups
  const labels = useMemo(() => {
    const map = new Map<string, string>();
    if (query.data) {
      for (const label of query.data) {
        map.set(label.address, label.label);
      }
    }
    return map;
  }, [query.data]);

  const getLabel = useCallback(
    (address: string): string | null => {
      return labels.get(address) ?? null;
    },
    [labels],
  );

  const refresh = useCallback(async () => {
    await query.refetch();
  }, [query]);

  const invalidate = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: walletLabelKeys.list(),
    });
  }, [queryClient]);

  return {
    labelsList: query.data ?? [],
    labels,
    isLoading: query.isLoading,
    getLabel,
    refresh,
    invalidate,
  };
}
