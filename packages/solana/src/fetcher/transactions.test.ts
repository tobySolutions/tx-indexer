import { describe, test, expect, mock } from "bun:test";
import type {
  Signature,
  Rpc,
  GetTransactionApi,
  GetSignaturesForAddressApi,
  Address,
} from "@solana/kit";
import {
  fetchTransactionsBatch,
  fetchWalletSignaturesPaged,
  fetchTokenAccountSignaturesThrottled,
} from "./transactions";

function createMockSignature(id: number): Signature {
  return `sig_${id}${"x".repeat(80)}`.slice(0, 88) as Signature;
}

function createMockRpc(options: {
  delay?: number;
  failingSignatures?: Set<string>;
  onCall?: () => void;
}): Rpc<GetTransactionApi> {
  const { delay = 0, failingSignatures = new Set(), onCall } = options;

  return {
    getTransaction: mock((signature: Signature) => ({
      send: mock(async () => {
        onCall?.();

        if (delay > 0) {
          await new Promise((resolve) => setTimeout(resolve, delay));
        }

        if (failingSignatures.has(signature.toString())) {
          return null;
        }

        return {
          slot: 123456789n,
          blockTime: 1700000000n,
          meta: {
            fee: 5000n,
            err: null,
            preTokenBalances: [],
            postTokenBalances: [],
            preBalances: [1000000000n],
            postBalances: [999995000n],
          },
          transaction: {
            message: {
              accountKeys: [{ toString: () => "account1" }],
              instructions: [],
            },
          },
        };
      }),
    })),
  } as unknown as Rpc<GetTransactionApi>;
}

describe("fetchTransactionsBatch", () => {
  test("returns empty array for empty signatures", async () => {
    const rpc = createMockRpc({});
    const result = await fetchTransactionsBatch(rpc, []);

    expect(result).toEqual([]);
  });

  test("fetches all transactions successfully", async () => {
    const rpc = createMockRpc({});
    const signatures = [
      createMockSignature(1),
      createMockSignature(2),
      createMockSignature(3),
    ];

    const result = await fetchTransactionsBatch(rpc, signatures);

    expect(result).toHaveLength(3);
    expect(result.every((tx) => tx !== null)).toBe(true);
  });

  test("filters out null transactions", async () => {
    const signatures = [
      createMockSignature(1),
      createMockSignature(2),
      createMockSignature(3),
    ];
    const rpc = createMockRpc({
      failingSignatures: new Set([signatures[1]!.toString()]),
    });

    const result = await fetchTransactionsBatch(rpc, signatures);

    expect(result).toHaveLength(2);
  });

  test("respects default concurrency limit of 5", async () => {
    let currentConcurrent = 0;
    let maxConcurrent = 0;

    const rpc = createMockRpc({
      delay: 50,
      onCall: () => {
        currentConcurrent++;
        maxConcurrent = Math.max(maxConcurrent, currentConcurrent);
        setTimeout(() => currentConcurrent--, 50);
      },
    });

    const signatures = Array.from({ length: 25 }, (_, i) =>
      createMockSignature(i),
    );

    await fetchTransactionsBatch(rpc, signatures);

    expect(maxConcurrent).toBeLessThanOrEqual(5);
    expect(maxConcurrent).toBeGreaterThan(1);
  });

  test("respects custom concurrency limit", async () => {
    let currentConcurrent = 0;
    let maxConcurrent = 0;

    const rpc = createMockRpc({
      delay: 50,
      onCall: () => {
        currentConcurrent++;
        maxConcurrent = Math.max(maxConcurrent, currentConcurrent);
        setTimeout(() => currentConcurrent--, 50);
      },
    });

    const signatures = Array.from({ length: 20 }, (_, i) =>
      createMockSignature(i),
    );

    await fetchTransactionsBatch(rpc, signatures, { concurrency: 3 });

    expect(maxConcurrent).toBeLessThanOrEqual(3);
    expect(maxConcurrent).toBeGreaterThan(1);
  });

  test("fetches all transactions despite concurrency limit", async () => {
    const rpc = createMockRpc({ delay: 10 });
    const signatures = Array.from({ length: 50 }, (_, i) =>
      createMockSignature(i),
    );

    const result = await fetchTransactionsBatch(rpc, signatures, {
      concurrency: 5,
    });

    expect(result).toHaveLength(50);
  });

  test("uses confirmed commitment by default", async () => {
    let capturedCommitment: string | undefined;

    const rpc = {
      getTransaction: mock((signature: Signature, options: any) => ({
        send: mock(async () => {
          capturedCommitment = options?.commitment;
          return {
            slot: 123456789n,
            blockTime: 1700000000n,
            meta: {
              fee: 5000n,
              err: null,
              preTokenBalances: [],
              postTokenBalances: [],
              preBalances: [1000000000n],
              postBalances: [999995000n],
            },
            transaction: {
              message: {
                accountKeys: [{ toString: () => "account1" }],
                instructions: [],
              },
            },
          };
        }),
      })),
    } as unknown as Rpc<GetTransactionApi>;

    await fetchTransactionsBatch(rpc, [createMockSignature(1)]);

    expect(capturedCommitment).toBe("confirmed");
  });

  test("uses custom commitment when provided", async () => {
    let capturedCommitment: string | undefined;

    const rpc = {
      getTransaction: mock((signature: Signature, options: any) => ({
        send: mock(async () => {
          capturedCommitment = options?.commitment;
          return {
            slot: 123456789n,
            blockTime: 1700000000n,
            meta: {
              fee: 5000n,
              err: null,
              preTokenBalances: [],
              postTokenBalances: [],
              preBalances: [1000000000n],
              postBalances: [999995000n],
            },
            transaction: {
              message: {
                accountKeys: [{ toString: () => "account1" }],
                instructions: [],
              },
            },
          };
        }),
      })),
    } as unknown as Rpc<GetTransactionApi>;

    await fetchTransactionsBatch(rpc, [createMockSignature(1)], {
      commitment: "finalized",
    });

    expect(capturedCommitment).toBe("finalized");
  });

  test("continues fetching when one transaction throws an error", async () => {
    const signatures = [
      createMockSignature(1),
      createMockSignature(2),
      createMockSignature(3),
    ];

    const rpc = {
      getTransaction: mock((signature: Signature) => ({
        send: mock(async () => {
          if (signature.toString() === signatures[1]!.toString()) {
            throw new Error("RPC error");
          }
          return {
            slot: 123456789n,
            blockTime: 1700000000n,
            meta: {
              fee: 5000n,
              err: null,
              preTokenBalances: [],
              postTokenBalances: [],
              preBalances: [1000000000n],
              postBalances: [999995000n],
            },
            transaction: {
              message: {
                accountKeys: [{ toString: () => "account1" }],
                instructions: [],
              },
            },
          };
        }),
      })),
    } as unknown as Rpc<GetTransactionApi>;

    const result = await fetchTransactionsBatch(rpc, signatures);

    expect(result).toHaveLength(2);
  });

  test("calls onFetchError callback when transaction fetch fails", async () => {
    const signatures = [
      createMockSignature(1),
      createMockSignature(2),
      createMockSignature(3),
    ];

    const errors: { signature: Signature; error: Error }[] = [];

    const rpc = {
      getTransaction: mock((signature: Signature) => ({
        send: mock(async () => {
          if (signature.toString() === signatures[1]!.toString()) {
            throw new Error("RPC timeout");
          }
          return {
            slot: 123456789n,
            blockTime: 1700000000n,
            meta: {
              fee: 5000n,
              err: null,
              preTokenBalances: [],
              postTokenBalances: [],
              preBalances: [1000000000n],
              postBalances: [999995000n],
            },
            transaction: {
              message: {
                accountKeys: [{ toString: () => "account1" }],
                instructions: [],
              },
            },
          };
        }),
      })),
    } as unknown as Rpc<GetTransactionApi>;

    const result = await fetchTransactionsBatch(rpc, signatures, {
      onFetchError: (sig, err) => errors.push({ signature: sig, error: err }),
    });

    expect(result).toHaveLength(2);
    expect(errors).toHaveLength(1);
    expect(errors[0]!.signature.toString()).toBe(signatures[1]!.toString());
    expect(errors[0]!.error.message).toBe("RPC timeout");
  });

  test("does not call onFetchError for null results (not found)", async () => {
    const signatures = [createMockSignature(1), createMockSignature(2)];

    const errors: { signature: Signature; error: Error }[] = [];

    const rpc = createMockRpc({
      failingSignatures: new Set([signatures[1]!.toString()]),
    });

    const result = await fetchTransactionsBatch(rpc, signatures, {
      onFetchError: (sig, err) => errors.push({ signature: sig, error: err }),
    });

    expect(result).toHaveLength(1);
    expect(errors).toHaveLength(0);
  });
});

describe("fetchWalletSignaturesPaged", () => {
  test("fetches signatures with retry on 429", async () => {
    let attempts = 0;
    const rpc = {
      getSignaturesForAddress: mock(() => ({
        send: mock(async () => {
          attempts++;
          if (attempts < 2) {
            throw new Error("429 Too Many Requests");
          }
          return [
            {
              signature: "sig1",
              slot: 100n,
              blockTime: 1000n,
              err: null,
              memo: null,
            },
            {
              signature: "sig2",
              slot: 101n,
              blockTime: 1001n,
              err: null,
              memo: null,
            },
          ];
        }),
      })),
    } as unknown as Rpc<GetSignaturesForAddressApi>;

    const result = await fetchWalletSignaturesPaged(
      rpc,
      "wallet123" as Address,
      { retry: { baseDelayMs: 10 } },
    );

    expect(result).toHaveLength(2);
    expect(attempts).toBe(2);
  });

  test("respects pageSize option", async () => {
    let capturedLimit: number | undefined;
    const rpc = {
      getSignaturesForAddress: mock((_addr: Address, options: any) => ({
        send: mock(async () => {
          capturedLimit = options?.limit;
          return [];
        }),
      })),
    } as unknown as Rpc<GetSignaturesForAddressApi>;

    await fetchWalletSignaturesPaged(rpc, "wallet123" as Address, {
      pageSize: 50,
    });

    expect(capturedLimit).toBe(50);
  });
});

describe("fetchTokenAccountSignaturesThrottled", () => {
  test("returns empty array for empty token accounts", async () => {
    const rpc = {} as Rpc<GetSignaturesForAddressApi>;
    const result = await fetchTokenAccountSignaturesThrottled(rpc, []);
    expect(result).toEqual([]);
  });

  test("deduplicates signatures across ATAs", async () => {
    const rpc = {
      getSignaturesForAddress: mock((addr: Address) => ({
        send: mock(async () => [
          {
            signature: "shared_sig",
            slot: 100n,
            blockTime: 1000n,
            err: null,
            memo: null,
          },
          {
            signature: `unique_${addr}`,
            slot: 101n,
            blockTime: 1001n,
            err: null,
            memo: null,
          },
        ]),
      })),
    } as unknown as Rpc<GetSignaturesForAddressApi>;

    const result = await fetchTokenAccountSignaturesThrottled(rpc, [
      "ata1" as Address,
      "ata2" as Address,
    ]);

    const signatures = result.map((r) => r.signature as string);
    expect(signatures).toContain("shared_sig");
    expect(signatures.filter((s) => s === "shared_sig")).toHaveLength(1);
  });

  test("respects concurrency limit", async () => {
    let currentConcurrent = 0;
    let maxConcurrent = 0;

    const rpc = {
      getSignaturesForAddress: mock(() => ({
        send: mock(async () => {
          currentConcurrent++;
          maxConcurrent = Math.max(maxConcurrent, currentConcurrent);
          await new Promise((resolve) => setTimeout(resolve, 50));
          currentConcurrent--;
          return [];
        }),
      })),
    } as unknown as Rpc<GetSignaturesForAddressApi>;

    const atas = Array.from({ length: 10 }, (_, i) => `ata${i}` as Address);
    await fetchTokenAccountSignaturesThrottled(rpc, atas, { concurrency: 2 });

    expect(maxConcurrent).toBeLessThanOrEqual(2);
  });

  test("calls onError for failed ATA fetches after retries exhausted", async () => {
    const errors: { ata: Address; error: Error }[] = [];

    const rpc = {
      getSignaturesForAddress: mock((addr: Address) => ({
        send: mock(async () => {
          if (addr === "failing_ata") {
            throw new Error("Network error");
          }
          return [
            {
              signature: "sig1",
              slot: 100n,
              blockTime: 1000n,
              err: null,
              memo: null,
            },
          ];
        }),
      })),
    } as unknown as Rpc<GetSignaturesForAddressApi>;

    const result = await fetchTokenAccountSignaturesThrottled(
      rpc,
      ["good_ata" as Address, "failing_ata" as Address],
      {
        onError: (ata, err) => errors.push({ ata, error: err }),
        retry: { maxAttempts: 1 },
      },
    );

    expect(result).toHaveLength(1);
    expect(errors).toHaveLength(1);
    expect(errors[0]!.ata as string).toBe("failing_ata");
  });

  test("sorts results by slot descending", async () => {
    const rpc = {
      getSignaturesForAddress: mock((addr: Address) => ({
        send: mock(async () => {
          if (addr === "ata1") {
            return [
              {
                signature: "old_sig",
                slot: 50n,
                blockTime: 500n,
                err: null,
                memo: null,
              },
            ];
          }
          return [
            {
              signature: "new_sig",
              slot: 200n,
              blockTime: 2000n,
              err: null,
              memo: null,
            },
          ];
        }),
      })),
    } as unknown as Rpc<GetSignaturesForAddressApi>;

    const result = await fetchTokenAccountSignaturesThrottled(rpc, [
      "ata1" as Address,
      "ata2" as Address,
    ]);

    expect(result[0]!.signature as string).toBe("new_sig");
    expect(result[1]!.signature as string).toBe("old_sig");
  });
});
