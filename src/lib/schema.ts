import { getDb } from "./db";

/**
 * Database schema definition.
 * Tables:
 * - entities: All TradFi and DeFi entities
 * - pairs: Relationship between TradFi and DeFi entities
 * - snapshots: Raw data captures with timestamps
 * - metrics: Derived metrics linked to snapshots
 */

export const SCHEMA_SQL = `
-- Entities table: stores all TradFi and DeFi entities
CREATE TABLE IF NOT EXISTS entities (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('tradfi', 'defi')),
  category TEXT NOT NULL,
  ticker TEXT,
  coingecko_id TEXT,
  defillama_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Pairs table: links TradFi to DeFi entities
CREATE TABLE IF NOT EXISTS pairs (
  id INTEGER PRIMARY KEY,
  theme TEXT NOT NULL,
  tradfi_id TEXT NOT NULL REFERENCES entities(id),
  defi_id TEXT NOT NULL REFERENCES entities(id),
  created_at TEXT DEFAULT (datetime('now'))
);

-- Snapshots table: raw API responses with timestamps
CREATE TABLE IF NOT EXISTS snapshots (
  id TEXT PRIMARY KEY,
  entity_id TEXT NOT NULL REFERENCES entities(id),
  captured_at TEXT NOT NULL,
  source TEXT NOT NULL,
  raw_json TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Metrics table: derived metrics from snapshots
CREATE TABLE IF NOT EXISTS metrics (
  id TEXT PRIMARY KEY,
  snapshot_id TEXT NOT NULL REFERENCES snapshots(id),
  metric_type TEXT NOT NULL CHECK (metric_type IN ('equity_value', 'revenue', 'fees', 'pe_ratio', 'ps_ratio')),
  value REAL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_snapshots_entity_captured ON snapshots(entity_id, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_metrics_snapshot ON metrics(snapshot_id);
CREATE INDEX IF NOT EXISTS idx_metrics_type_snapshot ON metrics(metric_type, snapshot_id);
CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(type);
`;

/**
 * Initialize the database schema.
 * Safe to run multiple times (uses IF NOT EXISTS).
 */
export async function initializeSchema(): Promise<void> {
  const db = getDb();

  // Split and execute each statement
  const statements = SCHEMA_SQL.split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const statement of statements) {
    await db.execute(statement);
  }

  console.log("Database schema initialized successfully");
}

/**
 * Drop all tables (for testing/reset purposes).
 */
export async function dropAllTables(): Promise<void> {
  const db = getDb();

  await db.execute("DROP TABLE IF EXISTS metrics");
  await db.execute("DROP TABLE IF EXISTS snapshots");
  await db.execute("DROP TABLE IF EXISTS pairs");
  await db.execute("DROP TABLE IF EXISTS entities");

  console.log("All tables dropped");
}
