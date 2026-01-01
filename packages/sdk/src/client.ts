import type { Address, Signature } from "@solana/kit";
import {
  createSolanaClient,
  parseSignature,
  type SolanaClient,
} from "@tx-indexer/solana/rpc/client";
import { fetchWalletBalance } from "@tx-indexer/solana/fetcher/balances";
import {
  fetchWalletSignatures,
  fetchTransaction,
  fetchTransactionsBatch,
} from "@tx-indexer/solana/fetcher/transactions";

export type { FetchTransactionsConfig } from "@tx-indexer/solana/fetcher/transactions";
import { transactionToLegs } from "@tx-indexer/solana/mappers/transaction-to-legs";
import { classifyTransaction } from "@tx-indexer/classification/engine/classification-service";
import { detectProtocol } from "@tx-indexer/classification/protocols/detector";
import { filterSpamTransactions, type SpamFilterConfig } from "@tx-indexer/core/tx/spam-filter";
import type { WalletBalance } from "@tx-indexer/solana/fetcher/balances";
import type { RawTransaction } from "@tx-indexer/core/tx/tx.types";
import type { TransactionClassification } from "@tx-indexer/core/tx/classification.types";
import { fetchNftMetadata, fetchNftMetadataBatch, type NftMetadata } from "./nft";

const NFT_TRANSACTION_TYPES = ["nft_mint", "nft_purchase", "nft_sale"] as const;

async function enrichNftClassification(
  rpcUrl: string,
  classified: ClassifiedTransaction
): Promise<ClassifiedTransaction> {
  const { classification } = classified;

  if (!NFT_TRANSACTION_TYPES.includes(classification.primaryType as any)) {
    return classified;
  }

  const nftMint = classification.metadata?.nft_mint as string | undefined;
  if (!nftMint) {
    return classified;
  }

  const nftData = await fetchNftMetadata(rpcUrl, nftMint);
  if (!nftData) {
    return classified;
  }

  return {
    ...classified,
    classification: {
      ...classification,
      metadata: {
        ...classification.metadata,
        nft_name: nftData.name,
        nft_image: nftData.image,
        nft_cdn_image: nftData.cdnImage,
        nft_collection: nftData.collection,
        nft_symbol: nftData.symbol,
        nft_attributes: nftData.attributes,
      },
    },
  };
}

export type TxIndexerOptions =
  | { 
      rpcUrl: string; 
      wsUrl?: string;
    }
  | { 
      client: SolanaClient;
    };

export interface GetTransactionsOptions {
  limit?: number;
  before?: Signature;
  until?: Signature;
  filterSpam?: boolean;
  spamConfig?: SpamFilterConfig;
  enrichNftMetadata?: boolean;
}

export interface GetTransactionOptions {
  enrichNftMetadata?: boolean;
}

export interface ClassifiedTransaction {
  tx: RawTransaction;
  classification: TransactionClassification;
  legs: ReturnType<typeof transactionToLegs>;
}

export interface TxIndexer {
  rpc: ReturnType<typeof createSolanaClient>["rpc"];
  
  getBalance(
    walletAddress: Address,
    tokenMints?: readonly string[]
  ): Promise<WalletBalance>;
  
  getTransactions(
    walletAddress: Address,
    options?: GetTransactionsOptions
  ): Promise<ClassifiedTransaction[]>;
  
  getTransaction(signature: Signature, options?: GetTransactionOptions): Promise<ClassifiedTransaction | null>;
  
  getRawTransaction(signature: Signature): Promise<RawTransaction | null>;

  getNftMetadata(mintAddress: string): Promise<NftMetadata | null>;

  getNftMetadataBatch(mintAddresses: string[]): Promise<Map<string, NftMetadata>>;
}

export function createIndexer(options: TxIndexerOptions): TxIndexer {
  const rpcUrl = "client" in options ? "" : options.rpcUrl;
  const client = "client" in options
    ? options.client
    : createSolanaClient(options.rpcUrl, options.wsUrl);

  return {
    rpc: client.rpc,

    async getBalance(
      walletAddress: Address,
      tokenMints?: readonly string[]
    ): Promise<WalletBalance> {
      return fetchWalletBalance(client.rpc, walletAddress, tokenMints);
    },

    async getTransactions(
      walletAddress: Address,
      options: GetTransactionsOptions = {}
    ): Promise<ClassifiedTransaction[]> {
      const { limit = 10, before, until, filterSpam = true, spamConfig, enrichNftMetadata = true } = options;

      async function enrichBatch(transactions: ClassifiedTransaction[]): Promise<ClassifiedTransaction[]> {
        if (!enrichNftMetadata || !rpcUrl) {
          return transactions;
        }

        const nftMints = transactions
          .filter((t) => NFT_TRANSACTION_TYPES.includes(t.classification.primaryType as any))
          .map((t) => t.classification.metadata?.nft_mint as string)
          .filter(Boolean);

        if (nftMints.length === 0) {
          return transactions;
        }

        const nftMetadataMap = await fetchNftMetadataBatch(rpcUrl, nftMints);

        return transactions.map((t) => {
          const nftMint = t.classification.metadata?.nft_mint as string | undefined;
          if (!nftMint || !nftMetadataMap.has(nftMint)) {
            return t;
          }

          const nftData = nftMetadataMap.get(nftMint)!;
          return {
            ...t,
            classification: {
              ...t.classification,
              metadata: {
                ...t.classification.metadata,
                nft_name: nftData.name,
                nft_image: nftData.image,
                nft_cdn_image: nftData.cdnImage,
                nft_collection: nftData.collection,
                nft_symbol: nftData.symbol,
                nft_attributes: nftData.attributes,
              },
            },
          };
        });
      }

      if (!filterSpam) {
        const signatures = await fetchWalletSignatures(client.rpc, walletAddress, {
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

        const walletAddressStr = walletAddress.toString();
        const classified = transactions.map((tx) => {
          tx.protocol = detectProtocol(tx.programIds);
          const legs = transactionToLegs(tx);
          const classification = classifyTransaction(legs, tx, walletAddressStr);
          return { tx, classification, legs };
        });

        return enrichBatch(classified);
      }

      const accumulated: ClassifiedTransaction[] = [];
      let currentBefore = before;
      const MAX_ITERATIONS = 10;
      let iteration = 0;
      const walletAddressStr = walletAddress.toString();

      while (accumulated.length < limit && iteration < MAX_ITERATIONS) {
        iteration++;

        const batchSize = iteration === 1 ? limit : limit * 2;

        const signatures = await fetchWalletSignatures(client.rpc, walletAddress, {
          limit: batchSize,
          before: currentBefore,
          until,
        });

        if (signatures.length === 0) {
          break;
        }

        const signatureObjects = signatures.map((sig) =>
          parseSignature(sig.signature)
        );
        const transactions = await fetchTransactionsBatch(
          client.rpc,
          signatureObjects
        );

        const classified = transactions.map((tx) => {
          tx.protocol = detectProtocol(tx.programIds);
          const legs = transactionToLegs(tx);
          const classification = classifyTransaction(legs, tx, walletAddressStr);
          return { tx, classification, legs };
        });

        const nonSpam = filterSpamTransactions(classified, spamConfig);
        accumulated.push(...nonSpam);

        const lastSignature = signatures[signatures.length - 1];
        if (lastSignature) {
          currentBefore = parseSignature(lastSignature.signature);
        } else {
          break;
        }
      }

      const result = accumulated.slice(0, limit);
      return enrichBatch(result);
    },

    async getTransaction(
      signature: Signature,
      options: GetTransactionOptions = {}
    ): Promise<ClassifiedTransaction | null> {
      const { enrichNftMetadata = true } = options;

      const tx = await fetchTransaction(client.rpc, signature);

      if (!tx) {
        return null;
      }

      tx.protocol = detectProtocol(tx.programIds);

      const legs = transactionToLegs(tx);
      const classification = classifyTransaction(legs, tx);

      let classified: ClassifiedTransaction = { tx, classification, legs };

      if (enrichNftMetadata && rpcUrl) {
        classified = await enrichNftClassification(rpcUrl, classified);
      }

      return classified;
    },

    async getRawTransaction(signature: Signature): Promise<RawTransaction | null> {
      return fetchTransaction(client.rpc, signature);
    },

    async getNftMetadata(mintAddress: string): Promise<NftMetadata | null> {
      if (!rpcUrl) {
        throw new Error("getNftMetadata requires rpcUrl to be set");
      }
      return fetchNftMetadata(rpcUrl, mintAddress);
    },

    async getNftMetadataBatch(mintAddresses: string[]): Promise<Map<string, NftMetadata>> {
      if (!rpcUrl) {
        throw new Error("getNftMetadataBatch requires rpcUrl to be set");
      }
      return fetchNftMetadataBatch(rpcUrl, mintAddresses);
    },
  };
}
