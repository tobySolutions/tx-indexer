import { createIndexer } from "tx-indexer";

export const indexer = createIndexer({ rpcUrl: process.env.RPC_URL! });
