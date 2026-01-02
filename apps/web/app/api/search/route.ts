import { NextRequest, NextResponse } from "next/server";
import { indexer } from "@/lib/indexer";
import { signature } from "@solana/kit";

// Search result types
export interface TransactionSearchResult {
  type: "transaction";
  signature: string;
  primaryType: string;
  primaryAmount?: { amountUi: number; symbol: string };
  secondaryAmount?: { amountUi: number; symbol: string };
  protocol?: string;
  blockTime: number | null;
}

export interface AccountSearchResult {
  type: "account";
  address: string;
}

export type SearchResult = TransactionSearchResult | AccountSearchResult;

export interface SearchResponse {
  results: SearchResult[];
  query: string;
  inputType: "signature" | "account" | "unknown";
}

/**
 * Detects if the input is a transaction signature or account address
 */
function detectInputType(input: string): "signature" | "account" | "unknown" {
  const trimmed = input.trim();

  // Base58 character set (no 0, O, I, l)
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;

  if (!base58Regex.test(trimmed)) {
    return "unknown";
  }

  // Signatures are 87-88 characters
  if (trimmed.length >= 87 && trimmed.length <= 88) {
    return "signature";
  }

  // Account addresses are 32-44 characters
  if (trimmed.length >= 32 && trimmed.length <= 44) {
    return "account";
  }

  return "unknown";
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q");

  if (!query || query.trim().length < 32) {
    return NextResponse.json<SearchResponse>({
      results: [],
      query: query || "",
      inputType: "unknown",
    });
  }

  const trimmedQuery = query.trim();
  const inputType = detectInputType(trimmedQuery);

  const results: SearchResult[] = [];

  try {
    if (inputType === "signature") {
      // Try to fetch the transaction
      const tx = await indexer.getTransaction(signature(trimmedQuery));

      if (tx) {
        const result: TransactionSearchResult = {
          type: "transaction",
          signature: tx.tx.signature,
          primaryType: tx.classification.primaryType,
          blockTime: tx.tx.blockTime ? Number(tx.tx.blockTime) : null,
        };

        if (tx.classification.primaryAmount) {
          result.primaryAmount = {
            amountUi: tx.classification.primaryAmount.amountUi,
            symbol: tx.classification.primaryAmount.token.symbol,
          };
        }

        if (tx.classification.secondaryAmount) {
          result.secondaryAmount = {
            amountUi: tx.classification.secondaryAmount.amountUi,
            symbol: tx.classification.secondaryAmount.token.symbol,
          };
        }

        if (tx.tx.protocol) {
          result.protocol = tx.tx.protocol.name;
        }

        results.push(result);
      }
    } else if (inputType === "account") {
      // For accounts, just validate format and return as result
      // We don't fetch transactions for now - just show it as "coming soon"
      results.push({
        type: "account",
        address: trimmedQuery,
      });
    }

    return NextResponse.json<SearchResponse>({
      results,
      query: trimmedQuery,
      inputType,
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json<SearchResponse>(
      {
        results: [],
        query: trimmedQuery,
        inputType,
      },
      { status: 500 },
    );
  }
}
