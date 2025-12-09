import type {
  Classifier,
  ClassifierContext,
} from "../engine/classifier.interface";
import type { TransactionClassification } from "@domain/tx/classification.types";

export class AirdropClassifier implements Classifier {
  name = "airdrop";
  priority = 70;

  classify(context: ClassifierContext): TransactionClassification | null {
    const { legs, walletAddress } = context;

    const walletPrefix = `wallet:${walletAddress}`;

    const userCredits = legs.filter(
      (leg) => leg.accountId.includes(walletPrefix) && leg.side === "credit"
    );

    const userDebits = legs.filter(
      (leg) => leg.accountId.includes(walletPrefix) && leg.side === "debit"
    );

    const tokenReceived = userCredits.filter(
      (leg) => leg.role === "received" && leg.amount.token.symbol !== "SOL"
    );

    if (tokenReceived.length === 0) {
      return null;
    }

    const tokenSent = userDebits.filter(
      (leg) => leg.role === "sent" && leg.amount.token.symbol !== "SOL"
    );

    if (tokenSent.length > 0) {
      return null;
    }

    const protocolLegs = legs.filter((leg) =>
      leg.accountId.startsWith("protocol:")
    );

    if (protocolLegs.length === 0) {
      return null;
    }

    const mainToken = tokenReceived[0]!;

    return {
      primaryType: "airdrop",
      direction: "incoming",
      primaryAmount: mainToken.amount,
      secondaryAmount: null,
      counterparty: null,
      confidence: 0.85,
      isRelevant: true,
      metadata: {
        airdrop_type: "token",
        token: mainToken.amount.token.symbol,
        amount: mainToken.amount.amountUi,
      },
    };
  }
}
