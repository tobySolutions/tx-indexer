"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { getDashboardData, type DashboardData } from "@/app/actions/dashboard";

// Query key factory for dashboard data
export const dashboardKeys = {
  all: ["dashboard"] as const,
  data: (address: string) => [...dashboardKeys.all, "data", address] as const,
};

// USDC mint address
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

interface UseDashboardDataOptions {
  limit?: number;
  /** Enable faster polling (e.g., after a transaction) */
  fastPolling?: boolean;
}

/**
 * Hook to fetch and cache dashboard data (balance + transactions)
 * Uses React Query for automatic caching, refetching, and instant updates
 */
export function useDashboardData(
  address: string | null,
  options: UseDashboardDataOptions = {},
) {
  const { limit = 10, fastPolling = false } = options;
  const queryClient = useQueryClient();

  const query = useQuery<DashboardData | null>({
    queryKey: address ? dashboardKeys.data(address) : ["dashboard", "empty"],
    queryFn: async () => {
      if (!address) return null;
      return getDashboardData(address, limit);
    },
    enabled: !!address,
    // Faster polling when fastPolling is enabled (e.g., right after a transaction)
    refetchInterval: fastPolling ? 10 * 1000 : 60 * 1000,
    // Keep data fresh for shorter time when fast polling
    staleTime: fastPolling ? 5 * 1000 : 30 * 1000,
    // Refetch on window focus for instant updates
    refetchOnWindowFocus: true,
  });

  // Function to manually refetch data (useful after sending a transaction)
  const refetch = useCallback(() => {
    if (address) {
      return queryClient.invalidateQueries({
        queryKey: dashboardKeys.data(address),
      });
    }
  }, [queryClient, address]);

  // Function to invalidate all dashboard queries
  const invalidateAll = useCallback(() => {
    return queryClient.invalidateQueries({
      queryKey: dashboardKeys.all,
    });
  }, [queryClient]);

  // Extract USDC balance from the wallet balance
  const usdcBalance = useMemo(() => {
    if (!query.data?.balance) return null;
    const usdcToken = query.data.balance.tokens.find(
      (token) => token.mint === USDC_MINT,
    );
    return usdcToken?.amount.ui ?? 0;
  }, [query.data?.balance]);

  return {
    portfolio: query.data?.portfolio ?? null,
    transactions: query.data?.transactions ?? [],
    balance: query.data?.balance ?? null,
    usdcBalance,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isRefetching: query.isRefetching,
    error: query.error,
    refetch,
    invalidateAll,
  };
}
