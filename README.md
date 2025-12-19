# TX Indexer

A Solana transaction indexer and classification SDK that transforms raw blockchain transactions into categorized, user-friendly financial data.

> Under active development

## Overview

TX Indexer is a TypeScript SDK for fetching, classifying, and understanding Solana transactions. It provides a high-level API that automatically categorizes transactions (swaps, transfers, NFT mints, staking, bridges, etc.) and detects the protocols involved.

The SDK transforms raw blockchain data through a three-layer architecture:

```
RawTransaction → TxLeg[] → TransactionClassification
```

**Key capabilities:**
- Fetch wallet balances and transaction history
- Automatic transaction classification with confidence scoring
- Protocol detection (Jupiter, Raydium, Metaplex, Wormhole, etc.)
- Pure on-chain classification (no wallet context required)
- Double-entry accounting validation
- Spam filtering
- Type-safe with comprehensive JSDoc documentation

## Installation

```bash
bun add tx-indexer
# or
npm install tx-indexer
```

## Quick Start

```typescript
import { createIndexer } from "tx-indexer";

// Create an indexer instance with your RPC endpoint
const indexer = createIndexer({ 
  rpcUrl: "https://api.mainnet-beta.solana.com" 
});

// Fetch wallet balance
const balance = await indexer.getBalance("YourWalletAddress...");
console.log(`SOL: ${balance.sol.ui}`);
console.log(`USDC: ${balance.tokens.find(t => t.symbol === 'USDC')?.uiAmount}`);

// Fetch and classify transaction history
const transactions = await indexer.getTransactions("YourWalletAddress...", {
  limit: 10,
  filterSpam: true
});

for (const { tx, classification, legs } of transactions) {
  console.log(`${tx.signature.slice(0, 8)}...`);
  console.log(`  Type: ${classification.primaryType}`);
  console.log(`  From: ${classification.sender}`);
  console.log(`  To: ${classification.receiver}`);
  console.log(`  Amount: ${classification.primaryAmount?.amountUi} ${classification.primaryAmount?.token.symbol}`);
  console.log(`  Protocol: ${tx.protocol?.name || 'Unknown'}`);
}

// Get a single transaction with classification
const result = await indexer.getTransaction("5k9XPH7FKz...");

if (result) {
  const { tx, classification, legs } = result;
  console.log(`Type: ${classification.primaryType}`);
  console.log(`Sender: ${classification.sender}`);
  console.log(`Receiver: ${classification.receiver}`);
  console.log(`Confidence: ${classification.confidence}`);
}
```

## Architecture

This is a monorepo with the SDK built from multiple internal packages:

```
tx-indexer/
├── packages/
│   ├── sdk/              # Main SDK entry point and high-level API
│   ├── domain/           # Core types, money handling, token registry
│   ├── solana/           # RPC client, transaction fetching, balance parsing
│   └── classification/   # Classifier system, protocol detection
└── apps/
    ├── indexer/          # CLI tools for testing
    ├── web/              # Demo web application
    └── api/              # REST API wrapper
```

The SDK (`packages/sdk`) orchestrates the other packages and provides a clean API surface.

## How It Works

The SDK processes Solana transactions through three distinct layers:

### 1. Fetching Layer
Retrieves raw transaction data from Solana RPC including:
- Transaction metadata (signature, slot, blockTime, status)
- Pre/post token balances for all accounts
- Program IDs of all programs invoked
- Memo instructions (for Solana Pay support)

### 2. Accounting Layer
Transforms balance changes into double-entry accounting legs:
```typescript
{
  accountId: "external:userAddress" | "protocol:jupiter" | "fee:network",
  side: "debit" | "credit",
  amount: MoneyAmount,
  role: "sent" | "received" | "fee" | "protocol_deposit" | "protocol_withdraw"
}
```
All legs are validated to ensure debits equal credits.

### 3. Classification Layer
Analyzes legs and transaction context to determine:
- Transaction type (transfer, swap, nft_mint, stake_deposit, bridge_in, etc.)
- Sender and receiver addresses
- Primary and secondary amounts
- Counterparty information
- Confidence score (0.0 - 1.0)

Classification is purely on-chain data driven. The frontend determines incoming/outgoing perspective by comparing the connected wallet to `sender`/`receiver`.

## API Reference

### Main Entry Point

#### `createIndexer(options)`

Creates an indexer instance with high-level methods for querying transactions.

```typescript
import { createIndexer } from "tx-indexer";

// Option 1: Provide RPC URL
const indexer = createIndexer({ 
  rpcUrl: "https://api.mainnet-beta.solana.com",
  wsUrl: "wss://api.mainnet-beta.solana.com" // optional
});

// Option 2: Provide existing @solana/kit client
import { createSolanaRpc, createSolanaRpcSubscriptions } from "@solana/kit";
const rpc = createSolanaRpc("...");
const rpcSubscriptions = createSolanaRpcSubscriptions("...");
const indexer = createIndexer({ 
  client: { rpc, rpcSubscriptions } 
});
```

### Methods

#### `getBalance(walletAddress, tokenMints?)`

Fetches SOL and SPL token balances for a wallet.

```typescript
const balance = await indexer.getBalance(
  "YourWalletAddress...",
  ["EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"] // optional: filter specific tokens
);

// Returns: { sol: { lamports, ui }, tokens: [...] }
```

#### `getTransactions(walletAddress, options?)`

Fetches and classifies transaction history. Each transaction includes protocol detection and full classification.

```typescript
const transactions = await indexer.getTransactions("YourWalletAddress...", {
  limit: 10,           // max transactions to return
  before: signature,   // pagination cursor
  until: signature,    // fetch until this signature
  filterSpam: true,    // filter low-value/failed transactions
  spamConfig: {        // optional custom spam filter
    minSolAmount: 0.001,
    minTokenAmountUsd: 0.01,
    minConfidence: 0.5,
    allowFailed: false
  }
});

// Returns: Array<{ tx, classification, legs }>
```

#### `getTransaction(signature)`

Fetches and classifies a single transaction.

```typescript
const result = await indexer.getTransaction("5k9XPH7FKz...");

// Returns: { tx, classification, legs } | null
```

#### `getRawTransaction(signature)`

Fetches raw transaction data without classification.

```typescript
const tx = await indexer.getRawTransaction("5k9XPH7FKz...");

// Returns: RawTransaction | null
```

#### `rpc`

Direct access to the underlying Solana RPC client from `@solana/kit`.

```typescript
const { value } = await indexer.rpc.getLatestBlockhash().send();
```

## Exported Functions

For advanced use cases or tree-shaking, import individual functions directly:

### Transaction Fetching
```typescript
import { 
  fetchTransaction,
  fetchTransactionsBatch,
  fetchWalletSignatures 
} from "tx-indexer";
```

### Balance Queries
```typescript
import { 
  fetchWalletBalance,
  getWalletSolChange,
  getWalletTokenChanges 
} from "tx-indexer";
```

### Classification
```typescript
import { 
  classifyTransaction,
  detectProtocol,
  filterSpamTransactions 
} from "tx-indexer";
```

### Accounting
```typescript
import { 
  transactionToLegs,
  validateLegsBalance 
} from "tx-indexer";
```

### Types
```typescript
import type {
  TxIndexer,
  TxIndexerOptions,
  ClassifiedTransaction,
  GetTransactionsOptions,
  RawTransaction,
  TransactionClassification,
  TxLeg,
  MoneyAmount,
  WalletBalance
} from "tx-indexer";
```

## Core Data Models

### 1. RawTransaction (Blockchain Layer)

Raw transaction data from Solana RPC including balance changes, program IDs, and optional memo instructions.

```typescript
{
  signature: string;
  slot: number;
  blockTime: number;
  programIds: string[];
  protocol: { id: "jupiter", name: "Jupiter" } | null;
  preTokenBalances: TokenBalance[];
  postTokenBalances: TokenBalance[];
  memo?: string;  // Solana Pay support
}
```

### 2. TxLeg (Accounting Layer)

Double-entry bookkeeping representation with structured account identifiers:

```typescript
{
  accountId: string;        // "external:addr", "protocol:jupiter", "fee:network"
  side: "debit" | "credit";
  amount: MoneyAmount;
  role: "sent" | "received" | "fee" | "protocol_deposit" | "protocol_withdraw";
}
```

**Example - Token Swap:**
```typescript
[
  { accountId: "external:user", side: "debit", amount: 100 USDC, role: "sent" },
  { accountId: "protocol:jupiter", side: "credit", amount: 100 USDC, role: "protocol_deposit" },
  { accountId: "protocol:jupiter", side: "debit", amount: 0.5 SOL, role: "protocol_withdraw" },
  { accountId: "external:user", side: "credit", amount: 0.5 SOL, role: "received" },
  { accountId: "fee:network", side: "credit", amount: 0.000005 SOL, role: "fee" }
]
```

### 3. TransactionClassification (UX Layer)

User-friendly categorization with sender/receiver identification:

```typescript
{
  primaryType: "transfer" | "swap" | "nft_mint" | "stake_deposit" | "stake_withdraw" | "bridge_in" | "bridge_out" | "airdrop" | "fee_only" | "other";
  primaryAmount: MoneyAmount | null;
  secondaryAmount?: MoneyAmount;  // For swaps
  sender: string | null;          // Address that sent
  receiver: string | null;        // Address that received
  counterparty?: {
    name: string;
    address: string;
    type: "wallet" | "protocol" | "merchant";
  };
  confidence: number;  // 0.0 - 1.0
  isRelevant: boolean;
  metadata: {
    payment_type?: "solana_pay";
    merchant?: string;
    swap_type?: "token_to_token";
    bridge_protocol?: string;
    // ... additional context
  }
}
```

## Classification Engine

Automatic transaction categorization using priority-based classifiers:

| Priority | Classifier | Detects |
|----------|------------|---------|
| 95 | Solana Pay | Payments with merchant metadata in memo |
| 88 | Bridge | Cross-chain transfers (Wormhole, deBridge, Allbridge, DeGods Bridge) |
| 85 | NFT Mint | NFT minting (Metaplex, Candy Machine, Bubblegum) |
| 82 | Stake Deposit | SOL staking deposits (Native Stake, Stake Pools) |
| 81 | Stake Withdraw | SOL staking withdrawals |
| 80 | Swap | Token exchanges (Jupiter, Raydium, Orca) |
| 70 | Airdrop | Token distributions (receive only) |
| 60 | Fee Only | Transactions with only network fees |
| 20 | Transfer | Simple wallet-to-wallet transfers |

Classifiers run in priority order. The first match determines the transaction type.

## Frontend Integration

Since classification is wallet-agnostic, the frontend determines perspective:

```typescript
const { classification } = await indexer.getTransaction(signature);
const connectedWallet = wallet?.address;

// Determine user perspective
if (connectedWallet === classification.sender) {
  // "You sent 1.5 SOL to 8DEY..."
} else if (connectedWallet === classification.receiver) {
  // "You received 1.5 SOL from 2RtG..."
} else {
  // "2RtG... sent 1.5 SOL to 8DEY..."
}
```

## Supported Protocols

- **DEX:** Jupiter, Raydium, Orca Whirlpool
- **NFT:** Metaplex, Candy Machine V3, Bubblegum (compressed NFTs)
- **Staking:** Native Stake Program, Stake Pool Program
- **Bridges:** Wormhole, deBridge, Allbridge, DeGods Bridge
- **Core:** Token Program, System Program, Associated Token Program
- **Payments:** Solana Pay (SPL Memo)

## Features

**Transaction Processing**
- Smart memo decoding - Extracts human-readable text from program logs and binary data (UTF-8, JSON, base58, UUID)
- Double-entry accounting - Validates all transactions balance (debits = credits)
- Protocol detection - Identifies Jupiter, Raydium, Orca, Metaplex, Wormhole, and other major protocols
- Automatic classification - Categorizes as transfer, swap, nft_mint, stake, bridge, airdrop, or Solana Pay
- Facilitator detection - Identifies PayAI and other payment facilitators

**SDK Capabilities**
- Token balance tracking - Real-time SOL and SPL token balances
- Spam/dust filtering - Automatically filters irrelevant transactions
- Type-safe - Full TypeScript with comprehensive JSDoc comments
- Tree-shakeable - Import only what you need
- Flexible initialization - Use RPC URL or bring your own `@solana/kit` client
- Direct RPC access - Full access to underlying Solana RPC client

## Bundle Size

The SDK is designed to be lightweight and tree-shakeable:

| Import | Size (minified + brotli) |
|--------|----------|
| Full SDK | ~20 KB |
| `createIndexer` only | ~20 KB |
| `classifyTransaction` | ~3 KB |
| `fetchTransaction` | ~4 KB |
| `transactionToLegs` | ~4 KB |

Measured with [size-limit](https://github.com/ai/size-limit). Run `bun run size` in `packages/sdk` to verify.  

## Technology

- **Language:** TypeScript with strict mode
- **Runtime:** Bun (Node.js compatible)
- **Blockchain:** Solana via `@solana/kit` v5
- **Validation:** Zod for runtime type checking
- **Monorepo:** Turborepo for build orchestration

## Development

```bash
# Install dependencies
bun install

# Build all packages
bun run build

# Run type checking
bun run typecheck

# Test the SDK
cd packages/sdk
bun test
```

### Using in Development

```typescript
// Import from local workspace package
import { createIndexer } from "tx-indexer";

// Or import internal packages directly
import { classifyTransaction } from "@tx-indexer/classification/classifier";
import { transactionToLegs } from "@tx-indexer/solana/mappers/leg-mapper";
import { detectProtocol } from "@tx-indexer/classification/protocols/detector";
```

## Contributing

This project uses:
- Conventional Commits for commit messages
- TypeScript strict mode throughout
- ESM modules only
- Comprehensive JSDoc comments for all public functions

---

**License:** MIT
