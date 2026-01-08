import { describe, test, expect } from "bun:test";
import { createIndexer } from "../client";
import { address, signature } from "@solana/kit";

const RPC_URL =
  "https://mainnet.helius-rpc.com/?api-key=c2db5d9a-e490-4976-8edc-c859c5d5aaed";

// Test transaction: 1 USDC -> USDG swap
const TEST_SWAP_SIGNATURE =
  "2ErgysX6RftvcYwKnNVx5MfHypU14UpyXsP59gcjZdn62Vf72FgRzzpQiGxX3FJ3rViwXv3NSyWjYtnkazdZkLV8";

describe("Debug USDC->USDG Swap", () => {
  const indexer = createIndexer({ rpcUrl: RPC_URL });

  test("should fetch and classify the swap transaction", async () => {
    const sig = signature(TEST_SWAP_SIGNATURE);
    const result = await indexer.getTransaction(sig);

    console.log("\n=== Transaction Details ===");
    console.log("Signature:", result?.tx.signature);
    console.log("Block Time:", result?.tx.blockTime);
    console.log("Protocol:", result?.tx.protocol);
    console.log("Account Keys:", result?.tx.accountKeys?.slice(0, 3));

    console.log("\n=== Token Balances ===");
    console.log(
      "Pre Token Balances:",
      JSON.stringify(result?.tx.preTokenBalances, null, 2),
    );
    console.log(
      "Post Token Balances:",
      JSON.stringify(result?.tx.postTokenBalances, null, 2),
    );

    console.log("\n=== Legs ===");
    result?.legs.forEach((leg, i) => {
      console.log(
        `Leg ${i}: ${leg.accountId} | ${leg.side} | ${leg.role} | ${leg.amount.amountUi} ${leg.amount.token.symbol}`,
      );
    });

    console.log("\n=== Classification ===");
    console.log("Type:", result?.classification.primaryType);
    console.log(
      "Primary Amount:",
      result?.classification.primaryAmount?.amountUi,
      result?.classification.primaryAmount?.token.symbol,
    );
    console.log(
      "Secondary Amount:",
      result?.classification.secondaryAmount?.amountUi,
      result?.classification.secondaryAmount?.token.symbol,
    );
    console.log("Confidence:", result?.classification.confidence);
    console.log("Is Relevant:", result?.classification.isRelevant);
    console.log("Sender:", result?.classification.sender);
    console.log("Receiver:", result?.classification.receiver);

    expect(result).not.toBeNull();
    expect(result?.classification.primaryType).toBe("swap");
  }, 30000);

  test("should show swap in wallet transactions", async () => {
    // Get the fee payer from the transaction to use as wallet address
    const sig = signature(TEST_SWAP_SIGNATURE);
    const txResult = await indexer.getTransaction(sig);

    const walletAddress = txResult?.tx.accountKeys?.[0];
    console.log("\n=== Wallet Address ===");
    console.log("Fee Payer:", walletAddress);

    if (!walletAddress) {
      throw new Error("Could not get wallet address from transaction");
    }

    // Fetch recent transactions for this wallet
    const transactions = await indexer.getTransactions(address(walletAddress), {
      limit: 20,
      filterSpam: false, // Disable spam filter to see all
    });

    console.log("\n=== Recent Transactions (no spam filter) ===");
    transactions.forEach((tx, i) => {
      console.log(
        `${i + 1}. ${tx.classification.primaryType} | ${tx.classification.primaryAmount?.amountUi || 0} ${tx.classification.primaryAmount?.token.symbol || "N/A"} | ${tx.tx.signature.slice(0, 20)}...`,
      );
    });

    // Check if our swap is in the list
    const foundSwap = transactions.find(
      (tx) => tx.tx.signature === TEST_SWAP_SIGNATURE,
    );
    console.log("\n=== Swap Found? ===", !!foundSwap);

    if (!foundSwap) {
      console.log("Swap NOT found in transactions!");
    }

    expect(foundSwap).toBeDefined();
  }, 60000);

  test("should show swap with spam filter enabled", async () => {
    const sig = signature(TEST_SWAP_SIGNATURE);
    const txResult = await indexer.getTransaction(sig);

    const walletAddress = txResult?.tx.accountKeys?.[0];
    if (!walletAddress) {
      throw new Error("Could not get wallet address from transaction");
    }

    // Fetch with spam filter enabled (default)
    const transactions = await indexer.getTransactions(address(walletAddress), {
      limit: 20,
      filterSpam: true,
    });

    console.log("\n=== Recent Transactions (with spam filter) ===");
    transactions.forEach((tx, i) => {
      console.log(
        `${i + 1}. ${tx.classification.primaryType} | ${tx.classification.primaryAmount?.amountUi || 0} ${tx.classification.primaryAmount?.token.symbol || "N/A"} | ${tx.tx.signature.slice(0, 20)}...`,
      );
    });

    const foundSwap = transactions.find(
      (tx) => tx.tx.signature === TEST_SWAP_SIGNATURE,
    );
    console.log("\n=== Swap Found (with spam filter)? ===", !!foundSwap);

    expect(foundSwap).toBeDefined();
  }, 60000);
});
