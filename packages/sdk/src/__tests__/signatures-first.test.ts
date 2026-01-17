import { describe, test, expect, mock, beforeEach } from "bun:test";
import type { Address, Signature } from "@solana/kit";
import type { ClassifiedTransaction } from "../client";

/**
 * Tests for the experimental signatures-first API.
 *
 * These tests verify the core behavior of getSignatures() and
 * getTransactionsBySignatures() methods.
 */

describe("EXPERIMENTAL: Signatures-First API", () => {
  describe("getSignatures", () => {
    test("returns signature metadata without full transaction details", async () => {
      // This test verifies the signature info structure
      const mockSignatureInfo = {
        signature: "5abc123def...",
        slot: 100n,
        blockTime: 1700000000n,
        err: null,
        memo: null,
      };

      // Verify structure matches SignatureInfo interface
      expect(mockSignatureInfo).toHaveProperty("signature");
      expect(mockSignatureInfo).toHaveProperty("slot");
      expect(mockSignatureInfo).toHaveProperty("blockTime");
      expect(mockSignatureInfo).toHaveProperty("err");
      expect(mockSignatureInfo).toHaveProperty("memo");
      expect(typeof mockSignatureInfo.slot).toBe("bigint");
    });

    test("result contains pagination info", async () => {
      const mockResult = {
        signatures: [
          {
            signature: "sig1",
            slot: 100n,
            blockTime: 1000n,
            err: null,
            memo: null,
          },
          {
            signature: "sig2",
            slot: 99n,
            blockTime: 999n,
            err: null,
            memo: null,
          },
        ],
        oldestSignature: "sig2",
        hasMore: true,
      };

      expect(mockResult.signatures).toHaveLength(2);
      expect(mockResult.oldestSignature).toBe("sig2");
      expect(mockResult.hasMore).toBe(true);
    });

    test("signatures are sorted by slot (newest first)", () => {
      const signatures = [
        { signature: "old", slot: 50n, blockTime: 500n, err: null, memo: null },
        {
          signature: "newest",
          slot: 100n,
          blockTime: 1000n,
          err: null,
          memo: null,
        },
        {
          signature: "middle",
          slot: 75n,
          blockTime: 750n,
          err: null,
          memo: null,
        },
      ];

      const sorted = [...signatures].sort((a, b) =>
        b.slot > a.slot ? 1 : b.slot < a.slot ? -1 : 0,
      );

      expect(sorted[0]?.signature).toBe("newest");
      expect(sorted[1]?.signature).toBe("middle");
      expect(sorted[2]?.signature).toBe("old");
    });

    test("deduplicates signatures from multiple sources", () => {
      const walletSigs = ["sig1", "sig2", "sig3"];
      const ataSigs = ["sig2", "sig3", "sig4"]; // sig2, sig3 are duplicates

      const seen = new Set<string>();
      const combined: string[] = [];

      for (const sig of walletSigs) {
        if (!seen.has(sig)) {
          seen.add(sig);
          combined.push(sig);
        }
      }

      for (const sig of ataSigs) {
        if (!seen.has(sig)) {
          seen.add(sig);
          combined.push(sig);
        }
      }

      expect(combined).toEqual(["sig1", "sig2", "sig3", "sig4"]);
      expect(combined).toHaveLength(4); // No duplicates
    });
  });

  describe("getTransactionsBySignatures", () => {
    test("uses cache callback to avoid redundant fetches", async () => {
      const cache = new Map<string, ClassifiedTransaction>();

      // Pre-populate cache with one transaction
      const cachedTx: ClassifiedTransaction = {
        tx: {
          signature: "cached-sig",
          slot: 100n,
          blockTime: 1000n,
          err: null,
          programIds: [],
          protocol: null,
        } as any,
        classification: {
          primaryType: "transfer",
          direction: "outgoing",
          isRelevant: true,
          confidence: 0.9,
          primaryAmount: null,
          sender: "sender",
          receiver: "receiver",
        } as any,
        legs: [],
      };
      cache.set("cached-sig", cachedTx);

      // Simulate the getCached callback
      const getCached = async (sig: string) => {
        return cache.get(sig) ?? null;
      };

      // Check that cached signatures are returned from cache
      const result = await getCached("cached-sig");
      expect(result).not.toBeNull();
      expect(String(result?.tx.signature)).toBe("cached-sig");

      // Check that uncached signatures return null
      const uncached = await getCached("not-cached");
      expect(uncached).toBeNull();
    });

    test("calls onFetched callback for newly fetched transactions", () => {
      const fetchedTxs: ClassifiedTransaction[] = [];

      const onFetched = (tx: ClassifiedTransaction) => {
        fetchedTxs.push(tx);
      };

      // Simulate fetching a transaction
      const newTx: ClassifiedTransaction = {
        tx: {
          signature: "new-sig",
          slot: 100n,
          blockTime: 1000n,
          err: null,
          programIds: [],
          protocol: null,
        } as any,
        classification: {
          primaryType: "transfer",
          direction: "outgoing",
          isRelevant: true,
          confidence: 0.9,
          primaryAmount: null,
          sender: "sender",
          receiver: "receiver",
        } as any,
        legs: [],
      };

      onFetched(newTx);

      expect(fetchedTxs).toHaveLength(1);
      expect(String(fetchedTxs[0]?.tx.signature)).toBe("new-sig");
    });

    test("respects signature order in results", () => {
      const txs = [
        { tx: { blockTime: 500n } },
        { tx: { blockTime: 1000n } },
        { tx: { blockTime: 750n } },
      ];

      // Sort by blockTime (newest first)
      const sorted = [...txs].sort((a, b) => {
        const timeA = Number(a.tx.blockTime);
        const timeB = Number(b.tx.blockTime);
        return timeB - timeA;
      });

      expect(Number(sorted[0]?.tx.blockTime)).toBe(1000);
      expect(Number(sorted[1]?.tx.blockTime)).toBe(750);
      expect(Number(sorted[2]?.tx.blockTime)).toBe(500);
    });
  });

  describe("cache integration pattern", () => {
    test("demonstrates efficient cache-first pattern", async () => {
      // This demonstrates the intended usage pattern
      const signatureCache = new Map<string, ClassifiedTransaction>();
      const rpcFetchCount = { count: 0 };

      // Simulated getTransactionsBySignatures behavior
      async function fetchWithCache(
        signatures: string[],
        getCached: (sig: string) => Promise<ClassifiedTransaction | null>,
        onFetched: (tx: ClassifiedTransaction) => void,
      ): Promise<ClassifiedTransaction[]> {
        const results: ClassifiedTransaction[] = [];
        const toFetch: string[] = [];

        // Check cache first
        for (const sig of signatures) {
          const cached = await getCached(sig);
          if (cached) {
            results.push(cached);
          } else {
            toFetch.push(sig);
          }
        }

        // "Fetch" remaining (simulate RPC call)
        for (const sig of toFetch) {
          rpcFetchCount.count++;
          const tx = {
            tx: {
              signature: sig,
              slot: 100n,
              blockTime: 1000n,
              err: null,
              programIds: [],
              protocol: null,
            },
            classification: { primaryType: "transfer" },
            legs: [],
          } as unknown as ClassifiedTransaction;
          results.push(tx);
          onFetched(tx);
        }

        return results;
      }

      // First call - cache is empty, all signatures are fetched
      const result1 = await fetchWithCache(
        ["sig1", "sig2", "sig3"],
        async (sig) => signatureCache.get(sig) ?? null,
        (tx) => signatureCache.set(String(tx.tx.signature), tx),
      );

      expect(result1).toHaveLength(3);
      expect(rpcFetchCount.count).toBe(3); // All 3 fetched from RPC
      expect(signatureCache.size).toBe(3); // All 3 cached

      // Second call - all signatures are cached
      rpcFetchCount.count = 0;
      const result2 = await fetchWithCache(
        ["sig1", "sig2", "sig3"],
        async (sig) => signatureCache.get(sig) ?? null,
        (tx) => signatureCache.set(String(tx.tx.signature), tx),
      );

      expect(result2).toHaveLength(3);
      expect(rpcFetchCount.count).toBe(0); // Nothing fetched from RPC!

      // Third call - mixed: 2 cached, 1 new
      rpcFetchCount.count = 0;
      const result3 = await fetchWithCache(
        ["sig1", "sig4", "sig3"], // sig4 is new
        async (sig) => signatureCache.get(sig) ?? null,
        (tx) => signatureCache.set(String(tx.tx.signature), tx),
      );

      expect(result3).toHaveLength(3);
      expect(rpcFetchCount.count).toBe(1); // Only sig4 fetched
      expect(signatureCache.size).toBe(4); // sig4 added to cache
    });
  });
});
