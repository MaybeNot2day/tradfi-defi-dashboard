/**
 * Metrics type definitions for the dashboard
 */

export type MetricType = "pe_ratio" | "ps_ratio" | "equity_value" | "revenue" | "fees";

export interface Snapshot {
  id: string;
  entityId: string;
  capturedAt: Date;
  source: string;
  rawJson: string;
}

export interface Metric {
  id: string;
  snapshotId: string;
  metricType: MetricType;
  value: number;
}

export interface EntityMetrics {
  entityId: string;
  name: string;
  type: "tradfi" | "defi";
  category: string;
  capturedAt: Date;
  equityValue: number | null;
  revenue: number | null;
  fees: number | null;
  peRatio: number | null;
  psRatio: number | null;
}

export interface PairComparison {
  pairId: number;
  theme: string;
  tradfi: EntityMetrics;
  defi: EntityMetrics;
  peSpread: number | null; // DeFi P/E - TradFi P/E
  psSpread: number | null; // DeFi P/S - TradFi P/S
}

export interface HistoricalDataPoint {
  date: string;
  value: number;
}

export interface HistoricalSeries {
  entityId: string;
  metricType: MetricType;
  data: HistoricalDataPoint[];
}

/** API response types */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  lastUpdated?: string;
}

export interface LatestMetricsResponse {
  pairs: PairComparison[];
  lastUpdated: string;
}

export interface HistoryResponse {
  series: HistoricalSeries;
  lastUpdated: string;
}
