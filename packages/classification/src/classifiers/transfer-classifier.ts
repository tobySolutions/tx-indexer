import type {
  Classifier,
  ClassifierContext,
} from "../engine/classifier.interface";
import type { TransactionClassification } from "@tx-indexer/core/tx/classification.types";
import { detectFacilitator } from "@tx-indexer/solana/constants/program-ids";

export class TransferClassifier implements Classifier {
  name = "transfer";
  priority = 20;

  classify(context: ClassifierContext): TransactionClassification | null {
    const { legs, walletAddress, tx } = context;

    const facilitator = tx.accountKeys
      ? detectFacilitator(tx.accountKeys)
      : null;

    const isObserverMode = !walletAddress;

    let participantAddress: string;
    let participantPrefix: string;

    if (walletAddress) {
      participantAddress = walletAddress.toLowerCase();
      participantPrefix = `wallet:${participantAddress}`;
    } else {
      const feeLeg = legs.find(
        (leg) => leg.role === "fee" && leg.accountId.startsWith("external:")
      );
      if (!feeLeg) return null;
      participantAddress = feeLeg.accountId.replace("external:", "").toLowerCase();
      participantPrefix = `external:${participantAddress}`;
    }

    const participantSent = legs.filter(
      (l) =>
        l.accountId.toLowerCase().startsWith(participantPrefix.toLowerCase()) &&
        l.side === "debit" &&
        l.role === "sent"
    );

    const participantReceived = legs.filter(
      (l) =>
        l.accountId.toLowerCase().startsWith(participantPrefix.toLowerCase()) &&
        l.side === "credit" &&
        l.role === "received"
    );

    const otherReceived = legs.filter(
      (l) =>
        !l.accountId.toLowerCase().startsWith(participantPrefix.toLowerCase()) &&
        l.accountId.startsWith("external:") &&
        l.side === "credit" &&
        l.role === "received"
    );

    const otherSent = legs.filter(
      (l) =>
        !l.accountId.toLowerCase().startsWith(participantPrefix.toLowerCase()) &&
        l.accountId.startsWith("external:") &&
        l.side === "debit" &&
        l.role === "sent"
    );

    for (const sent of participantSent) {
      const matchingReceived = otherReceived.find(
        (r) => r.amount.token.mint === sent.amount.token.mint
      );

      if (matchingReceived) {
        const receiverAddress = matchingReceived.accountId.replace("external:", "");

        return {
          primaryType: "transfer",
          direction: isObserverMode ? "neutral" : "outgoing",
          primaryAmount: sent.amount,
          secondaryAmount: null,
          counterparty: {
            type: "unknown",
            address: receiverAddress,
            name: `${receiverAddress.slice(0, 8)}...`,
          },
          confidence: isObserverMode ? 0.9 : 0.95,
          isRelevant: true,
          metadata: {
            ...(isObserverMode && { observer_mode: true, sender: participantAddress }),
            ...(facilitator && { facilitator, payment_type: "facilitated" }),
          },
        };
      }
    }

    for (const received of participantReceived) {
      const matchingSent = otherSent.find(
        (s) => s.amount.token.mint === received.amount.token.mint
      );

      if (matchingSent) {
        const senderAddress = matchingSent.accountId.replace("external:", "");

        return {
          primaryType: "transfer",
          direction: isObserverMode ? "neutral" : "incoming",
          primaryAmount: received.amount,
          secondaryAmount: null,
          counterparty: {
            type: "unknown",
            address: senderAddress,
            name: `${senderAddress.slice(0, 8)}...`,
          },
          confidence: isObserverMode ? 0.9 : 0.95,
          isRelevant: true,
          metadata: {
            ...(isObserverMode && { observer_mode: true, receiver: participantAddress }),
            ...(facilitator && { facilitator, payment_type: "facilitated" }),
          },
        };
      }
    }

    return null;
  }
}
