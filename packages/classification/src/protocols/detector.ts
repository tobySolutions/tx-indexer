import type { ProtocolInfo } from "@domain/actors/counterparty.types";

const KNOWN_PROGRAMS: Record<string, ProtocolInfo> = {
  "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4": {
    id: "jupiter",
    name: "Jupiter",
  },
  "JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB": {
    id: "jupiter-v4",
    name: "Jupiter V4",
  },
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA": {
    id: "spl-token",
    name: "Token Program",
  },
  "11111111111111111111111111111111": {
    id: "system",
    name: "System Program",
  },
  "ComputeBudget111111111111111111111111111111": {
    id: "compute-budget",
    name: "Compute Budget",
  },
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL": {
    id: "associated-token",
    name: "Associated Token Program",
  },
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s": {
    id: "metaplex",
    name: "Metaplex",
  },
  "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc": {
    id: "orca-whirlpool",
    name: "Orca Whirlpool",
  },
  "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8": {
    id: "raydium",
    name: "Raydium",
  },
  "Stake11111111111111111111111111111111111111": {
    id: "stake",
    name: "Stake Program",
  },
};

/**
 * Detects the primary protocol used in a transaction based on program IDs.
 * 
 * @param programIds - Array of program IDs from the transaction
 * @returns ProtocolInfo if a known protocol is detected, null otherwise
 */
export function detectProtocol(programIds: string[]): ProtocolInfo | null {
  for (const programId of programIds) {
    const protocol = KNOWN_PROGRAMS[programId];
    if (protocol) {
      return protocol;
    }
  }

  return null;
}

