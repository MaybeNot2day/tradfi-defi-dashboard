## Overview

This project delivers a weekly-updated dashboard that compares flagship TradFi institutions with their DeFi counterparts across matched categories (e.g., Nasdaq vs Uniswap, JPMorgan vs Aave). The dashboard emphasizes three primary metrics:

- **P/E Ratio (Price-to-Earnings)** — Measures value relative to earnings/revenue retained
  - TradFi: `Market Cap ÷ TTM Net Income` (sourced directly from FMP)
  - DeFi: `FDV ÷ Annualized Protocol Revenue` where revenue = `dailyRevenue × 365`
  - *Note: For protocols where 100% of fees go to LPs (like Uniswap V2/V3), Protocol Revenue is 0, making P/E undefined. This accurately reflects that the token does not currently capture cash flow.*

- **P/S Ratio (Price-to-Sales)** — Measures value relative to total demand for the service
  - TradFi: `Market Cap ÷ TTM Revenue` (sourced directly from FMP)
  - DeFi: `FDV ÷ Annualized Total Fees` where fees = `dailyFees × 365`

- **Equity Value Comparison**
  - TradFi: Market Capitalization
  - DeFi: Fully Diluted Valuation (FDV)

Weekly snapshots of all metrics are ingested, stored inside SQLite for historical analysis, then surfaced through a Next.js web application with a dark, modern visual language inspired by TokenTerminal/Bloomberg.

## Data Sources

| Layer | Source | Purpose | Key Fields |
| --- | --- | --- | --- |
| TradFi fundamentals | Financial Modeling Prep (FMP) API `/stable/*` | Market cap, revenue, P/E, P/S per ticker | `marketCap`, `ttmRevenue`, `peRatio`, `psRatio` |
| DeFi token economics | CoinGecko API | Fully diluted valuation (FDV) for DeFi protocols | `fully_diluted_valuation` |
| DeFi fees | DefiLlama API `/summary/fees/{protocol}?dataType=dailyFees` | Daily total fees (for P/S) | `total24h` |
| DeFi revenue | DefiLlama API `/summary/fees/{protocol}?dataType=dailyRevenue` | Daily protocol revenue (for P/E) | `total24h` |
| Metadata | Static TypeScript module (`src/data/pairs.ts`) | Pair definitions, entity IDs, API identifiers | `ticker`, `coingeckoId`, `defiLlamaId` |

All fetches normalize to USD and capture the timestamp, source endpoint, and raw payload (useful for debugging).

**DeFi Fees vs Revenue:**
- **Fees** (`dataType=dailyFees`): Total fees paid by users to use the protocol
- **Revenue** (`dataType=dailyRevenue`): Portion of fees retained by the protocol/token holders (after LP distributions, etc.)

For protocols like Uniswap where 100% of fees go to LPs, revenue is ~0 and P/E will be null/undefined.

## Pairs Catalog

| # | Theme | TradFi (id) | Category | DeFi (id) | Category |
| --- | --- | --- | --- | --- | --- |
| 1 | The DEX Giants | Nasdaq (`NDAQ`) | Exchange | Uniswap (`uniswap`) | Exchange |
| 2 | The Banking Titans | JPMorgan (`JPM`) | Bank | Aave (`aave`) | Lending |
| 3 | The Asset Managers | BlackRock (`BLK`) | Asset Mgmt | Lido (`lido`) | Liquid Staking |
| 4 | Tokenized Asset Managers | Apollo Global (`APO`) | Alt Asset Mgmt | Ondo Finance (`ondo-finance`) | RWA/Tokenization |
| 5 | The Pro Perp Venues | Interactive Brokers (`IBKR`) | Brokerage | Hyperliquid (`hyperliquid`) | Perps DEX |
| 6 | The Issuers | State Street (`STT`) | Custody/Bank | Sky (Maker) (`makerdao`) | Stablecoin Issuer |
| 7 | Derivatives Marketplaces | CME Group (`CME`) | Derivatives | GMX (`gmx`) | Perps DEX |
| 8 | Fixed Income Markets | Tradeweb (`TW`) | Rates Trading | Curve (`curve-dex`) | Stable Swap |
| 9 | Yield Traders | MarketAxess (`MKTX`) | Bond Trading | Pendle (`pendle`) | Yield Trading |
| 10 | The Aggregators | Cboe Global (`CBOE`) | Options Exchange | Jupiter (`jupiter`) | DEX Aggregator |

## System Components

### 1. Scheduled Data Ingestion

- **Node.js fetcher script** (lives in repo) orchestrates API calls for all 20 entities.
- **Execution:** run via Vercel Cron or GitHub Actions once per week; manual CLI trigger available for local testing.
- **Flow:** resolve pair → fetch TradFi metrics from FMP or DeFi metrics from CoinGecko + DefiLlama (keyless API) → compute derived values → batch insert into the managed SQLite database (Turso).
- **Resilience:** retry logic, logging per pair, optional Slack/email alert on failure.

### 2. Data Normalization & Metrics Engine

- All values normalized to USD (APIs return USD-denominated data).
- Derived metric calculations:

**TradFi (from FMP):**
| Metric | Formula | Source |
| --- | --- | --- |
| Equity Value | `marketCap` | FMP quote endpoint |
| Revenue | `ttmRevenue` | FMP income statement |
| P/E Ratio | `marketCap / ttmNetIncome` | FMP key-metrics-ttm |
| P/S Ratio | `marketCap / ttmRevenue` | FMP key-metrics-ttm |

**DeFi (from CoinGecko + DefiLlama):**
| Metric | Formula | Source |
| --- | --- | --- |
| Equity Value | `fdv` (or `marketCap` fallback) | CoinGecko |
| Revenue | `dailyRevenue × 365` | DefiLlama (`dataType=dailyRevenue`) |
| Fees | `dailyFees × 365` | DefiLlama (`dataType=dailyFees`) |
| P/E Ratio | `fdv / annualizedRevenue` | Calculated (null if revenue = 0) |
| P/S Ratio | `fdv / annualizedFees` | Calculated |

**Key Distinction:**
- P/E uses **Protocol Revenue** (what the protocol/token captures)
- P/S uses **Total Fees** (what users pay, measures demand)
- When revenue = 0 (e.g., Uniswap), P/E is null — token doesn't capture cash flow

**Protocol-Specific Adjustments:**
- **GMX**: Revenue multiplied by 0.30 (DefiLlama reports ~100% of fees as revenue, but protocol only captures ~30%)
- **Sky (Maker)**: Uses SKY token FDV (MKR token migrated to SKY)

- Persist raw API responses plus derived metrics for auditability.

### 3. Storage Layer (Managed SQLite)

- Primary datastore: Turso (remote SQLite) so both Vercel serverless functions and cron jobs have read/write access despite the read-only filesystem constraint.
- Tables:
  - `pairs(id, tradfi_id, defi_id, category, display_name)`
  - `entities(id, name, type, category, metadata)`
  - `snapshots(id, entity_id, captured_at, source, raw_json)`
  - `metrics(id, snapshot_id, metric_type, value)`
- Compound indexes on `(entity_id, captured_at)` and `(metric_type, captured_at)` to speed up history queries.
- Optional fallback: GitHub Actions workflow that writes to a local SQLite file and commits it for archival, but Turso remains the canonical live database.

### 4. API & Backend Interface

- Next.js API routes (or dedicated FastAPI if separation required) expose:
  - `GET /api/latest?category=Exchange` → latest metrics for each pair.
  - `GET /api/history?entity=uniswap&metric=pe` → time series.
  - `GET /api/pairs` → metadata with latest snapshot joined in.
- API responses include metadata like last updated timestamp and data source badges.
- Server-side rendering functions (`getStaticProps` with ISR) fetch from SQLite to pre-render pages while still allowing incremental updates.

### 5. Frontend Application (Next.js)

- **Structure:** Landing overview → Category tabs (Exchanges, Lending, etc.) → Pair deep-dive modals/pages → Historical insights section.
- **Components:**
  - Comparison tables with inline FDV vs market cap bars and P/E, P/S columns.
  - Scatter plot (P/E vs P/S) using Recharts/ECharts with TradFi vs DeFi colors.
  - Trend charts showing historical P/E/P/S (line + area) per pair.
  - Slope graphs linking TradFi to DeFi partner for spreads.
  - Update banner, tooltips with metric explanations.
- **Design:** dark palette (charcoal background), neon accent for DeFi, muted cyan for TradFi, glassmorphism cards, responsive grid layout.

### 6. Tooling & Operations

- **Testing:** unit tests for metric computations, integration tests for API routes, component tests for critical UI pieces.
- **CI/CD:** GitHub Actions for lint/type-check/test on pull requests; deploy to Vercel with environment secrets (API keys).
- **Monitoring:** cron job logs stored centrally; optional simple uptime check on API routes. Add alert if weekly run fails.

## Data Flow Summary

1. Scheduler triggers the Node fetcher weekly.
2. Fetcher queries FMP, CoinGecko, and DefiLlama, transforms responses, and stores raw + derived data into Turso (managed SQLite).
3. Next.js API routes read from Turso to serve latest/historical data.
4. Frontend pages render precomputed data (via SSG/ISR) and enhance interactivity client-side (charts, tooltips).
5. Users interact with the dashboard to compare P/E, P/S, and equity values across matched TradFi/DeFi pairs, backed by historical trends.
