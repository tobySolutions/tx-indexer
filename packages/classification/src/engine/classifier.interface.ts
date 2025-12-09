import type { TxLeg, RawTransaction } from "@domain/tx/tx.types";
import type { TransactionClassification } from "@domain/tx/classification.types";

export interface ClassifierContext {
  legs: TxLeg[];
  walletAddress: string;
  tx: RawTransaction;
}

export interface Classifier {
  name: string;
  priority: number;
  classify(context: ClassifierContext): TransactionClassification | null;
}

