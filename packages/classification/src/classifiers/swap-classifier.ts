import type {
  Classifier,
  ClassifierContext,
} from "../engine/classifier.interface";
import type { TransactionClassification } from "@tx-indexer/core/tx/classification.types";
import { isDexProtocolById } from "../protocols/detector";

export class SwapClassifier implements Classifier {
  name = "swap";
  priority = 80;

  classify(context: ClassifierContext): TransactionClassification | null {
    const { legs, tx, walletAddress } = context;

    const feeLeg = legs.find(
      (leg) => leg.role === "fee" && leg.side === "debit"
    );
    const initiator = feeLeg?.accountId.replace("external:", "") ?? null;

    if (!initiator) {
      return null;
    }

    const initiatorAccountId = `external:${initiator}`;

    const initiatorTokensOut = legs.filter(
      (leg) =>
        leg.accountId === initiatorAccountId &&
        leg.side === "debit" &&
        (leg.role === "sent" || leg.role === "protocol_deposit")
    );

    const initiatorTokensIn = legs.filter(
      (leg) =>
        leg.accountId === initiatorAccountId &&
        leg.side === "credit" &&
        (leg.role === "received" || leg.role === "protocol_withdraw")
    );

    if (initiatorTokensOut.length === 0 || initiatorTokensIn.length === 0) {
      return null;
    }

    const initiatorOut = initiatorTokensOut[0]!;
    const initiatorIn = initiatorTokensIn[0]!;

    if (initiatorOut.amount.token.symbol === initiatorIn.amount.token.symbol) {
      return null;
    }

    let tokenOut = initiatorOut;
    let tokenIn = initiatorIn;
    let perspectiveWallet = initiator;

    if (walletAddress) {
      const walletAccountId = `external:${walletAddress}`;
      
      const walletOut = legs.find(
        (leg) =>
          leg.accountId === walletAccountId &&
          leg.side === "debit" &&
          (leg.role === "sent" || leg.role === "protocol_deposit")
      );

      const walletIn = legs.find(
        (leg) =>
          leg.accountId === walletAccountId &&
          leg.side === "credit" &&
          (leg.role === "received" || leg.role === "protocol_withdraw")
      );

      if (walletOut && walletIn && walletOut.amount.token.symbol !== walletIn.amount.token.symbol) {
        tokenOut = walletOut;
        tokenIn = walletIn;
        perspectiveWallet = walletAddress;
      }
    }

    const hasDexProtocol = isDexProtocolById(tx.protocol?.id);
    const confidence = hasDexProtocol ? 0.95 : 0.75;

    return {
      primaryType: "swap",
      primaryAmount: tokenOut.amount,
      secondaryAmount: tokenIn.amount,
      sender: perspectiveWallet,
      receiver: perspectiveWallet,
      counterparty: null,
      confidence,
      isRelevant: true,
      metadata: {
        swap_type: "token_to_token",
        from_token: tokenOut.amount.token.symbol,
        to_token: tokenIn.amount.token.symbol,
        from_amount: tokenOut.amount.amountUi,
        to_amount: tokenIn.amount.amountUi,
      },
    };
  }
}
