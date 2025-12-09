import type { SolanaTransaction } from "@solana/types/transaction.types";
import {
  SPL_MEMO_PROGRAM_ID,
  MEMO_V1_PROGRAM_ID,
} from "@solana/constants/program-ids";
import bs58 from "bs58";

interface TransactionWithLogs extends SolanaTransaction {
  meta?: {
    logMessages?: readonly string[] | null;
  };
}

function decodeMemoData(base64Data: string): string {
  const buffer = Buffer.from(base64Data, "base64");

  const text = buffer.toString("utf-8");
  if (!text.includes("\ufffd") && /^[\x20-\x7E\s]*$/.test(text)) {
    return text;
  }

  if (buffer.length === 32) {
    return bs58.encode(buffer);
  }

  if (buffer.length % 32 === 0 && buffer.length > 0) {
    const addresses: string[] = [];
    for (let i = 0; i < buffer.length; i += 32) {
      const chunk = buffer.subarray(i, i + 32);
      addresses.push(bs58.encode(chunk));
    }
    return addresses.join(", ");
  }

  if (buffer.length >= 16) {
    const uuidBytes = buffer.subarray(0, 16);
    const uuid = [
      uuidBytes.subarray(0, 4).toString("hex"),
      uuidBytes.subarray(4, 6).toString("hex"),
      uuidBytes.subarray(6, 8).toString("hex"),
      uuidBytes.subarray(8, 10).toString("hex"),
      uuidBytes.subarray(10, 16).toString("hex"),
    ].join("-");

    if (buffer.length === 16) {
      return `Product: ${uuid}`;
    }

    const extraData = buffer.subarray(16);
    const extraHex = extraData.toString("hex");
    return `Product: ${uuid} | Meta: ${extraHex}`;
  }

  return bs58.encode(buffer);
}

export function extractMemo(transaction: TransactionWithLogs): string | null {
  if (transaction.meta?.logMessages) {
    const memoLogPattern = /Program log: Memo \(len \d+\): "(.+)"/;
    for (const log of transaction.meta.logMessages) {
      const match = log.match(memoLogPattern);
      if (match?.[1]) {
        return match[1];
      }
    }
  }

  const { message } = transaction;
  const { accountKeys, instructions } = message;

  for (const ix of instructions) {
    const programId = accountKeys[ix.programIdIndex]?.toString();

    if (programId === SPL_MEMO_PROGRAM_ID || programId === MEMO_V1_PROGRAM_ID) {
      if (ix.data) {
        try {
          return decodeMemoData(ix.data);
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
