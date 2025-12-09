import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Bindings } from "./types";
import { error } from "./lib/response";
import health from "./routes/health";
import wallet from "./routes/wallet";
import transactions from "./routes/transactions";
import transaction from "./routes/transaction";

const app = new Hono<{ Bindings: Bindings }>();

app.use(
  "/api/*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "X-API-Key"],
    maxAge: 600,
    credentials: false,
  })
);

app.onError((err, c) => {
  console.error("Error:", err);

  if (err.message.includes("RPC") || err.message.includes("fetch")) {
    return c.json(error("RPC_ERROR", "Failed to connect to Solana RPC"), 503);
  }

  if (err.name === "ZodError") {
    return c.json(error("VALIDATION_ERROR", err.message), 400);
  }

  return c.json(error("INTERNAL_ERROR", "Internal server error"), 500);
});

app.get("/", (c) => {
  return c.json({
    name: "Solana Transaction Indexer API",
    version: "1.0.0",
    endpoints: [
      {
        path: "/api/v1/health",
        method: "GET",
        description: "Health check and RPC connectivity status",
      },
      {
        path: "/api/v1/wallet/:address/balance",
        method: "GET",
        description: "Get wallet SOL and token balances",
        params: {
          address: "Wallet address (base58)",
        },
      },
      {
        path: "/api/v1/wallet/:address/transactions",
        method: "GET",
        description: "Get wallet transaction history with pagination",
        params: {
          address: "Wallet address (base58)",
        },
        query: {
          limit: "Number of transactions (1-100, default: 10)",
          before: "Cursor for pagination (transaction signature)",
        },
      },
      {
        path: "/api/v1/transaction/:signature",
        method: "GET",
        description: "Get single transaction details with accounting",
        params: {
          signature: "Transaction signature (base58, 88 chars)",
        },
      },
    ],
    documentation: "https://github.com/yourusername/tx-indexer",
  });
});

app.route("/api/v1/health", health);
app.route("/api/v1/wallet", wallet);
app.route("/api/v1/wallet", transactions);
app.route("/api/v1/transaction", transaction);

export default app;

