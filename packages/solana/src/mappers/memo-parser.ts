import type { SolanaTransaction } from "@solana/types/transaction.types";
import { SPL_MEMO_PROGRAM_ID, MEMO_V1_PROGRAM_ID } from "@solana/constants/program-ids";

export function extractMemo(transaction: SolanaTransaction): string | null {
  const { message } = transaction;
  const { accountKeys, instructions } = message;

  for (const ix of instructions) {
    const programId = accountKeys[ix.programIdIndex]?.toString();

    if (
      programId === SPL_MEMO_PROGRAM_ID ||
      programId === MEMO_V1_PROGRAM_ID
    ) {
      if (ix.data) {
        try {
          const decodedData = Buffer.from(ix.data, "base64").toString("utf-8");
          return decodedData;
        } catch (e) {
          console.warn("Failed to decode memo:", e);
        }
      }
    }
  }

  return null;
}

export interface SolanaPayMemo {
  merchant?: string;
  item?: string;
  reference?: string;
  label?: string;
  message?: string;
  raw: string;
}

export function parseSolanaPayMemo(memo: string): SolanaPayMemo {
  try {
    const parsed = JSON.parse(memo);
    return { ...parsed, raw: memo };
  } catch {
    return { raw: memo };
  }
}

export function isSolanaPayTransaction(
  programIds: string[],
  memo: string | null | undefined
): boolean {
  const hasMemoProgram =
    programIds.includes(SPL_MEMO_PROGRAM_ID) ||
    programIds.includes(MEMO_V1_PROGRAM_ID);

  return hasMemoProgram && memo !== null && memo !== undefined;
}

