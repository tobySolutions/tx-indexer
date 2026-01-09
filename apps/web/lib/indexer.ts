import { createIndexer, type TxIndexer } from "tx-indexer";

let _indexer: TxIndexer | null = null;

export function getIndexer(): TxIndexer {
  if (!_indexer) {
    if (!process.env.SERVER_RPC_URL) {
      throw new Error("SERVER_RPC_URL environment variable is not set");
    }
    _indexer = createIndexer({ rpcUrl: process.env.SERVER_RPC_URL });
  }
  return _indexer;
}

// For backwards compatibility - lazy wrapper
export const indexer: Pick<
  TxIndexer,
  "getBalance" | "getTransactions" | "getTransaction"
> = {
  getBalance: (...args) => getIndexer().getBalance(...args),
  getTransactions: (...args) => getIndexer().getTransactions(...args),
  getTransaction: (...args) => getIndexer().getTransaction(...args),
};
