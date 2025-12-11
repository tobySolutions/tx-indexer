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
  rpcUrl: "https://api.mainnet-beta.solana.com" 
});

// Get wallet balance
const balance = await indexer.getBalance("YourWalletAddress...");

// Get classified transactions
const txs = await indexer.getTransactions("YourWalletAddress...", {
  limit: 10,
  filterSpam: true
});

// Get single transaction
const tx = await indexer.getTransaction("signature...", "walletAddress...");
```

## Bundle Size

The SDK is lightweight and tree-shakeable:

| Import | Size (minified + brotli) |
|--------|----------|
| Full SDK | ~20 KB |
| `createIndexer` only | ~20 KB |
| `classifyTransaction` | ~3 KB |
| `fetchTransaction` | ~4 KB |
| `transactionToLegs` | ~4 KB |

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

## License

MIT

