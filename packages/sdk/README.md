# tx-indexer SDK

Solana transaction indexer and classification SDK.

## Installation

```bash
bun add tx-indexer
# or
npm install tx-indexer
```

## Quick Start

```typescript
import { createIndexer } from "tx-indexer";

const indexer = createIndexer({
  rpcUrl: "https://api.mainnet-beta.solana.com",
});

// Get wallet balance
const balance = await indexer.getBalance("YourWalletAddress...");

// Get classified transactions
const txs = await indexer.getTransactions("YourWalletAddress...", {
  limit: 10,
  filterSpam: true,
});

// Get single transaction (no wallet required)
const tx = await indexer.getTransaction("signature...");

// Classification includes sender/receiver
console.log(tx.classification.primaryType); // "transfer", "swap", "nft_mint", etc.
console.log(tx.classification.sender); // sender address
console.log(tx.classification.receiver); // receiver address
```

## RPC Compatibility

The SDK works with any Solana RPC for core features (transactions, balances, classification).

NFT metadata enrichment requires a DAS-compatible RPC (Helius, Triton, etc.). If using a standard RPC, disable it:

```typescript
const txs = await indexer.getTransactions(address, {
  enrichNftMetadata: false,
});
```

## Transaction Schema

A `ClassifiedTransaction` has three parts:

```typescript
interface ClassifiedTransaction {
  tx: RawTransaction; // The raw on-chain data
  legs: TxLeg[]; // Balance changes as accounting entries
  classification: TransactionClassification; // Human-readable interpretation
}
```

**Why this structure?**

1. **`tx` (RawTransaction)** - The immutable on-chain data: signature, slot, balances, program IDs. This is what Solana returns.

2. **`legs` (TxLeg[])** - Double-entry accounting view of the transaction. Each leg represents a balance change with:
   - `accountId` - Who's balance changed (wallet + token mint)
   - `side` - `"debit"` (decrease) or `"credit"` (increase)
   - `amount` - The `MoneyAmount` with token info and value
   - `role` - Semantic meaning: `"sent"`, `"received"`, `"fee"`, `"protocol_deposit"`, etc.

   Legs are useful for building transaction history UIs, calculating portfolio changes, or auditing.

3. **`classification`** - High-level interpretation for display:
   - `primaryType` - What happened: `"transfer"`, `"swap"`, `"nft_mint"`, etc.
   - `primaryAmount` / `secondaryAmount` - The main values involved (e.g., swap: SOL → USDC)
   - `sender` / `receiver` - The human-relevant parties
   - `counterparty` - Known protocol or merchant (best-effort)
   - `confidence` - How confident the classifier is (0-1)

## Transaction Types

- `transfer` - Wallet-to-wallet transfers
- `swap` - Token exchanges (pattern-based detection works with any DEX, higher confidence for known protocols like Jupiter, Raydium, Orca)
- `nft_mint` - NFT minting (Metaplex, Candy Machine, Bubblegum)
- `stake_deposit` - SOL staking deposits
- `stake_withdraw` - SOL staking withdrawals
- `bridge_in` - Receiving from bridge (Wormhole, deBridge, Allbridge)
- `bridge_out` - Sending to bridge
- `airdrop` - Token distributions
- `fee_only` - Transactions with only network fees

## Frontend Integration

Classification is wallet-agnostic. Determine perspective in your frontend:

```typescript
const { classification } = await indexer.getTransaction(signature);
const connectedWallet = wallet?.address;

if (connectedWallet === classification.sender) {
  // "You sent..."
} else if (connectedWallet === classification.receiver) {
  // "You received..."
} else {
  // "Address X sent to Address Y"
}
```

## JSON-Safe Serialization

When using the SDK in server-side contexts (Next.js API routes, server actions), use the JSON-safe types and helpers to ensure proper serialization:

```typescript
import {
  createIndexer,
  toJsonClassifiedTransaction,
  toJsonClassifiedTransactions,
  type JsonClassifiedTransaction,
} from "tx-indexer";

// Next.js API route
export async function GET() {
  const indexer = createIndexer({ rpcUrl: process.env.RPC_URL });
  const tx = await indexer.getTransaction(signature);

  if (!tx) return new Response("Not found", { status: 404 });

  // Safe to serialize - handles bigint → string, Date → ISO string
  return Response.json(toJsonClassifiedTransaction(tx));
}

// Next.js server action
("use server");
export async function getWalletTxs(
  wallet: string,
): Promise<JsonClassifiedTransaction[]> {
  const indexer = createIndexer({ rpcUrl: process.env.RPC_URL });
  const txs = await indexer.getTransactions(wallet);
  return toJsonClassifiedTransactions(txs);
}
```

The JSON-safe types convert:

- `bigint` fields (slot, blockTime, balances) → `string`
- `Date` fields (fiat.at) → ISO 8601 string

## Counterparty Information

The `classification.counterparty` field provides best-effort display information based on known protocol addresses:

```typescript
const { classification } = await indexer.getTransaction(signature);

if (classification.counterparty) {
  console.log(classification.counterparty.name); // e.g., "Jupiter"
  console.log(classification.counterparty.type); // "protocol", "exchange", etc.
  console.log(classification.counterparty.address); // Protocol address
}
```

> **Note:** Counterparty information is for display purposes only. It may not always be accurate and should not be used for security-critical decisions.

## Bundle Size

The SDK is lightweight and tree-shakeable:

| Import                | Size (minified + brotli) |
| --------------------- | ------------------------ |
| Full SDK              | 11.34 KB                 |
| `createIndexer` only  | 11.34 KB                 |
| `classifyTransaction` | 6.39 KB                  |
| `fetchTransaction`    | 7.39 KB                  |
| `transactionToLegs`   | 7.3 KB                   |

Check current sizes:

```bash
bun run size
```

Analyze why a bundle is large:

```bash
bun run size:why
```

## Documentation

See the main [project README](../../README.md) for:

- Complete API reference
- Architecture details
- Exported functions
- Usage examples

## Development

```bash
# Type check
bun run check-types

# Check bundle size
bun run size

# Analyze bundle composition
bun run size:why
```

## Breaking Changes

### v1.x → v2.x (TypeScript only)

**`primaryAmount` and `secondaryAmount` type change:**

The `TransactionClassification.primaryAmount` and `secondaryAmount` fields changed from `any` to `MoneyAmount | null`.

```typescript
// Before (v1.x): any type, no IntelliSense
classification.primaryAmount?.token; // any

// After (v2.x): Full type safety
classification.primaryAmount?.token.symbol; // string
classification.primaryAmount?.token.decimals; // number
classification.primaryAmount?.amountUi; // number
classification.primaryAmount?.fiat?.amount; // number
```

**Impact:**

- Runtime behavior is unchanged
- TypeScript consumers who relied on `any` may need to update type assertions
- You now get full IntelliSense for amount fields

## License

MIT
