import type {
  Classifier,
  ClassifierContext,
} from "../engine/classifier.interface";
import type { TransactionClassification } from "@tx-indexer/core/tx/classification.types";
import { detectFacilitator } from "@tx-indexer/solana/constants/program-ids";

export class AirdropClassifier implements Classifier {
  name = "airdrop";
  priority = 70;

  classify(context: ClassifierContext): TransactionClassification | null {
    const { legs, walletAddress, tx } = context;
    
    const facilitator = tx.accountKeys 
      ? detectFacilitator(tx.accountKeys) 
      : null;

    const protocolLegs = legs.filter((leg) =>
      leg.accountId.startsWith("protocol:")
    );

    if (protocolLegs.length === 0) {
      return null;
    }

    const isObserverMode = !walletAddress;
    const accountPrefix = walletAddress ? `wallet:${walletAddress}` : "external:";

    const participantCredits = legs.filter(
      (leg) => leg.accountId.startsWith(accountPrefix) && leg.side === "credit"
    );

    const participantDebits = legs.filter(
      (leg) => leg.accountId.startsWith(accountPrefix) && leg.side === "debit"
    );

    const tokenReceived = participantCredits.filter(
      (leg) => leg.role === "received" && leg.amount.token.symbol !== "SOL"
    );

    if (tokenReceived.length === 0) {
      return null;
    }

    const tokenSent = participantDebits.filter(
      (leg) => leg.role === "sent" && leg.amount.token.symbol !== "SOL"
    );

    if (tokenSent.length > 0) {
      return null;
    }

    const mainToken = tokenReceived[0]!;

    const senderLegs = legs.filter(
      (leg) =>
        leg.side === "debit" &&
        leg.amount.token.mint === mainToken.amount.token.mint &&
        !leg.accountId.startsWith(accountPrefix)
    );

    const sender = senderLegs.length > 0 ? senderLegs[0] : null;
    const receiverAddress = mainToken.accountId.replace(/^(external:|wallet:)/, "");

    return {
      primaryType: "airdrop",
      direction: isObserverMode ? "neutral" : "incoming",
      primaryAmount: mainToken.amount,
      secondaryAmount: null,
      counterparty: sender
        ? {
            type: "unknown",
            address: sender.accountId.replace(/^(external:|protocol:|wallet:)/, ""),
          }
        : null,
      confidence: isObserverMode ? 0.8 : 0.85,
      isRelevant: true,
      metadata: {
        airdrop_type: "token",
        token: mainToken.amount.token.symbol,
        amount: mainToken.amount.amountUi,
        ...(isObserverMode && { observer_mode: true, receiver: receiverAddress }),
        ...(facilitator && { facilitator, payment_type: "facilitated" }),
      },
    };
  }
}
