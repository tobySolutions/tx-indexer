import type { Address } from "@solana/kit";
import type { TxLeg, RawTransaction } from "@tx-indexer/core/tx/tx.types";
import type { TransactionClassification } from "@tx-indexer/core/tx/classification.types";

export interface ClassifierContext {
  legs: TxLeg[];
  walletAddress?: Address;
  tx: RawTransaction;
}

export interface Classifier {
  name: string;
  priority: number;
  classify(context: ClassifierContext): TransactionClassification | null;
}

