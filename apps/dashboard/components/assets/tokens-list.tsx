"use client";

import { useEffect, useState, useMemo } from "react";
import type { EnrichedWalletBalance } from "@/app/actions/token-metadata";
import { getTokenPriceData, type TokenPriceData } from "@/app/actions/assets";
import { AssetListWithHover } from "./asset-list-hover";
import { SOL_MINT } from "@/lib/constants";
import { Coins } from "lucide-react";

interface TokensListProps {
  balance: EnrichedWalletBalance;
  walletAddress: string;
}

export function TokensList({ balance, walletAddress }: TokensListProps) {
  const [priceData, setPriceData] = useState<Map<string, TokenPriceData>>(
    new Map(),
  );
  const [isLoading, setIsLoading] = useState(true);

  // Create a synthetic SOL token entry with full metadata
  const solToken = useMemo(
    () => ({
      mint: SOL_MINT,
      amount: {
        raw: balance.sol.lamports.toString(),
        ui: balance.sol.ui,
      },
      decimals: 9,
      symbol: "SOL",
      name: "Solana",
      logoURI:
        "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
      metadataSource: "static" as const,
    }),
    [balance.sol],
  );

  // Combine SOL + tokens (filtering out any duplicate SOL from tokens list)
  const allTokens = useMemo(() => {
    const filteredTokens = balance.tokens.filter((t) => t.mint !== SOL_MINT);
    return [solToken, ...filteredTokens];
  }, [solToken, balance.tokens]);

  // Fetch price data for all tokens
  useEffect(() => {
    async function fetchPrices() {
      setIsLoading(true);
      try {
        const mints = allTokens.map((t) => t.mint);
        const prices = await getTokenPriceData(mints, "24h");
        setPriceData(prices);
      } catch (error) {
        console.error("Failed to fetch token prices:", error);
      } finally {
        setIsLoading(false);
      }
    }

    if (allTokens.length > 0) {
      fetchPrices();
    }
  }, [allTokens]);

  const sortedTokens = useMemo(() => {
    return allTokens.toSorted((a, b) => {
      const priceA = priceData.get(a.mint)?.price ?? 0;
      const priceB = priceData.get(b.mint)?.price ?? 0;
      const valueA = a.amount.ui * priceA;
      const valueB = b.amount.ui * priceB;

      if (valueB !== valueA) {
        return valueB - valueA;
      }

      return a.symbol.localeCompare(b.symbol);
    });
  }, [allTokens, priceData]);

  if (allTokens.length === 0) {
    return (
      <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg bg-white dark:bg-neutral-900 p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-800 mx-auto mb-4 flex items-center justify-center">
          <Coins
            className="h-6 w-6 text-neutral-400 dark:text-neutral-500"
            aria-hidden="true"
          />
        </div>
        <p className="text-neutral-600 dark:text-neutral-400">
          no tokens found
        </p>
      </div>
    );
  }

  return (
    <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg bg-white dark:bg-neutral-900 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-neutral-100 dark:border-neutral-800">
        <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
          <span>token</span>
          <div className="flex items-center gap-4">
            <span className="hidden sm:block w-24 text-center">24h</span>
            <span className="w-24 text-right">value</span>
            <span className="w-4" /> {/* Chevron spacer */}
          </div>
        </div>
      </div>

      {/* Token Rows - max 10 */}
      {isLoading ? (
        <div>
          {Array.from({ length: Math.min(allTokens.length, 5) }).map((_, i) => (
            <div key={i}>{tokenRowSkeleton}</div>
          ))}
        </div>
      ) : (
        <AssetListWithHover
          tokens={sortedTokens.slice(0, 5)}
          priceData={priceData}
          walletAddress={walletAddress}
        />
      )}

      {/* Show count if more than 5 */}
      {!isLoading && sortedTokens.length > 5 && (
        <div className="px-4 py-3 border-t border-neutral-100 dark:border-neutral-800 text-center">
          <span className="text-xs text-neutral-400 dark:text-neutral-500">
            +{sortedTokens.length - 5} more tokens
          </span>
        </div>
      )}
    </div>
  );
}

const tokenRowSkeleton = (
  <div className="p-4 animate-pulse">
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-700" />
        <div className="space-y-1">
          <div className="w-12 h-4 rounded bg-neutral-200 dark:bg-neutral-700" />
          <div className="w-20 h-3 rounded bg-neutral-100 dark:bg-neutral-800" />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="hidden sm:flex items-center gap-2 w-24">
          <div className="w-12 h-5 rounded bg-neutral-100 dark:bg-neutral-800" />
          <div className="w-10 h-4 rounded bg-neutral-100 dark:bg-neutral-800" />
        </div>
        <div className="w-24 h-4 rounded bg-neutral-200 dark:bg-neutral-700" />
        <div className="w-4 h-4 rounded bg-neutral-100 dark:bg-neutral-800" />
      </div>
    </div>
  </div>
);
