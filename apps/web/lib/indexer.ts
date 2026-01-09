import { createIndexer } from "tx-indexer";

export const indexer = createIndexer({ rpcUrl: process.env.SERVER_RPC_URL! });
