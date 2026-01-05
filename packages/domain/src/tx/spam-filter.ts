import type { TransactionClassification } from "./classification.types";
import type { RawTransaction, TxLeg } from "./tx.types";

export interface SpamFilterConfig {
  minSolAmount?: number;
  minTokenAmountUsd?: number;
  minConfidence?: number;
  allowFailed?: boolean;
}

const DEFAULT_CONFIG: Required<SpamFilterConfig> = {
  minSolAmount: 0.001,
  minTokenAmountUsd: 0.01,
  minConfidence: 0.5,
  allowFailed: false,
};

/**
 * Determines if a transaction should be filtered as spam or dust.
 *
 * A transaction is considered spam if it:
 * - Failed (and allowFailed is false)
 * - Has low classification confidence
 * - Is not relevant to the wallet
 * - Involves dust amounts below configured thresholds
 * - The wallet only received dust amounts (spam airdrops)
 *
 * @param tx - Raw transaction data
 * @param classification - Transaction classification result
 * @param config - Optional spam filter configuration (uses defaults if omitted)
 * @param legs - Optional legs to check wallet involvement
 * @param walletAddress - Optional wallet address to check involvement
 * @returns True if the transaction should be filtered as spam
 */
export function isSpamTransaction(
  tx: RawTransaction,
  classification: TransactionClassification,
  config: SpamFilterConfig = {},
  legs?: TxLeg[],
  walletAddress?: string,
): boolean {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  if (!cfg.allowFailed && tx.err) {
    return true;
  }

  if (classification.confidence < cfg.minConfidence) {
    return true;
  }

  if (!classification.isRelevant) {
    return true;
  }

  if (isDustTransaction(classification, cfg)) {
    return true;
  }

  // Check if wallet only received dust (spam airdrop detection)
  if (legs && walletAddress) {
    if (isWalletDustOnly(legs, walletAddress, cfg)) {
      return true;
    }
  }

  return false;
}

function isDustTransaction(
  classification: TransactionClassification,
  config: Required<SpamFilterConfig>,
): boolean {
  const { primaryAmount } = classification;

  if (!primaryAmount) {
    return false;
  }

  const { token, amountUi } = primaryAmount;

  if (token.symbol === "SOL") {
    return Math.abs(amountUi) < config.minSolAmount;
  }

  if (token.symbol === "USDC") {
    return Math.abs(amountUi) < config.minTokenAmountUsd;
  }

  return Math.abs(amountUi) < config.minTokenAmountUsd;
}

/**
 * Checks if the wallet only received dust amounts in this transaction.
 * This detects spam airdrops where someone sends tiny amounts to many wallets.
 */
function isWalletDustOnly(
  legs: TxLeg[],
  walletAddress: string,
  config: Required<SpamFilterConfig>,
): boolean {
  const walletAccountId = `external:${walletAddress}`;

  // Find all legs involving our wallet
  const walletLegs = legs.filter((leg) => leg.accountId === walletAccountId);

  if (walletLegs.length === 0) {
    return false; // Not involved at all - shouldn't happen but be safe
  }

  // Check if wallet sent anything meaningful (then it's not a dust airdrop)
  const sentLegs = walletLegs.filter(
    (leg) => leg.side === "debit" && leg.role === "sent",
  );
  for (const leg of sentLegs) {
    if (!isDustAmount(leg.amount.token.symbol, leg.amount.amountUi, config)) {
      return false; // Wallet sent meaningful amount - not spam
    }
  }

  // Check if wallet received anything meaningful
  const receivedLegs = walletLegs.filter(
    (leg) => leg.side === "credit" && leg.role === "received",
  );
  for (const leg of receivedLegs) {
    if (!isDustAmount(leg.amount.token.symbol, leg.amount.amountUi, config)) {
      return false; // Wallet received meaningful amount - not spam
    }
  }

  // All amounts involving wallet are dust
  return receivedLegs.length > 0; // Only flag as spam if we received dust
}

function isDustAmount(
  symbol: string,
  amountUi: number,
  config: Required<SpamFilterConfig>,
): boolean {
  const absAmount = Math.abs(amountUi);

  if (symbol === "SOL" || symbol === "WSOL") {
    return absAmount < config.minSolAmount;
  }

  return absAmount < config.minTokenAmountUsd;
}

/**
 * Filters an array of transactions to remove spam and dust transactions.
 *
 * Applies spam detection criteria to each transaction while preserving
 * additional properties in the returned array items.
 *
 * @param transactions - Array of transaction objects with tx, classification, and legs
 * @param config - Optional spam filter configuration
 * @param walletAddress - Optional wallet address to check for dust airdrops
 * @returns Filtered array with spam transactions removed
 */
export function filterSpamTransactions<
  T extends {
    tx: RawTransaction;
    classification: TransactionClassification;
    legs?: TxLeg[];
  },
>(transactions: T[], config?: SpamFilterConfig, walletAddress?: string): T[] {
  return transactions.filter(
    ({ tx, classification, legs }) =>
      !isSpamTransaction(tx, classification, config, legs, walletAddress),
  );
}
