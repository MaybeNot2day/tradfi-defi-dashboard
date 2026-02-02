import { getDb } from "./db";
import type { Entity, Pair } from "@/data/pairs";
import type { EntityMetrics, PairComparison, HistoricalDataPoint, MetricType } from "@/types/metrics";

/**
 * Generate a UUID for database records.
 */
function generateId(): string {
  return crypto.randomUUID();
}

// ============================================================================
// Entity Operations
// ============================================================================

/**
 * Insert or update an entity.
 */
export async function upsertEntity(entity: Entity): Promise<void> {
  const db = getDb();

  await db.execute({
    sql: `
      INSERT INTO entities (id, name, type, category, ticker, coingecko_id, defillama_id, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        type = excluded.type,
        category = excluded.category,
        ticker = excluded.ticker,
        coingecko_id = excluded.coingecko_id,
        defillama_id = excluded.defillama_id,
        updated_at = datetime('now')
    `,
    args: [
      entity.id,
      entity.name,
      entity.type,
      entity.category,
      entity.ticker ?? null,
      entity.coingeckoId ?? null,
      entity.defiLlamaId ?? null,
    ],
  });
}

/**
 * Get an entity by ID.
 */
export async function getEntity(id: string): Promise<Entity | null> {
  const db = getDb();

  const result = await db.execute({
    sql: "SELECT * FROM entities WHERE id = ?",
    args: [id],
  });

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    id: row.id as string,
    name: row.name as string,
    type: row.type as "tradfi" | "defi",
    category: row.category as Entity["category"],
    ticker: row.ticker as string | undefined,
    coingeckoId: row.coingecko_id as string | undefined,
    defiLlamaId: row.defillama_id as string | undefined,
  };
}

// ============================================================================
// Pair Operations
// ============================================================================

/**
 * Insert or update a pair.
 */
export async function upsertPair(pair: Pair): Promise<void> {
  const db = getDb();

  await db.execute({
    sql: `
      INSERT INTO pairs (id, theme, tradfi_id, defi_id)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        theme = excluded.theme,
        tradfi_id = excluded.tradfi_id,
        defi_id = excluded.defi_id
    `,
    args: [pair.id, pair.theme, pair.tradfi.id, pair.defi.id],
  });
}

/**
 * Get all pairs with their entities.
 */
export async function getAllPairs(): Promise<
  Array<{ id: number; theme: string; tradfiId: string; defiId: string }>
> {
  const db = getDb();

  const result = await db.execute("SELECT id, theme, tradfi_id, defi_id FROM pairs ORDER BY id");

  return result.rows.map((row) => ({
    id: row.id as number,
    theme: row.theme as string,
    tradfiId: row.tradfi_id as string,
    defiId: row.defi_id as string,
  }));
}

// ============================================================================
// Snapshot Operations
// ============================================================================

/**
 * Insert a new snapshot.
 */
export async function insertSnapshot(
  entityId: string,
  capturedAt: Date,
  source: string,
  rawJson: string
): Promise<string> {
  const db = getDb();
  const id = generateId();

  await db.execute({
    sql: `
      INSERT INTO snapshots (id, entity_id, captured_at, source, raw_json)
      VALUES (?, ?, ?, ?, ?)
    `,
    args: [id, entityId, capturedAt.toISOString(), source, rawJson],
  });

  return id;
}

/**
 * Get the latest snapshot for an entity.
 */
export async function getLatestSnapshot(
  entityId: string
): Promise<{ id: string; capturedAt: string; source: string } | null> {
  const db = getDb();

  const result = await db.execute({
    sql: `
      SELECT id, captured_at, source
      FROM snapshots
      WHERE entity_id = ?
      ORDER BY captured_at DESC
      LIMIT 1
    `,
    args: [entityId],
  });

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    id: row.id as string,
    capturedAt: row.captured_at as string,
    source: row.source as string,
  };
}

// ============================================================================
// Metrics Operations
// ============================================================================

/**
 * Insert a metric for a snapshot.
 */
export async function insertMetric(
  snapshotId: string,
  metricType: MetricType,
  value: number | null
): Promise<string> {
  const db = getDb();
  const id = generateId();

  await db.execute({
    sql: `
      INSERT INTO metrics (id, snapshot_id, metric_type, value)
      VALUES (?, ?, ?, ?)
    `,
    args: [id, snapshotId, metricType, value],
  });

  return id;
}

/**
 * Batch insert metrics for a snapshot.
 */
export async function insertMetrics(
  snapshotId: string,
  metrics: Array<{ type: MetricType; value: number | null }>
): Promise<void> {
  for (const metric of metrics) {
    await insertMetric(snapshotId, metric.type, metric.value);
  }
}

/**
 * Get the latest metrics for an entity.
 */
export async function getLatestMetrics(entityId: string): Promise<EntityMetrics | null> {
  const db = getDb();

  const result = await db.execute({
    sql: `
      SELECT
        e.id as entity_id,
        e.name,
        e.type,
        e.category,
        s.captured_at,
        MAX(CASE WHEN m.metric_type = 'equity_value' THEN m.value END) as equity_value,
        MAX(CASE WHEN m.metric_type = 'revenue' THEN m.value END) as revenue,
        MAX(CASE WHEN m.metric_type = 'fees' THEN m.value END) as fees,
        MAX(CASE WHEN m.metric_type = 'pe_ratio' THEN m.value END) as pe_ratio,
        MAX(CASE WHEN m.metric_type = 'ps_ratio' THEN m.value END) as ps_ratio
      FROM entities e
      JOIN snapshots s ON s.entity_id = e.id
      JOIN metrics m ON m.snapshot_id = s.id
      WHERE e.id = ?
      AND s.captured_at = (
        SELECT MAX(captured_at) FROM snapshots WHERE entity_id = e.id
      )
      GROUP BY e.id, e.name, e.type, e.category, s.captured_at
    `,
    args: [entityId],
  });

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    entityId: row.entity_id as string,
    name: row.name as string,
    type: row.type as "tradfi" | "defi",
    category: row.category as string,
    capturedAt: new Date(row.captured_at as string),
    equityValue: row.equity_value as number | null,
    revenue: row.revenue as number | null,
    fees: row.fees as number | null,
    peRatio: row.pe_ratio as number | null,
    psRatio: row.ps_ratio as number | null,
  };
}

/**
 * Get all latest pair comparisons.
 */
export async function getAllPairComparisons(): Promise<PairComparison[]> {
  const pairs = await getAllPairs();
  const comparisons: PairComparison[] = [];

  for (const pair of pairs) {
    const [tradfiMetrics, defiMetrics] = await Promise.all([
      getLatestMetrics(pair.tradfiId),
      getLatestMetrics(pair.defiId),
    ]);

    if (tradfiMetrics && defiMetrics) {
      const peSpread =
        defiMetrics.peRatio !== null && tradfiMetrics.peRatio !== null
          ? defiMetrics.peRatio - tradfiMetrics.peRatio
          : null;

      const psSpread =
        defiMetrics.psRatio !== null && tradfiMetrics.psRatio !== null
          ? defiMetrics.psRatio - tradfiMetrics.psRatio
          : null;

      comparisons.push({
        pairId: pair.id,
        theme: pair.theme,
        tradfi: tradfiMetrics,
        defi: defiMetrics,
        peSpread,
        psSpread,
      });
    }
  }

  return comparisons;
}

/**
 * Get historical data for a metric.
 */
export async function getHistoricalMetrics(
  entityId: string,
  metricType: MetricType,
  limit: number = 52 // ~1 year of weekly data
): Promise<HistoricalDataPoint[]> {
  const db = getDb();

  const result = await db.execute({
    sql: `
      SELECT
        DATE(s.captured_at) as date,
        m.value
      FROM snapshots s
      JOIN metrics m ON m.snapshot_id = s.id
      WHERE s.entity_id = ?
      AND m.metric_type = ?
      AND m.value IS NOT NULL
      ORDER BY s.captured_at DESC
      LIMIT ?
    `,
    args: [entityId, metricType, limit],
  });

  return result.rows.map((row) => ({
    date: row.date as string,
    value: row.value as number,
  })).reverse(); // Return in chronological order
}

/**
 * Get the last update timestamp across all entities.
 */
export async function getLastUpdateTime(): Promise<string | null> {
  const db = getDb();

  const result = await db.execute(
    "SELECT MAX(captured_at) as last_update FROM snapshots"
  );

  if (result.rows.length === 0 || !result.rows[0].last_update) return null;

  return result.rows[0].last_update as string;
}
