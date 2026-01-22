## Implementation Plan

### Phase 1 – Project Bootstrap
1. Create Next.js (App Router) project with TypeScript, ESLint, Prettier, and testing setup (Vitest/Jest + React Testing Library).  
2. Add Tailwind CSS (or styled-components) with custom dark theme tokens (colors, typography scale).  
3. Store the `PAIRS` metadata list inside `data/pairs.ts` for reuse across backend and frontend.  
4. Configure environment variables for FMP and CoinGecko (if using Pro tier) via `.env.local` and the Vercel dashboard—DefiLlama is keyless.

### Phase 2 – Database & Schema
5. Add SQLite using Prisma + Turso/libSQL so both cron jobs and serverless functions can read/write. Define tables: `entities`, `pairs`, `snapshots`, `metrics`.  
6. Create migration or schema file plus seeding script that inserts the 10 pair definitions and mock metrics for local dev.  
7. Implement a lightweight repository layer (TypeScript module) that wraps common queries (latest metrics, historical series).

### Phase 3 – Data Fetcher & Scheduler
8. Build `scripts/fetchMetrics.ts` that:
   - Iterates through all entities.  
   - Fetches market cap/revenue data from FMP for TradFi tickers.  
   - Fetches FDV from CoinGecko and daily revenue/fees from DefiLlama (`fees/{protocol}`) for DeFi names.  
   - Normalizes values, computes annualized revenue/fees (DeFi uses daily × 365, TradFi uses TTM revenue from FMP), and derives P/E & P/S.  
   - Writes data to Turso (insert snapshot + metrics).  
   - Logs failures and exits non-zero on unrecoverable errors.
9. Add CLI options for backfilling historical data (date override) and `--dry-run` for debugging.  
10. Wire Vercel Cron (or GitHub Action) to run the script weekly; provide documentation for manual execution (`pnpm fetch:metrics`).

### Phase 4 – API Layer
11. Create Next.js API routes:
    - `GET /api/latest` returns latest metrics per entity/pair with optional category filter.  
    - `GET /api/history` returns time series for a given entity + metric type.  
    - `GET /api/pairs` returns metadata + latest snapshot for building tables.  
12. Implement caching (in-memory or revalidation headers) to avoid hammering SQLite on every request.  
13. Add validation middleware (zod) for query params and consistent error responses.

### Phase 5 – Frontend Features
14. Design layout:
    - Hero section with overview stats and last updated timestamp.  
    - Tabs (Exchanges, Lending, etc.) each showing comparison tables for relevant pairs.  
15. Build reusable UI components:
    - `PairTable` with FDV vs market cap bars, P/E/P/S columns, and deltas.  
    - `ScatterChart` (P/E vs P/S) highlighting TradFi vs DeFi.  
    - `TrendChart` for historical lines; `SlopeGraph` for spreads.  
16. Implement pair detail modal/page with deeper charts, data source badges, and narrative copy for each pairing.  
17. Add responsive behavior and keyboard navigation for accessibility.

### Phase 6 – Styling & UX Polish
18. Finalize dark theme tokens, gradients, and glassmorphism cards referencing TokenTerminal/Bloomberg moodboard.  
19. Add tooltips explaining metrics and badges for “TradFi” / “DeFi” / category.  
20. Integrate micro-interactions (hover highlights, subtle animations) and ensure charts adapt to dark backgrounds.  
21. Display data provenance + “Last updated” indicator on top of every view.

### Phase 7 – Testing & Quality
22. Write unit tests for metric calculation utilities using mocked API responses.  
23. Add integration tests for API routes (using Next.js test utilities + an in-memory SQLite/libSQL instance).  
24. Create component tests/snapshots for critical UI (tables, charts).  
25. Configure CI workflow (GitHub Actions) running lint, type-check, tests, and fetcher dry-run.

### Phase 8 – Deployment & Ops
26. Deploy Next.js app to Vercel with ISR for data pages; provision Turso and point Prisma/libSQL client at it for canonical storage (GitHub Actions backup optional).  
27. Schedule cron job on Vercel or GitHub Actions pointing to the fetch script, with logging + alert hook (email/Discord) on failure.  
28. Document runbooks (`docs/runbook.md`) that describe how to trigger manual refresh, inspect SQLite data, and add a new pair.
