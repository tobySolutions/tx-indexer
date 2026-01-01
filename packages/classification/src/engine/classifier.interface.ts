import type { TxLeg, RawTransaction } from "@tx-indexer/core/tx/tx.types";
import type { TransactionClassification } from "@tx-indexer/core/tx/classification.types";

export interface ClassifierContext {
  legs: TxLeg[];
  tx: RawTransaction;
  walletAddress?: string;
}

export interface Classifier {
  name: string;
  priority: number;
  classify(context: ClassifierContext): TransactionClassification | null;
}

