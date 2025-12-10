import type { Address, Signature } from "@solana/kit";
import {
  createSolanaClient,
  parseAddress,
  parseSignature,
  type SolanaClient,
} from "@tx-indexer/solana/rpc/client";
import { fetchWalletBalance } from "@tx-indexer/solana/fetcher/balances";
import {
  fetchWalletSignatures,
  fetchTransaction,
  fetchTransactionsBatch,
  type FetchTransactionsConfig,
} from "@tx-indexer/solana/fetcher/transactions";
import { transactionToLegs } from "@tx-indexer/solana/mappers/transaction-to-legs";
import { classifyTransaction } from "@tx-indexer/classification/engine/classification-service";
import { filterSpamTransactions, type SpamFilterConfig } from "@tx-indexer/core/tx/spam-filter";
import type { WalletBalance } from "@tx-indexer/solana/fetcher/balances";
import type { RawTransaction } from "@tx-indexer/core/tx/tx.types";
import type { TransactionClassification } from "@tx-indexer/core/tx/classification.types";

export type TxIndexerOptions =
  | { rpcUrl: string; wsUrl?: string }
  | { client: SolanaClient };

export interface GetTransactionsOptions extends FetchTransactionsConfig {
  filterSpam?: boolean;
  spamConfig?: SpamFilterConfig;
}

export interface ClassifiedTransaction {
  tx: RawTransaction;
  classification: TransactionClassification;
  legs: ReturnType<typeof transactionToLegs>;
}

export interface TxIndexer {
  rpc: ReturnType<typeof createSolanaClient>["rpc"];
  getBalance(
    walletAddress: string | Address,
    tokenMints?: readonly string[]
  ): Promise<WalletBalance>;
  getTransactions(
    walletAddress: string | Address,
    options?: GetTransactionsOptions
  ): Promise<ClassifiedTransaction[]>;
  getTransaction(
    signature: string | Signature,
    walletAddress: string | Address
  ): Promise<ClassifiedTransaction | null>;
  getRawTransaction(
    signature: string | Signature
  ): Promise<RawTransaction | null>;
}

/**
 * Creates a transaction indexer client for querying and classifying Solana transactions.
 * 
 * Accepts either an RPC URL (SDK creates client) or an existing SolanaClient (for sharing
 * connections across your app or with React providers).
 * 
 * @param options - Configuration with RPC URL or existing client
 * @returns Transaction indexer client
 * 
 * @example
 * // Option 1: SDK creates client
 * const indexer = createIndexer({ rpcUrl: "https://api.mainnet-beta.solana.com" });
 * 
 * @example
 * // Option 2: Provide existing client (share connections)
 * const myClient = createSolanaClient("https://...");
 * const indexer = createIndexer({ client: myClient });
 */
export function createIndexer(options: TxIndexerOptions): TxIndexer {
  const client = "client" in options
    ? options.client
    : createSolanaClient(options.rpcUrl, options.wsUrl);

  return {
    rpc: client.rpc,

    async getBalance(
      walletAddress: string | Address,
      tokenMints?: readonly string[]
    ): Promise<WalletBalance> {
      const address =
        typeof walletAddress === "string"
          ? parseAddress(walletAddress)
          : walletAddress;

      return fetchWalletBalance(client.rpc, address, tokenMints);
    },

    async getTransactions(
      walletAddress: string | Address,
      options: GetTransactionsOptions = {}
    ): Promise<ClassifiedTransaction[]> {
      const { limit, before, until, filterSpam = true, spamConfig } = options;

      const address =
        typeof walletAddress === "string"
          ? parseAddress(walletAddress)
          : walletAddress;

      const signatures = await fetchWalletSignatures(client.rpc, address, {
        limit,
        before,
        until,
      });

      if (signatures.length === 0) {
        return [];
      }

      const signatureObjects = signatures.map((sig) =>
        parseSignature(sig.signature)
      );
      const transactions = await fetchTransactionsBatch(
        client.rpc,
        signatureObjects
      );

      const walletAddressString =
        typeof walletAddress === "string" ? walletAddress : (walletAddress as unknown as string);

      const classified = transactions.map((tx) => {
        const legs = transactionToLegs(tx, walletAddressString);
        const classification = classifyTransaction(legs, walletAddressString, tx);
        return { tx, classification, legs };
      });

      if (filterSpam) {
        return filterSpamTransactions(classified, spamConfig);
      }

      return classified;
    },

    async getTransaction(
      signature: string | Signature,
      walletAddress: string | Address
    ): Promise<ClassifiedTransaction | null> {
      const sig =
        typeof signature === "string" ? parseSignature(signature) : signature;

      const tx = await fetchTransaction(client.rpc, sig);

      if (!tx) {
        return null;
      }

      const walletAddressString =
        typeof walletAddress === "string" ? walletAddress : (walletAddress as unknown as string);

      const legs = transactionToLegs(tx, walletAddressString);
      const classification = classifyTransaction(legs, walletAddressString, tx);

      return { tx, classification, legs };
    },

    async getRawTransaction(
      signature: string | Signature
    ): Promise<RawTransaction | null> {
      const sig =
        typeof signature === "string" ? parseSignature(signature) : signature;

      return fetchTransaction(client.rpc, sig);
    },
  };
}
