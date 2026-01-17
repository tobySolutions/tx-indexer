import { describe, test, expect } from "bun:test";
import {
  detectNewATAs,
  hasNewATAForOwner,
  getNewATAsForOwner,
  detectNewATAsBatch,
} from "../ata-detector";
import type { RawTransaction } from "@tx-indexer/core/tx/tx.types";

// Helper to create a mock RawTransaction
function createMockTx(options: {
  signature?: string;
  preTokenBalances?: Array<{
    accountIndex: number;
    mint: string;
    owner?: string;
    programId?: string;
    uiTokenAmount: { amount: string; decimals: number; uiAmountString: string };
  }>;
  postTokenBalances?: Array<{
    accountIndex: number;
    mint: string;
    owner?: string;
    programId?: string;
    uiTokenAmount: { amount: string; decimals: number; uiAmountString: string };
  }>;
  accountKeys?: string[];
}): RawTransaction {
  return {
    signature: options.signature ?? "test-signature",
    slot: 100n,
    blockTime: 1000000n,
    fee: 5000,
    err: null,
    programIds: [],
    protocol: null,
    preTokenBalances: options.preTokenBalances ?? [],
    postTokenBalances: options.postTokenBalances ?? [],
    accountKeys: options.accountKeys ?? [],
    memo: null,
  } as unknown as RawTransaction;
}

describe("detectNewATAs", () => {
  test("detects new ATA when token account appears in post but not pre balances", () => {
    const tx = createMockTx({
      preTokenBalances: [],
      postTokenBalances: [
        {
          accountIndex: 2,
          mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC
          owner: "WalletOwnerAddress123",
          programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
          uiTokenAmount: {
            amount: "1000000",
            decimals: 6,
            uiAmountString: "1.0",
          },
        },
      ],
      accountKeys: ["fee-payer", "sender", "new-ata-address"],
    });

    const newATAs = detectNewATAs(tx);

    expect(newATAs).toHaveLength(1);
    expect(newATAs[0]).toEqual({
      mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      owner: "WalletOwnerAddress123",
      accountIndex: 2,
      tokenAccount: "new-ata-address",
    });
  });

  test("does not detect existing ATAs (account existed before)", () => {
    const tx = createMockTx({
      preTokenBalances: [
        {
          accountIndex: 2,
          mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
          owner: "WalletOwnerAddress123",
          uiTokenAmount: {
            amount: "500000",
            decimals: 6,
            uiAmountString: "0.5",
          },
        },
      ],
      postTokenBalances: [
        {
          accountIndex: 2,
          mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
          owner: "WalletOwnerAddress123",
          uiTokenAmount: {
            amount: "1500000",
            decimals: 6,
            uiAmountString: "1.5",
          },
        },
      ],
    });

    const newATAs = detectNewATAs(tx);

    expect(newATAs).toHaveLength(0);
  });

  test("detects multiple new ATAs in a single transaction", () => {
    const tx = createMockTx({
      preTokenBalances: [],
      postTokenBalances: [
        {
          accountIndex: 1,
          mint: "USDC-mint",
          owner: "WalletA",
          uiTokenAmount: {
            amount: "100",
            decimals: 6,
            uiAmountString: "0.0001",
          },
        },
        {
          accountIndex: 2,
          mint: "BONK-mint",
          owner: "WalletA",
          uiTokenAmount: {
            amount: "1000",
            decimals: 5,
            uiAmountString: "0.01",
          },
        },
        {
          accountIndex: 3,
          mint: "USDC-mint",
          owner: "WalletB",
          uiTokenAmount: {
            amount: "200",
            decimals: 6,
            uiAmountString: "0.0002",
          },
        },
      ],
    });

    const newATAs = detectNewATAs(tx);

    expect(newATAs).toHaveLength(3);
    expect(newATAs.map((a) => a.owner)).toEqual([
      "WalletA",
      "WalletA",
      "WalletB",
    ]);
    expect(newATAs.map((a) => a.mint)).toEqual([
      "USDC-mint",
      "BONK-mint",
      "USDC-mint",
    ]);
  });

  test("ignores token accounts without owner field", () => {
    const tx = createMockTx({
      preTokenBalances: [],
      postTokenBalances: [
        {
          accountIndex: 2,
          mint: "some-mint",
          // No owner field
          uiTokenAmount: {
            amount: "100",
            decimals: 6,
            uiAmountString: "0.0001",
          },
        },
      ],
    });

    const newATAs = detectNewATAs(tx);

    expect(newATAs).toHaveLength(0);
  });

  test("handles empty balances arrays", () => {
    const tx = createMockTx({
      preTokenBalances: [],
      postTokenBalances: [],
    });

    const newATAs = detectNewATAs(tx);

    expect(newATAs).toHaveLength(0);
  });

  test("handles undefined balances", () => {
    const tx = createMockTx({});
    // Explicitly remove the arrays
    delete (tx as any).preTokenBalances;
    delete (tx as any).postTokenBalances;

    const newATAs = detectNewATAs(tx);

    expect(newATAs).toHaveLength(0);
  });
});

describe("hasNewATAForOwner", () => {
  test("returns true when owner has a new ATA", () => {
    const tx = createMockTx({
      preTokenBalances: [],
      postTokenBalances: [
        {
          accountIndex: 1,
          mint: "USDC-mint",
          owner: "TargetWallet",
          uiTokenAmount: {
            amount: "100",
            decimals: 6,
            uiAmountString: "0.0001",
          },
        },
      ],
    });

    expect(hasNewATAForOwner(tx, "TargetWallet")).toBe(true);
    expect(hasNewATAForOwner(tx, "OtherWallet")).toBe(false);
  });

  test("returns false when owner has no new ATAs", () => {
    const tx = createMockTx({
      preTokenBalances: [
        {
          accountIndex: 1,
          mint: "USDC-mint",
          owner: "TargetWallet",
          uiTokenAmount: { amount: "0", decimals: 6, uiAmountString: "0" },
        },
      ],
      postTokenBalances: [
        {
          accountIndex: 1,
          mint: "USDC-mint",
          owner: "TargetWallet",
          uiTokenAmount: {
            amount: "100",
            decimals: 6,
            uiAmountString: "0.0001",
          },
        },
      ],
    });

    expect(hasNewATAForOwner(tx, "TargetWallet")).toBe(false);
  });
});

describe("getNewATAsForOwner", () => {
  test("returns only ATAs for the specified owner", () => {
    const tx = createMockTx({
      preTokenBalances: [],
      postTokenBalances: [
        {
          accountIndex: 1,
          mint: "USDC-mint",
          owner: "WalletA",
          uiTokenAmount: {
            amount: "100",
            decimals: 6,
            uiAmountString: "0.0001",
          },
        },
        {
          accountIndex: 2,
          mint: "BONK-mint",
          owner: "WalletB",
          uiTokenAmount: {
            amount: "100",
            decimals: 5,
            uiAmountString: "0.001",
          },
        },
        {
          accountIndex: 3,
          mint: "SOL-mint",
          owner: "WalletA",
          uiTokenAmount: {
            amount: "100",
            decimals: 9,
            uiAmountString: "0.0000001",
          },
        },
      ],
    });

    const walletAATAs = getNewATAsForOwner(tx, "WalletA");
    const walletBATAs = getNewATAsForOwner(tx, "WalletB");

    expect(walletAATAs).toHaveLength(2);
    expect(walletAATAs.map((a) => a.mint)).toEqual(["USDC-mint", "SOL-mint"]);

    expect(walletBATAs).toHaveLength(1);
    expect(walletBATAs[0]?.mint).toBe("BONK-mint");
  });
});

describe("detectNewATAsBatch", () => {
  test("groups new ATAs by owner across multiple transactions", () => {
    const tx1 = createMockTx({
      signature: "tx1",
      preTokenBalances: [],
      postTokenBalances: [
        {
          accountIndex: 1,
          mint: "USDC-mint",
          owner: "WalletA",
          uiTokenAmount: {
            amount: "100",
            decimals: 6,
            uiAmountString: "0.0001",
          },
        },
      ],
    });

    const tx2 = createMockTx({
      signature: "tx2",
      preTokenBalances: [],
      postTokenBalances: [
        {
          accountIndex: 1,
          mint: "BONK-mint",
          owner: "WalletA",
          uiTokenAmount: {
            amount: "100",
            decimals: 5,
            uiAmountString: "0.001",
          },
        },
        {
          accountIndex: 2,
          mint: "USDC-mint",
          owner: "WalletB",
          uiTokenAmount: {
            amount: "200",
            decimals: 6,
            uiAmountString: "0.0002",
          },
        },
      ],
    });

    const tx3 = createMockTx({
      signature: "tx3",
      // No new ATAs in this transaction
      preTokenBalances: [
        {
          accountIndex: 1,
          mint: "USDC-mint",
          owner: "WalletC",
          uiTokenAmount: { amount: "0", decimals: 6, uiAmountString: "0" },
        },
      ],
      postTokenBalances: [
        {
          accountIndex: 1,
          mint: "USDC-mint",
          owner: "WalletC",
          uiTokenAmount: {
            amount: "100",
            decimals: 6,
            uiAmountString: "0.0001",
          },
        },
      ],
    });

    const result = detectNewATAsBatch([tx1, tx2, tx3]);

    expect(result.size).toBe(2); // WalletA and WalletB

    const walletAATAs = result.get("WalletA");
    expect(walletAATAs).toHaveLength(2);
    expect(walletAATAs?.map((a) => a.mint).sort()).toEqual([
      "BONK-mint",
      "USDC-mint",
    ]);

    const walletBATAs = result.get("WalletB");
    expect(walletBATAs).toHaveLength(1);
    expect(walletBATAs?.[0]?.mint).toBe("USDC-mint");

    // WalletC should not be in the results (no new ATAs)
    expect(result.has("WalletC")).toBe(false);
  });

  test("handles empty transaction array", () => {
    const result = detectNewATAsBatch([]);

    expect(result.size).toBe(0);
  });

  test("handles transactions with no new ATAs", () => {
    const tx = createMockTx({
      preTokenBalances: [
        {
          accountIndex: 1,
          mint: "USDC-mint",
          owner: "WalletA",
          uiTokenAmount: {
            amount: "100",
            decimals: 6,
            uiAmountString: "0.0001",
          },
        },
      ],
      postTokenBalances: [
        {
          accountIndex: 1,
          mint: "USDC-mint",
          owner: "WalletA",
          uiTokenAmount: {
            amount: "200",
            decimals: 6,
            uiAmountString: "0.0002",
          },
        },
      ],
    });

    const result = detectNewATAsBatch([tx]);

    expect(result.size).toBe(0);
  });
});
