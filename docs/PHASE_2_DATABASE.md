# Phase 2: Database & Schema - Complete

## Summary

Phase 2 implements the data persistence layer using libSQL (Turso-compatible SQLite) with a clean repository pattern for database operations.

## Completed Items

### 1. Database Client (`src/lib/db.ts`)
- Singleton pattern for connection management
- Supports Turso (remote) and local SQLite file
- Environment-based configuration:
  - `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` for production
  - `file:local.db` fallback for development

### 2. Schema Definition (`src/lib/schema.ts`)
Four core tables:

```sql
entities (id, name, type, category, ticker, coingecko_id, defillama_id, timestamps)
pairs (id, theme, tradfi_id, defi_id, created_at)
snapshots (id, entity_id, captured_at, source, raw_json, created_at)
metrics (id, snapshot_id, metric_type, value, created_at)
```

Indexes:
- `idx_snapshots_entity_captured` - Fast latest snapshot queries
- `idx_metrics_snapshot` - Join metrics to snapshots
- `idx_metrics_type_snapshot` - Filter by metric type
- `idx_entities_type` - Filter TradFi vs DeFi

### 3. Repository Layer (`src/lib/repository.ts`)
Clean data access functions:

**Entity Operations:**
- `upsertEntity(entity)` - Insert or update entity
- `getEntity(id)` - Get entity by ID

**Pair Operations:**
- `upsertPair(pair)` - Insert or update pair
- `getAllPairs()` - List all pairs

**Snapshot Operations:**
- `insertSnapshot(entityId, capturedAt, source, rawJson)` - Create snapshot
- `getLatestSnapshot(entityId)` - Get most recent snapshot

**Metrics Operations:**
- `insertMetric(snapshotId, metricType, value)` - Insert single metric
- `insertMetrics(snapshotId, metrics[])` - Batch insert
- `getLatestMetrics(entityId)` - Get current metrics for entity
- `getAllPairComparisons()` - Get all pairs with their latest metrics
- `getHistoricalMetrics(entityId, metricType, limit)` - Time series data
- `getLastUpdateTime()` - Global last update timestamp

### 4. Seeding Script (`scripts/seed.ts`)
Command-line tool for database initialization:

```bash
npm run db:seed        # Seed entities and pairs only
npm run db:seed:mock   # Add mock metrics for development
npm run db:reset       # Drop tables, reseed with mock data
```

Features:
- Idempotent (safe to run multiple times)
- Mock data generator with realistic P/E and P/S values
- Progress logging

## Mock Data Summary

| Entity | Type | P/E | P/S |
|--------|------|-----|-----|
| Nasdaq | TradFi | 6.5 | 13.1 |
| Uniswap | DeFi | 10.6 | 7.1 |
| JPMorgan | TradFi | 4.5 | 12.9 |
| Aave | DeFi | 12.8 | 8.0 |
| ... | ... | ... | ... |

## File Structure

```
src/lib/
├── db.ts          # Database client singleton
├── schema.ts      # Schema definition + init
└── repository.ts  # Data access layer

scripts/
└── seed.ts        # Database seeding CLI
```

## Usage

```typescript
import { getDb, closeDb } from "@/lib/db";
import { initializeSchema } from "@/lib/schema";
import { getLatestMetrics, getAllPairComparisons } from "@/lib/repository";

// Initialize
await initializeSchema();

// Query
const metrics = await getLatestMetrics("uniswap");
const pairs = await getAllPairComparisons();

// Cleanup
closeDb();
```

## Verification

```bash
npm run db:seed:mock
# Creates local.db with all entities, pairs, and mock metrics
```

## Next Steps

Phase 3 will implement:
- Real data fetching from FMP, CoinGecko, and DefiLlama APIs
- Metric calculation logic (annualization, P/E, P/S)
- Scheduled execution (cron) with error handling
