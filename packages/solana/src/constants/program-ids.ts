/**
 * Solana Program IDs
 * 
 * Centralized registry of known Solana program addresses.
 * These are public keys that identify on-chain programs.
 */

// ============================================
// Core Solana Programs
// ============================================

export const SYSTEM_PROGRAM_ID = "11111111111111111111111111111111";
export const COMPUTE_BUDGET_PROGRAM_ID = "ComputeBudget111111111111111111111111111111";
export const STAKE_PROGRAM_ID = "Stake11111111111111111111111111111111111111";

// ============================================
// Token Programs
// ============================================

export const TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
export const ASSOCIATED_TOKEN_PROGRAM_ID = "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";

// ============================================
// Memo Programs
// ============================================

export const SPL_MEMO_PROGRAM_ID = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";
export const MEMO_V1_PROGRAM_ID = "Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo";

// ============================================
// DeFi Programs
// ============================================

export const JUPITER_V6_PROGRAM_ID = "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4";
export const JUPITER_V4_PROGRAM_ID = "JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB";
export const RAYDIUM_PROGRAM_ID = "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8";
export const ORCA_WHIRLPOOL_PROGRAM_ID = "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc";

// ============================================
// NFT Programs
// ============================================

export const METAPLEX_PROGRAM_ID = "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s";

// ============================================
// Payment Facilitators
// ============================================

export const PAYAI_FACILITATOR = "2wKupLR9q6wXYppw8Gr2NvWxKBUqm4PPJKkQfoxHDBg4";

// ============================================
// Helper Collections
// ============================================

export const MEMO_PROGRAM_IDS = [
  SPL_MEMO_PROGRAM_ID,
  MEMO_V1_PROGRAM_ID,
] as const;

export const TOKEN_PROGRAM_IDS = [
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
] as const;

export const DEX_PROGRAM_IDS = [
  JUPITER_V6_PROGRAM_ID,
  JUPITER_V4_PROGRAM_ID,
  RAYDIUM_PROGRAM_ID,
  ORCA_WHIRLPOOL_PROGRAM_ID,
] as const;

export const KNOWN_FACILITATORS = [
  PAYAI_FACILITATOR,
] as const;

export function detectFacilitator(accountKeys: string[]): string | null {
  for (const facilitator of KNOWN_FACILITATORS) {
    if (accountKeys.includes(facilitator)) {
      if (facilitator === PAYAI_FACILITATOR) {
        return "payai";
      }
    }
  }
  return null;
}

