# TX Indexer

A Solana transaction indexer and classifier that transforms raw blockchain transactions into user-friendly, categorized financial data.

**Status:** 🚧 Under active development

## Features

### ✅ Current Features

- **Transaction Classification Engine** - Automatically categorize transactions into meaningful types
  - Solana Pay payments with merchant metadata
  - Token swaps (Jupiter, Raydium, Orca)
  - Airdrops and token distributions
  - Simple transfers (incoming/outgoing)
  - Fee-only transactions
- **Double-Entry Bookkeeping** - TxLeg model for accurate financial tracking
- **Protocol Detection** - Identify Jupiter, Raydium, Orca, Metaplex, and more
- **Token Balance Tracking** - SOL and SPL token balances with real-time updates
- **Memo Extraction** - Parse Solana Pay memos and payment metadata
- **Wallet Transaction History** - Fetch and classify transaction history
- **Type-Safe** - Full TypeScript with Zod validation

### 🔜 Coming Soon

- REST API endpoints
- Database persistence (PostgreSQL)
- WebSocket subscriptions for real-time updates
- Enhanced NFT transaction support
- DeFi protocol-specific classifiers

## Architecture

### Data Flow

```
RawTransaction (from Solana RPC)
    ↓
TxLeg[] (double-entry bookkeeping)
    ↓
TransactionClassification (user-friendly)
    ↓
API Response / UI Display
```

### Core Data Models

#### 1. RawTransaction
Raw transaction data fetched from Solana RPC, including:
- Transaction signature and metadata
- Program IDs and accounts
- Token balance changes (pre/post)
- SOL balance changes
- Memo instructions (for Solana Pay)

```typescript
{
  signature: string;
  slot: number;
  blockTime: number;
  programIds: string[];
  protocol: ProtocolInfo | null;
  memo?: string;
  // ... balance data
}
```

#### 2. TxLeg (Transaction Leg)
Double-entry bookkeeping representation of money movement:

```typescript
{
  accountId: string;        // "wallet:address" or "protocol:jupiter:SOL:address"
  side: "debit" | "credit";
  amount: MoneyAmount;
  role: "sent" | "received" | "fee" | "protocol_deposit" | ...;
}
```

**Example - Token Transfer:**
```typescript
[
  { accountId: "wallet:ABC...", side: "debit", amount: { token: USDC, amountUi: 100 }, role: "sent" },
  { accountId: "wallet:XYZ...", side: "credit", amount: { token: USDC, amountUi: 100 }, role: "received" },
  { accountId: "fee:network", side: "credit", amount: { token: SOL, amountUi: 0.00001 }, role: "fee" }
]
```

#### 3. TransactionClassification
User-friendly transaction classification:

```typescript
{
  primaryType: "transfer" | "swap" | "airdrop" | ...,
  direction: "incoming" | "outgoing" | "neutral",
  primaryAmount: MoneyAmount,
  secondaryAmount?: MoneyAmount,  // For swaps
  counterparty?: {
    name: string;
    address: string;
    type: "wallet" | "protocol" | "merchant";
  },
  confidence: 0.98,
  isRelevant: true,
  metadata: {
    payment_type?: "solana_pay",
    merchant?: string,
    // ... additional context
  }
}
```

## Classification Engine

### Available Classifiers

| Classifier | Priority | Purpose |
|------------|----------|---------|
| **SolanaPayClassifier** | 95 | Detects Solana Pay payments with merchant metadata |
| **SwapClassifier** | 80 | Identifies token-to-token exchanges |
| **AirdropClassifier** | 70 | Detects token distributions (no send, only receive) |
| **TransferClassifier** | 50 | Classifies simple transfers between wallets |
| **FeeOnlyClassifier** | 60 | Identifies transactions with only network fees |

Classifiers run in priority order (highest first). The first classifier that matches determines the transaction type.

### Adding Custom Classifiers

```typescript
import type { Classifier, ClassifierContext } from "@classification/engine/classifier.interface";

export class MyCustomClassifier implements Classifier {
  name = "my-custom";
  priority = 85;  // Higher = runs first

  classify(context: ClassifierContext): TransactionClassification | null {
    const { legs, walletAddress, tx } = context;
    
    // Your classification logic
    
    return {
      primaryType: "custom_type",
      direction: "incoming",
      confidence: 0.9,
      // ...
    };
  }
}
```

## CLI Tools

### 1. Transaction History Viewer

View wallet transaction history with automatic classification:

```bash
WALLET_ADDRESS=<your-wallet> bun apps/indexer/index.ts
```

Output:
```
TX Indexer
============================================

Current Balance
--------------------------------------------
Address: CmGgLQL3...PPhUWNqv
SOL: 0.000000000
USDC: 2.110000

Recent Transactions
--------------------------------------------

1. 56sXKPNAPSE...
   Status: Success
   Protocol: Associated Token Program
   Time: 11/4/2025, 12:31:59 AM

   Classification:
     Type: airdrop
     Direction: incoming
     Amount: 0.010000 USDC
     Confidence: 0.85
     Relevant: Yes

   Transaction Legs (5 total):
     fee: -0.002049281 SOL
     received: +0.010000 USDC
     ...
```

### 2. Single Transaction Classifier

Classify any transaction by signature:

```bash
SIGNATURE=<tx-signature> WALLET_ADDRESS=<wallet> bun apps/indexer/classify-tx.ts
```

## Project Structure

```
tx-indexer/
├── apps/
│   ├── indexer/          # CLI tools and scripts
│   ├── web/              # Next.js web app (planned)
│   └── docs/             # Documentation site
├── packages/
│   ├── domain/           # Core domain types and business logic
│   ├── solana/           # Solana RPC client and mappers
│   ├── classification/   # Transaction classification engine
│   ├── ui/               # Shared UI components
│   ├── eslint-config/    # Shared ESLint configuration
│   └── typescript-config/# Shared TypeScript configuration
```

## Development

### Prerequisites

- Bun 1.3.4+
- TypeScript 5.9+

### Setup

```bash
# Install dependencies
bun install

# Type check all packages
bun run check-types

# Lint all packages
bun run lint

# Run indexer
WALLET_ADDRESS=<address> bun apps/indexer/index.ts
```

### Key Commands

```bash
# Type checking
bun run check-types                    # All packages
bun run check-types --filter=domain    # Specific package

# Linting
bun run lint                           # All packages
bun run lint --filter=solana          # Specific package

# Classification
SIGNATURE=<sig> WALLET_ADDRESS=<addr> bun apps/indexer/classify-tx.ts
```

## Technology Stack

- **Runtime:** Bun
- **Language:** TypeScript
- **Blockchain:** Solana (@solana/kit v5)
- **Validation:** Zod
- **Build System:** Turborepo
- **Linting:** ESLint
- **Monorepo:** Bun workspaces

## Constants & Configuration

### Solana Program IDs

All known Solana program addresses are centralized in `packages/solana/src/constants/program-ids.ts`:

```typescript
import {
  JUPITER_V6_PROGRAM_ID,
  SPL_MEMO_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  // ... more
} from "@solana/constants/program-ids";
```

### Tracked Tokens

Configure tracked tokens in `packages/domain/src/money/token-registry.ts`:

```typescript
export const TRACKED_TOKENS = [
  KNOWN_TOKENS.SOL,
  KNOWN_TOKENS.USDC,
] as const;
```

## API Endpoints (Planned)

### GET /api/wallet/:address/balance
Returns current SOL and token balances

### GET /api/wallet/:address/transactions
Returns classified transaction history with pagination

### GET /api/transaction/:signature
Returns detailed transaction classification and legs

### WebSocket /ws/wallet/:address
Real-time transaction updates and classifications

## Data Validation

All data structures use **Zod schemas** for:
- ✅ Runtime validation
- ✅ Type inference
- ✅ API request/response validation
- ✅ Database schema validation

## Contributing

This is an active development project. Key areas for contribution:

1. **New Classifiers** - Add support for more transaction types
2. **Protocol Detection** - Expand known protocol coverage
3. **API Development** - Implement REST API endpoints
4. **Database Layer** - Add persistence with PostgreSQL
5. **Testing** - Add unit and integration tests

## License

MIT

## Acknowledgments

Built with:
- [Solana Kit](https://www.solanakit.com) - Modern Solana TypeScript SDK
- [Bun](https://bun.sh) - Fast all-in-one JavaScript runtime
- [Turborepo](https://turbo.build/repo) - High-performance build system
- [Zod](https://zod.dev) - TypeScript-first schema validation
