# Deployment Guide

Deploy the Solana Transaction Indexer API to Cloudflare Workers.

## Prerequisites

- [Cloudflare account](https://dash.cloudflare.com/sign-up)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) v4+
- Solana RPC URL (Helius, QuickNode, or public endpoint)

## Setup

### 1. Install Dependencies

```bash
cd apps/api
bun install
```

### 2. Configure Wrangler

The `wrangler.toml` is already configured. Update if needed:

```toml
name = "tx-indexer-api"
main = "src/index.ts"
compatibility_date = "2024-11-01"
compatibility_flags = ["nodejs_compat"]

[[kv_namespaces]]
binding = "CACHE"
id = "YOUR_KV_NAMESPACE_ID"  # Update this after creating KV
```

### 3. Create KV Namespace

```bash
# Create production KV namespace
bunx wrangler kv:namespace create CACHE

# Copy the ID from output and update wrangler.toml
```

The output will look like:
```
🌀 Creating namespace with title "tx-indexer-api-CACHE"
✨ Success!
Add the following to your configuration file in your kv_namespaces array:
{ binding = "CACHE", id = "abc123..." }
```

Update the `id` in `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "CACHE"
id = "abc123..."  # Your actual KV namespace ID
```

### 4. Set Environment Variables

Set your Solana RPC URL as a secret:

```bash
bunx wrangler secret put RPC_URL
```

When prompted, paste your RPC URL (e.g., Helius):
```
https://mainnet.helius-rpc.com/?api-key=YOUR_API_KEY
```

**Security Note:** Never commit your RPC URL or API keys to version control.

## Deploy

### Production Deployment

```bash
bun run deploy
```

This will:
1. Build your Worker
2. Upload to Cloudflare
3. Deploy to `https://tx-indexer-api.YOUR_SUBDOMAIN.workers.dev`

### Verify Deployment

```bash
# Test health endpoint
curl https://tx-indexer-api.YOUR_SUBDOMAIN.workers.dev/api/v1/health

# Expected response:
{
  "success": true,
  "data": {
    "status": "healthy",
    "rpc": {
      "status": "connected"
    }
  }
}
```

## Custom Domain (Optional)

### 1. Add Custom Domain

In [Cloudflare Dashboard](https://dash.cloudflare.com/):
1. Go to Workers & Pages > tx-indexer-api
2. Click "Triggers" tab
3. Add custom domain (e.g., `api.yourdomain.com`)

### 2. Update DNS

Cloudflare will automatically create the DNS record.

### 3. Test

```bash
curl https://api.yourdomain.com/api/v1/health
```

## Environment Management

### View Current Secrets

```bash
bunx wrangler secret list
```

### Update Secrets

```bash
# Update RPC URL
bunx wrangler secret put RPC_URL

# Delete a secret
bunx wrangler secret delete SECRET_NAME
```

## Monitoring

### View Logs

**Real-time logs:**
```bash
bunx wrangler tail
```

**Production logs:**
```bash
bunx wrangler tail --env production
```

### Cloudflare Dashboard

Monitor your Worker in the [Cloudflare Dashboard](https://dash.cloudflare.com/):
- **Analytics** - Requests, errors, CPU time
- **Real-time logs** - Request/response logs
- **Triggers** - Routes and custom domains

## Performance

### KV Cache TTL

Current cache settings (in code):
- Balance endpoint: 30 seconds
- Transactions list: 30 seconds
- Single transaction: 5 minutes (300 seconds)

### Optimize for Your Needs

To adjust cache TTL, edit the API route files:

```typescript
// apps/api/src/routes/wallet.ts
await c.env.CACHE.put(cacheKey, JSON.stringify(response), {
  expirationTtl: 60, // Change from 30 to 60 seconds
});
```

## Costs

Cloudflare Workers pricing:
- **Free tier:** 100,000 requests/day
- **Paid:** $5/month for 10M requests
- **KV:** First 100K reads/day free

For most applications, the free tier is sufficient.

## Troubleshooting

### "Module not found" errors

Make sure `nodejs_compat` is in `wrangler.toml`:
```toml
compatibility_flags = ["nodejs_compat"]
```

### RPC connection failures

Check your secret is set correctly:
```bash
bunx wrangler secret list
```

Should show:
```
RPC_URL
```

### KV errors

Verify KV namespace ID in `wrangler.toml` matches created namespace:
```bash
bunx wrangler kv:namespace list
```

### Build errors

```bash
# Clean and rebuild
rm -rf node_modules dist .wrangler
bun install
bun run deploy
```

## Rollback

### View Deployments

```bash
bunx wrangler deployments list
```

### Rollback to Previous Version

```bash
bunx wrangler rollback --message "Rolling back to stable version"
```

## CI/CD (GitHub Actions)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy API

on:
  push:
    branches: [main]
    paths:
      - 'apps/api/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: oven-sh/setup-bun@v1
      
      - name: Install dependencies
        run: |
          cd apps/api
          bun install
      
      - name: Deploy to Cloudflare Workers
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          workingDirectory: apps/api
```

**Setup:**
1. Get Cloudflare API token from [Dashboard](https://dash.cloudflare.com/profile/api-tokens)
2. Add as `CLOUDFLARE_API_TOKEN` secret in GitHub repo settings

## Security

### Rate Limiting

Consider adding rate limiting for production:

```typescript
// apps/api/src/index.ts
import { Ratelimit } from "@upstash/ratelimit";

const ratelimit = new Ratelimit({
  redis: c.env.REDIS,
  limiter: Ratelimit.slidingWindow(100, "1 m"),
});

app.use(async (c, next) => {
  const identifier = c.req.header("cf-connecting-ip") ?? "anonymous";
  const { success } = await ratelimit.limit(identifier);
  
  if (!success) {
    return c.json({ error: "Rate limit exceeded" }, 429);
  }
  
  await next();
});
```

### CORS Configuration

Current CORS settings allow all origins. For production, restrict to your domains:

```typescript
// apps/api/src/index.ts
app.use("/api/*", cors({
  origin: ["https://yourdomain.com", "https://app.yourdomain.com"],
  allowMethods: ["GET"],
}));
```

## Support

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Wrangler CLI Docs](https://developers.cloudflare.com/workers/wrangler/)
- [Cloudflare Community](https://community.cloudflare.com/)

---

**Next Steps:** [API Documentation](README.md)

