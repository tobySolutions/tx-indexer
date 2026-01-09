"use server";

import { getIndexer } from "@/lib/indexer";
import { fetchTokenPrices } from "@/lib/prices";
import type { ClassifiedTransaction } from "tx-indexer";
import type { WalletBalance } from "tx-indexer/advanced";
import { address, signature } from "@solana/kit";
import { dashboardDataSchema } from "@/lib/validations";

// =============================================================================
// RPC OPTIMIZATION CONFIG
// =============================================================================
// These settings reduce RPC calls significantly for rate-limited RPCs (e.g., Helius free tier)
// Set OPTIMIZE_FOR_RATE_LIMITS=true in env to enable aggressive optimization

const OPTIMIZE_FOR_RATE_LIMITS =
  process.env.OPTIMIZE_FOR_RATE_LIMITS === "true";

/**
 * Default SDK options optimized for the current RPC tier.
 *
 * Rate-limited mode (OPTIMIZE_FOR_RATE_LIMITS=true):
 * - overfetchMultiplier: 1 (no overfetch, saves ~50% of RPC calls)
 * - minPageSize: matches limit (no minimum)
 *
 * Standard mode:
 * - overfetchMultiplier: 2 (fetch extra to account for spam filtering)
 * - minPageSize: 20 (ensures good batch sizes)
 *
 * NOTE: includeTokenAccounts is always true because incoming SPL token transfers
 * (like USDC) only appear in the receiver's Associated Token Account (ATA),
 * not their wallet address. Without this, receivers won't see incoming tokens.
 */
const getOptimizedOptions = (limit: number) => ({
  // Rate-limit friendly settings reduce overfetch
  overfetchMultiplier: OPTIMIZE_FOR_RATE_LIMITS ? 1 : 2,
  minPageSize: OPTIMIZE_FOR_RATE_LIMITS ? limit : 20,
  // Required for incoming SPL token transfers - receiver's wallet isn't in
  // accountKeys, only their ATA is, so we must query token accounts
  includeTokenAccounts: true,
  // Retry config for resilience
  retry: {
    maxAttempts: 3,
    baseDelayMs: OPTIMIZE_FOR_RATE_LIMITS ? 1000 : 500,
    maxDelayMs: OPTIMIZE_FOR_RATE_LIMITS ? 10000 : 5000,
  },
});

const STABLECOIN_MINTS = new Set([
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC
  "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", // USDT
  "2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo", // PYUSD
  "2u1tszSeqZ3qBWF3uNGPFc8TzMk2tdiwknnRMWGWjGWH", // USDG
  "A9mUU4qviSctJVPJdBJWkb28deg915LYJKrzQ19ji3FM", // USDC Bridged
  "EjmyN6qEC1Tf1JxiG1ae7UTJhUxSwk1TCCi3Z4dPuFhh", // DAI
]);

const SOL_MINT = "So11111111111111111111111111111111111111112";

export interface PortfolioSummary {
  totalUsd: number;
  stablecoinsUsd: number;
  variableAssetsUsd: number;
  unpricedCount: number;
}

export interface DashboardData {
  balance: WalletBalance;
  portfolio: PortfolioSummary;
  transactions: ClassifiedTransaction[];
}

async function calculatePortfolio(
  balance: WalletBalance,
): Promise<PortfolioSummary> {
  let stablecoinsUsd = 0;
  let variableAssetsUsd = 0;
  let unpricedCount = 0;

  const variableTokenMints: string[] = [SOL_MINT];
  const variableTokenAmounts = new Map<string, number>();
  variableTokenAmounts.set(SOL_MINT, balance.sol.ui);

  for (const token of balance.tokens) {
    if (STABLECOIN_MINTS.has(token.mint)) {
      stablecoinsUsd += token.amount.ui;
    } else {
      variableTokenMints.push(token.mint);
      variableTokenAmounts.set(token.mint, token.amount.ui);
    }
  }

  const prices = await fetchTokenPrices(variableTokenMints);

  variableTokenAmounts.forEach((amount, mint) => {
    const price = prices.get(mint);
    if (price !== undefined) {
      variableAssetsUsd += amount * price;
    } else {
      unpricedCount++;
    }
  });

  return {
    totalUsd: stablecoinsUsd + variableAssetsUsd,
    stablecoinsUsd,
    variableAssetsUsd,
    unpricedCount,
  };
}

/**
 * Fetch new transactions since a known signature (for incremental updates)
 * This dramatically reduces RPC calls on polling - only fetches what's new
 */
export async function getNewTransactions(
  walletAddress: string,
  untilSignature: string,
  limit: number = 10,
): Promise<ClassifiedTransaction[]> {
  const indexer = getIndexer();
  const addr = address(walletAddress);
  const opts = getOptimizedOptions(limit);

  return indexer.getTransactions(addr, {
    limit,
    until: signature(untilSignature),
    ...opts,
  });
}

/**
 * Fetch only balance and portfolio (no transactions)
 * Used for polling when we already have cached transactions
 */
export async function getBalanceAndPortfolio(
  walletAddress: string,
): Promise<{ balance: WalletBalance; portfolio: PortfolioSummary }> {
  const indexer = getIndexer();
  const addr = address(walletAddress);

  const balance = await indexer.getBalance(addr);
  const portfolio = await calculatePortfolio(balance);

  return { balance, portfolio };
}

/**
 * Fetch a page of transactions with cursor-based pagination
 * Used for infinite scroll in the transactions feed
 */
export async function getTransactionsPage(
  walletAddress: string,
  options: {
    limit?: number;
    cursor?: string; // Transaction signature to start after (oldest loaded)
  } = {},
): Promise<{
  transactions: ClassifiedTransaction[];
  nextCursor: string | null;
  hasMore: boolean;
}> {
  const { limit = 20, cursor } = options;

  const indexer = getIndexer();
  const addr = address(walletAddress);
  const opts = getOptimizedOptions(limit + 1);

  const transactions = await indexer.getTransactions(addr, {
    limit: limit + 1,
    before: cursor ? signature(cursor) : undefined,
    ...opts,
  });

  const hasMore = transactions.length > limit;
  const pageTransactions = hasMore
    ? transactions.slice(0, limit)
    : transactions;
  const nextCursor =
    pageTransactions.length > 0
      ? (pageTransactions[pageTransactions.length - 1]?.tx.signature ?? null)
      : null;

  return {
    transactions: pageTransactions,
    nextCursor,
    hasMore,
  };
}

export async function getDashboardData(
  walletAddress: string,
  transactionLimit: number = 10,
): Promise<DashboardData> {
  // Validate inputs with Zod
  const validationResult = dashboardDataSchema.safeParse({
    walletAddress,
    transactionLimit,
  });

  if (!validationResult.success) {
    throw new Error("Invalid input parameters");
  }

  const { walletAddress: validAddress, transactionLimit: validLimit } =
    validationResult.data;

  const indexer = getIndexer();
  const addr = address(validAddress);
  const opts = getOptimizedOptions(validLimit);

  const balance = await indexer.getBalance(addr);
  const transactions = await indexer.getTransactions(addr, {
    limit: validLimit,
    ...opts,
  });

  const portfolio = await calculatePortfolio(balance);

  return { balance, portfolio, transactions };
}
