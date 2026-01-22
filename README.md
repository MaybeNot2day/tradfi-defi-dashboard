# TradFi vs DeFi Dashboard

A weekly-updated dashboard comparing flagship TradFi institutions with their DeFi counterparts across P/E, P/S, and equity value metrics.

## Features

- **10 Comparison Pairs**: Nasdaq vs Uniswap, JPMorgan vs Aave, BlackRock vs Lido, and more
- **Key Metrics**: P/E Ratio, P/S Ratio, Equity Value (Market Cap / FDV)
- **Data Sources**: FMP (TradFi), CoinGecko (DeFi FDV), DefiLlama (DeFi fees/revenue)
- **Visualizations**: Comparison tables, scatter plots, trend charts
- **Dark Theme**: Bloomberg/TokenTerminal-inspired design

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Add your FMP_API_KEY to .env.local

# Seed database with mock data (for development)
npm run db:seed:mock

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the dashboard.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `FMP_API_KEY` | Yes | Financial Modeling Prep API key |
| `TURSO_DATABASE_URL` | Production | Turso database URL |
| `TURSO_AUTH_TOKEN` | Production | Turso auth token |
| `COINGECKO_API_KEY` | No | CoinGecko Pro API key (optional) |
| `CRON_SECRET` | No | Secret for cron endpoint auth |
| `ALERT_WEBHOOK_URL` | No | Webhook for failure alerts |

## Scripts

```bash
# Development
npm run dev           # Start dev server
npm run build         # Production build
npm run start         # Start production server

# Database
npm run db:seed       # Seed entities and pairs
npm run db:seed:mock  # Seed with mock metrics
npm run db:reset      # Drop and reseed

# Data Fetching
npm run fetch:metrics      # Fetch real data
npm run fetch:metrics:dry  # Dry run (no writes)

# Quality
npm run lint          # ESLint
npm run typecheck     # TypeScript check
npm run test          # Run tests (watch)
npm run test:run      # Run tests once
```

## Project Structure

```
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── api/            # API routes
│   │   │   ├── latest/     # GET /api/latest
│   │   │   ├── history/    # GET /api/history
│   │   │   ├── pairs/      # GET /api/pairs
│   │   │   └── cron/       # Cron job endpoint
│   │   ├── page.tsx        # Home page
│   │   └── Dashboard.tsx   # Dashboard component
│   ├── components/          # UI components
│   ├── data/               # Static data (pairs catalog)
│   ├── lib/                # Utilities and API clients
│   │   ├── api/           # External API clients
│   │   ├── db.ts          # Database connection
│   │   ├── schema.ts      # Database schema
│   │   └── repository.ts  # Data access layer
│   └── types/              # TypeScript types
├── scripts/
│   ├── seed.ts            # Database seeding
│   └── fetchMetrics.ts    # Data fetcher CLI
├── docs/                   # Documentation
└── .github/workflows/      # CI/CD
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/latest` | Latest metrics for all pairs |
| `GET /api/latest?category=Exchange` | Filter by category |
| `GET /api/history?entity=uniswap&metric=pe_ratio` | Historical data |
| `GET /api/pairs` | Pair metadata with metrics |
| `GET /api/pairs?id=1` | Single pair details |

## Comparison Pairs

| # | Theme | TradFi | DeFi |
|---|-------|--------|------|
| 1 | The DEX Giants | Nasdaq | Uniswap |
| 2 | The Banking Titans | JPMorgan | Aave |
| 3 | The Asset Managers | BlackRock | Lido |
| 4 | Tokenized Asset Managers | Apollo Global | Ondo Finance |
| 5 | The Pro Perp Venues | Interactive Brokers | Hyperliquid |
| 6 | The Issuers | State Street | Sky (Maker) |
| 7 | Derivatives Marketplaces | CME Group | GMX |
| 8 | Fixed Income Markets | Tradeweb | Curve |
| 9 | Yield Traders | MarketAxess | Pendle |
| 10 | The Exotics | Cboe Global | Synthetix |

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: SQLite via Turso (libSQL)
- **Charts**: Recharts
- **Testing**: Vitest + Testing Library
- **Deployment**: Vercel

## Documentation

- [Architecture](./architecture.md) - System design and data flow
- [Implementation](./implementation.md) - Phase-by-phase implementation plan
- [Runbook](./docs/runbook.md) - Operational guide

## License

MIT
