# Operational Runbook

## Overview

This document covers common operational tasks for the TradFi vs DeFi Dashboard.

## Environment Setup

### Required Environment Variables

```env
# Required for data fetching
FMP_API_KEY=your_fmp_api_key

# Required for production database
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your_turso_token

# Optional
COINGECKO_API_KEY=your_coingecko_pro_key
CRON_SECRET=random_secret_for_cron_auth
ALERT_WEBHOOK_URL=https://hooks.slack.com/...
```

### Local Development

```bash
# Copy example env file
cp .env.example .env.local

# Add your FMP API key to .env.local
# Get one at: https://site.financialmodelingprep.com/developer/docs

# Install dependencies
npm install

# Initialize database with mock data
npm run db:seed:mock

# Start development server
npm run dev
```

## Database Operations

### Initialize/Reset Database

```bash
# Seed entities and pairs only
npm run db:seed

# Seed with mock metrics data
npm run db:seed:mock

# Drop all tables and reseed with mock data
npm run db:reset
```

### Inspect Database (Local)

```bash
# Open SQLite CLI
sqlite3 local.db

# Common queries
.tables
SELECT * FROM entities;
SELECT * FROM pairs;
SELECT * FROM snapshots ORDER BY captured_at DESC LIMIT 5;
SELECT e.name, m.metric_type, m.value
FROM metrics m
JOIN snapshots s ON m.snapshot_id = s.id
JOIN entities e ON s.entity_id = e.id
ORDER BY s.captured_at DESC LIMIT 20;
```

### Turso Database (Production)

```bash
# Install Turso CLI
brew install tursodatabase/tap/turso

# Login
turso auth login

# Connect to database
turso db shell your-database-name

# Or use libSQL URL directly
```

## Data Fetching

### Manual Fetch

```bash
# Fetch real data (requires FMP_API_KEY)
npm run fetch:metrics

# Dry run (no database writes)
npm run fetch:metrics:dry

# Backfill specific date
npx tsx scripts/fetchMetrics.ts --date=2024-01-15
```

### Cron Job (Vercel)

The cron job runs weekly on Mondays at 6:00 AM UTC.

**Trigger manually:**
```bash
curl -X GET "https://your-app.vercel.app/api/cron/fetch-metrics" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

**Check cron logs:**
- Vercel Dashboard → Project → Logs → Filter by `/api/cron`

### Troubleshooting Fetch Failures

1. **FMP API errors:**
   - Check API key validity at [FMP Dashboard](https://site.financialmodelingprep.com/)
   - Verify ticker symbols are correct
   - Check rate limits (250 requests/day on free tier)

2. **CoinGecko rate limits:**
   - Free tier: ~10-30 calls/minute
   - Add `COINGECKO_API_KEY` for higher limits
   - Script auto-retries on 429 errors

3. **DefiLlama issues:**
   - Check protocol slug at [DefiLlama](https://defillama.com/)
   - API is keyless, no auth issues

## Adding a New Pair

1. **Update pairs metadata** (`src/data/pairs.ts`):
```typescript
{
  id: 11,
  theme: "New Category",
  tradfi: {
    id: "new-tradfi",
    name: "New TradFi",
    type: "tradfi",
    category: "Category",
    ticker: "TICK",
  },
  defi: {
    id: "new-defi",
    name: "New DeFi",
    type: "defi",
    category: "Category",
    coingeckoId: "new-defi-token",
    defiLlamaId: "new-defi-protocol",
  },
}
```

2. **Verify IDs:**
   - FMP ticker: Search at [FMP](https://site.financialmodelingprep.com/)
   - CoinGecko ID: Check URL at [CoinGecko](https://www.coingecko.com/)
   - DefiLlama ID: Check [DefiLlama Fees](https://defillama.com/fees)

3. **Reseed database:**
```bash
npm run db:seed
```

4. **Test fetch:**
```bash
npm run fetch:metrics:dry
```

## Deployment

### Vercel Deployment

1. **Initial setup:**
   - Connect GitHub repo to Vercel
   - Add environment variables in Vercel dashboard
   - Deploy

2. **Environment variables to add:**
   - `FMP_API_KEY`
   - `TURSO_DATABASE_URL`
   - `TURSO_AUTH_TOKEN`
   - `CRON_SECRET` (for cron auth)

3. **Verify deployment:**
   - Check build logs
   - Test API endpoints
   - Verify cron job schedule

### Manual Redeployment

```bash
# Via Vercel CLI
vercel --prod

# Or trigger via GitHub push to main
git push origin main
```

## Monitoring

### Health Checks

```bash
# API health
curl https://your-app.vercel.app/api/latest

# Check last update time
curl https://your-app.vercel.app/api/pairs | jq '.data.lastUpdated'
```

### Alert Configuration

Set `ALERT_WEBHOOK_URL` to receive notifications on:
- Fetch failures
- Missing data for entities
- API errors

**Slack webhook example:**
```
ALERT_WEBHOOK_URL=https://hooks.slack.com/services/T00/B00/xxx
```

## Common Issues

### "No data available" on dashboard

1. Check if database has data:
```bash
npm run db:seed:mock  # For development
```

2. Or run fetcher with real API keys:
```bash
npm run fetch:metrics
```

### Build failures

```bash
# Check TypeScript errors
npm run typecheck

# Check lint errors
npm run lint

# Run tests
npm run test:run
```

### Stale data

1. Check last update time in dashboard header
2. Verify cron job is running (Vercel logs)
3. Trigger manual fetch if needed

## Support

- **Issues:** https://github.com/your-repo/issues
- **Logs:** Vercel Dashboard → Logs
- **Database:** Turso Dashboard
