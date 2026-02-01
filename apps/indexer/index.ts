import { address } from "@solana/kit";
import { createIndexer } from "tx-indexer";
import { TRACKED_TOKENS } from "@tx-indexer/core/money/token-registry";
import {
  getWalletTokenChanges,
  getWalletSolChange,
} from "@tx-indexer/solana/mappers/balance-parser";
import { validateLegsBalance } from "@tx-indexer/core/tx/leg-validation";

const RPC_URL = process.env.RPC_URL || "https://api.devnet.solana.com";
const WALLET_ADDRESS_STRING = process.env.WALLET_ADDRESS;

async function main() {
  if (!WALLET_ADDRESS_STRING) {
    console.error("Error: WALLET_ADDRESS environment variable is required");
    console.error("Usage: WALLET_ADDRESS=<address> bun apps/indexer/index.ts");
    process.exit(1);
  }

  const walletAddress = address(WALLET_ADDRESS_STRING);

  console.log("TX Indexer\n");
  console.log("============================================\n");

  const indexer = createIndexer({ rpcUrl: RPC_URL });

  const balance = await indexer.getBalance(walletAddress, TRACKED_TOKENS);

  console.log("Current Balance");
  console.log("--------------------------------------------");
  console.log(
    `Address: ${WALLET_ADDRESS_STRING.slice(0, 8)}...${WALLET_ADDRESS_STRING.slice(-8)}`,
  );
  console.log(`SOL: ${balance.sol.ui.toFixed(9)}`);

  for (const token of balance.tokens) {
    console.log(`${token.symbol}: ${token.amount.ui.toFixed(token.decimals)}`);
  }

  console.log();
  console.log("Recent Transactions");
  console.log("--------------------------------------------");

  const filteredTransactions = await indexer.getTransactions(walletAddress, {
    limit: 10,
    filterSpam: true,
    spamConfig: {
      minSolAmount: 0.001,
      minTokenAmountUsd: 0.01,
      minConfidence: 0.5,
      allowFailed: false,
    },
  });

  if (filteredTransactions.length === 0) {
    console.log("No transactions found");
    return;
  }

  console.log(`\nShowing ${filteredTransactions.length} transactions\n`);

  filteredTransactions.forEach(({ tx, classification, legs }, index) => {
    const date = tx.blockTime
      ? new Date(Number(tx.blockTime) * 1000).toLocaleString()
      : "Pending";
    const status = tx.err ? "Failed" : "Success";
    const protocolName = tx.protocol ? tx.protocol.name : "Unknown";

    console.log(`\n${index + 1}. ${tx.signature}`);
    console.log(`   Status: ${status}`);
    console.log(`   Protocol: ${protocolName}`);
    console.log(`   Time: ${date}`);

    const solChange = getWalletSolChange(tx, walletAddress);
    const tokenChanges = getWalletTokenChanges(tx, walletAddress, [
      ...TRACKED_TOKENS,
    ]);

    if (solChange || tokenChanges.length > 0) {
      console.log(`   Balance Changes:`);

      if (solChange) {
        const sign = solChange.changeUi > 0 ? "+" : "";
        console.log(`     SOL: ${sign}${solChange.changeUi.toFixed(9)}`);
      }

      for (const change of tokenChanges) {
        const sign = change.change.ui > 0 ? "+" : "";
        console.log(
          `     ${change.tokenInfo.symbol}: ${sign}${change.change.ui.toFixed(
            change.tokenInfo.decimals,
          )}`,
        );
      }
    } else {
      console.log(`   Balance Changes: None`);
    }

    const validation = validateLegsBalance(legs);

    if (tx.memo) {
      console.log(`\n   Memo: ${tx.memo}`);
    }

    console.log(`\n   Classification:`);
    console.log(`     Type: ${classification.primaryType}`);
    if (classification.primaryAmount) {
      console.log(
        `     Amount: ${classification.primaryAmount.amountUi.toFixed(
          classification.primaryAmount.token.decimals,
        )} ${classification.primaryAmount.token.symbol}`,
      );
    }
    if (classification.secondaryAmount) {
      console.log(
        `     Received: ${classification.secondaryAmount.amountUi.toFixed(
          classification.secondaryAmount.token.decimals,
        )} ${classification.secondaryAmount.token.symbol}`,
      );
    }
    if (classification.counterparty) {
      console.log(`     Counterparty: ${classification.counterparty.name}`);
      if (classification.counterparty.address) {
        console.log(
          `       Address: ${classification.counterparty.address.slice(0, 8)}...${classification.counterparty.address.slice(-8)}`,
        );
      }
    }
    if (classification.metadata?.payment_type === "solana_pay") {
      console.log(`     Payment Type: Solana Pay`);
      if (classification.metadata.merchant) {
        console.log(`     Merchant: ${classification.metadata.merchant}`);
      }
      if (classification.metadata.item) {
        console.log(`     Item: ${classification.metadata.item}`);
      }
      if (classification.metadata.label) {
        console.log(`     Label: ${classification.metadata.label}`);
      }
      if (classification.metadata.message) {
        console.log(`     Message: ${classification.metadata.message}`);
      }
    }
    console.log(`     Confidence: ${classification.confidence}`);
    console.log(`     Relevant: ${classification.isRelevant ? "Yes" : "No"}`);
    console.log(
      `\n   Accounting: ${legs.length} legs (${validation.isBalanced ? "✓ balanced" : "⚠ unbalanced"})`,
    );
  });

  console.log("\n============================================");
}

main().catch(console.error);
