# Phase 3: Data Fetcher & Scheduler - Complete

## Summary

Phase 3 implements the data ingestion pipeline that fetches metrics from external APIs (FMP, CoinGecko, DefiLlama) and stores them in the database.

## Completed Items

### 1. API Clients

**FMP Client (`src/lib/api/fmp.ts`)**
- Fetches TradFi data: market cap, TTM revenue, P/E and P/S ratios
- Endpoints used:
  - `/quote/{ticker}` - Current price and market cap
  - `/income-statement/{ticker}` - TTM revenue
  - `/key-metrics-ttm/{ticker}` - Pre-calculated ratios
- Requires `FMP_API_KEY` environment variable

**CoinGecko Client (`src/lib/api/coingecko.ts`)**
- Fetches DeFi token data: FDV, market cap, price, supply
- Rate limiting: 2.5s delay for free tier, 100ms for Pro
- Automatic retry on 429 (rate limit) responses
- Optional `COINGECKO_API_KEY` for higher limits

**DefiLlama Client (`src/lib/api/defillama.ts`)**
- Fetches DeFi protocol fees and revenue
- Keyless API (no authentication required)
- Data: 24h fees/revenue, 7d, 30d, all-time
- Annualization: `daily * 365`

### 2. Fetch Script (`scripts/fetchMetrics.ts`)

CLI tool for manual/automated data fetching:

```bash
# Live mode - fetches and stores data
npm run fetch:metrics

# Dry run - fetches but doesn't store
npm run fetch:metrics:dry

# Backfill with date override
npx tsx scripts/fetchMetrics.ts --date=2024-01-15
```

Features:
- Progress logging with P/E, P/S, and equity value
- Failure tracking and summary
- Alert webhook support (`ALERT_WEBHOOK_URL`)
- Non-zero exit on any failures (for CI/CD)

### 3. Vercel Cron Job

**Configuration (`vercel.json`)**
```json
{
  "crons": [
    {
      "path": "/api/cron/fetch-metrics",
      "schedule": "0 6 * * 1"
    }
  ]
}
```
- Runs every Monday at 6:00 AM UTC
- 5-minute max duration (`maxDuration: 300`)

**API Route (`src/app/api/cron/fetch-metrics/route.ts`)**
- GET handler for Vercel cron
- Optional `CRON_SECRET` for security
- Returns JSON with success/failure summary
- Sends alerts on failures

### 4. Metric Calculations

**TradFi (from FMP):**
- `equity_value` = market cap
- `revenue` = TTM revenue (trailing 12 months)
- `fees` = TTM revenue (proxy)
- `pe_ratio` = market cap / TTM net income
- `ps_ratio` = market cap / TTM revenue

**DeFi (from CoinGecko + DefiLlama):**
- `equity_value` = FDV (or market cap if FDV unavailable)
- `revenue` = daily revenue × 365
- `fees` = daily fees × 365
- `pe_ratio` = FDV / annualized revenue
- `ps_ratio` = FDV / annualized fees

## Environment Variables

```env
# Required
FMP_API_KEY=your_fmp_key

# Optional
COINGECKO_API_KEY=your_coingecko_pro_key
ALERT_WEBHOOK_URL=https://hooks.slack.com/...
CRON_SECRET=random_secret_for_cron_auth
```

## File Structure

```
src/lib/api/
├── fmp.ts           # TradFi data fetcher
├── coingecko.ts     # DeFi FDV fetcher
└── defillama.ts     # DeFi fees/revenue fetcher

src/app/api/cron/fetch-metrics/
└── route.ts         # Vercel cron handler

scripts/
└── fetchMetrics.ts  # CLI fetcher script

vercel.json          # Cron schedule config
```

## Output Example

```
============================================================
TradFi vs DeFi Metrics Fetcher
============================================================
Mode: LIVE
Date: 2024-01-15

Syncing entities and pairs...

Fetching metrics...

  Nasdaq                    OK  (EV: $42.0B, P/E: 6.5, P/S: 13.1)
  Uniswap                   OK  (EV: $8.5B, P/E: 10.6, P/S: 7.1)
  JPMorgan                  OK  (EV: $580.0B, P/E: 4.5, P/S: 12.9)
  ...

============================================================
Results: 20 succeeded, 0 failed
```

## Next Steps

Phase 4 will implement:
- REST API routes for frontend consumption
- `/api/latest` - Current metrics for all pairs
- `/api/history` - Time series for charts
- `/api/pairs` - Pair metadata with metrics
