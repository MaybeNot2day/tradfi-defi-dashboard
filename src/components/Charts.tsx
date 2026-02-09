"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Area,
  AreaChart,
  Legend,
  ReferenceLine,
  Cell,
  ScatterChart,
  Scatter,
  ZAxis,
} from "recharts";
import type { PairComparison, HistoricalDataPoint, PairHistoricalData } from "@/types/metrics";

// Chart colors from CSS variables
const COLORS = {
  tradfi: "#00b4d8",
  defi: "#00ff88",
  grid: "#2a2a30",
  text: "#a0a0a0",
  positive: "#22c55e",
  negative: "#ef4444",
};

interface DivergingBarChartProps {
  pairs: PairComparison[];
}

export function PESpreadChart({ pairs }: DivergingBarChartProps) {
  // Filter pairs with valid spread data and sort by spread value
  const chartData = pairs
    .filter((p) => p.peSpread != null)
    .map((p) => ({
      name: p.theme,
      tradfiName: p.tradfi.name,
      defiName: p.defi.name,
      spread: p.peSpread,
      tradfiPE: p.tradfi.peRatio,
      defiPE: p.defi.peRatio,
    }))
    .sort((a, b) => (b.spread || 0) - (a.spread || 0));

  if (chartData.length === 0) {
    return (
      <div className="h-[400px] flex items-center justify-center text-foreground-muted">
        No P/E spread data available
      </div>
    );
  }

  // Calculate the max absolute value for symmetric domain
  const maxAbsSpread = Math.max(
    ...chartData.map((d) => Math.abs(d.spread || 0))
  );
  const domain = [-maxAbsSpread * 1.1, maxAbsSpread * 1.1];

  return (
    <ResponsiveContainer width="100%" height={Math.max(400, chartData.length * 50)}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 20, right: 40, bottom: 20, left: 140 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke={COLORS.grid}
          horizontal={false}
        />
        <XAxis
          type="number"
          domain={domain}
          tick={{ fill: COLORS.text, fontSize: 12 }}
          axisLine={{ stroke: COLORS.grid }}
          tickFormatter={(value) => value.toFixed(0)}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fill: COLORS.text, fontSize: 12 }}
          axisLine={{ stroke: COLORS.grid }}
          width={130}
        />
        <Tooltip
          cursor={{ fill: "rgba(255, 255, 255, 0.03)" }}
          wrapperStyle={{ outline: "none" }}
          content={({ payload }) => {
            if (!payload || payload.length === 0) return null;
            const data = payload[0].payload;
            const isPositive = (data.spread || 0) >= 0;
            return (
              <div className="chart-tooltip">
                <p className="font-medium mb-2">{data.name}</p>
                <div className="space-y-1 text-foreground-muted">
                  <p>
                    <span className="text-accent-tradfi">{data.tradfiName}</span>
                    {" P/E: "}
                    <span className="font-mono">{data.tradfiPE?.toFixed(1) ?? "N/A"}</span>
                  </p>
                  <p>
                    <span className="text-accent-defi">{data.defiName}</span>
                    {" P/E: "}
                    <span className="font-mono">{data.defiPE?.toFixed(1) ?? "N/A"}</span>
                  </p>
                </div>
                <div className="mt-2 pt-2 border-t border-white/10">
                  <p className={isPositive ? "text-chart-negative" : "text-chart-positive"}>
                    Spread: <span className="font-mono">{isPositive ? "+" : ""}{data.spread?.toFixed(1)}</span>
                  </p>
                  <p className="text-xs text-foreground-muted mt-1">
                    {isPositive ? "DeFi trades at premium" : "DeFi trades at discount"}
                  </p>
                </div>
              </div>
            );
          }}
        />
        <ReferenceLine x={0} stroke={COLORS.text} strokeWidth={2} />
        <Bar dataKey="spread" radius={[4, 4, 4, 4]}>
          {chartData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={(entry.spread || 0) >= 0 ? COLORS.negative : COLORS.positive}
              fillOpacity={0.8}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

interface MarketLandscapeProps {
  pairs: PairComparison[];
}

// Format large numbers for axis labels
function formatRevenue(value: number): string {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(0)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(0)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
  return `$${value}`;
}

export function MarketLandscapeChart({ pairs }: MarketLandscapeProps) {
  // Prepare TradFi data points
  const tradfiData = pairs
    .filter((p) => p.tradfi.revenue && p.tradfi.revenue > 0 && p.tradfi.peRatio)
    .map((p) => ({
      name: p.tradfi.name,
      revenue: p.tradfi.revenue,
      peRatio: p.tradfi.peRatio,
      category: p.tradfi.category,
      type: "TradFi" as const,
    }));

  // Prepare DeFi data points
  const defiData = pairs
    .filter((p) => p.defi.revenue && p.defi.revenue > 0 && p.defi.peRatio)
    .map((p) => ({
      name: p.defi.name,
      revenue: p.defi.revenue,
      peRatio: p.defi.peRatio,
      category: p.defi.category,
      type: "DeFi" as const,
    }));

  if (tradfiData.length === 0 && defiData.length === 0) {
    return (
      <div className="h-[450px] flex items-center justify-center text-foreground-muted">
        No data available for market landscape
      </div>
    );
  }

  // Calculate domains
  const allPE = [...tradfiData, ...defiData].map((d) => d.peRatio || 0);
  const rawMaxPE = Math.max(...allPE);
  // Round max P/E up to nearest 50 for clean axis, with 10% padding
  const maxPE = Math.ceil((rawMaxPE * 1.1) / 50) * 50;

  // Generate Y-axis ticks dynamically based on max value
  const peTickInterval = maxPE <= 100 ? 25 : 50;
  const peTicks = Array.from(
    { length: Math.floor(maxPE / peTickInterval) + 1 },
    (_, i) => i * peTickInterval
  );

  // Fixed log-scale ticks for revenue axis
  const revenueTicks = [1e7, 1e8, 1e9, 1e10, 1e11]; // $10M, $100M, $1B, $10B, $100B

  return (
    <ResponsiveContainer width="100%" height={450}>
      <ScatterChart margin={{ top: 20, right: 30, bottom: 60, left: 70 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
        <XAxis
          type="number"
          dataKey="revenue"
          name="Revenue"
          scale="log"
          domain={[1e7, 1e12]}
          ticks={revenueTicks}
          tick={{ fill: COLORS.text, fontSize: 11 }}
          axisLine={{ stroke: COLORS.grid }}
          tickFormatter={formatRevenue}
          label={{
            value: "Annualized Revenue (Log Scale)",
            position: "bottom",
            offset: 40,
            fill: COLORS.text,
            fontSize: 12,
          }}
        />
        <YAxis
          type="number"
          dataKey="peRatio"
          name="P/E Ratio"
          domain={[0, maxPE]}
          ticks={peTicks}
          tick={{ fill: COLORS.text, fontSize: 11 }}
          axisLine={{ stroke: COLORS.grid }}
          tickFormatter={(value) => value.toFixed(0)}
          label={{
            value: "P/E Ratio",
            angle: -90,
            position: "insideLeft",
            offset: -10,
            fill: COLORS.text,
            fontSize: 12,
          }}
        />
        <ZAxis range={[80, 80]} />
        <Tooltip
          cursor={{ strokeDasharray: "3 3", stroke: "rgba(255, 255, 255, 0.2)" }}
          wrapperStyle={{ outline: "none" }}
          content={({ payload }) => {
            if (!payload || payload.length === 0) return null;
            const data = payload[0].payload;
            return (
              <div className="chart-tooltip">
                <p className={`font-medium ${data.type === "TradFi" ? "text-accent-tradfi" : "text-accent-defi"}`}>
                  {data.name}
                </p>
                <p className="text-xs text-foreground-muted mb-2">{data.category}</p>
                <div className="space-y-1">
                  <p className="text-foreground-muted">
                    Revenue: <span className="font-mono text-foreground">{formatRevenue(data.revenue)}</span>
                  </p>
                  <p className="text-foreground-muted">
                    P/E: <span className="font-mono text-foreground">{data.peRatio?.toFixed(1)}</span>
                  </p>
                </div>
              </div>
            );
          }}
        />
        <Legend
          verticalAlign="top"
          wrapperStyle={{ paddingBottom: 10 }}
        />
        <Scatter
          name="TradFi"
          data={tradfiData}
          fill={COLORS.tradfi}
          fillOpacity={0.8}
        />
        <Scatter
          name="DeFi"
          data={defiData}
          fill={COLORS.defi}
          fillOpacity={0.8}
        />
      </ScatterChart>
    </ResponsiveContainer>
  );
}

interface TrendChartProps {
  data: HistoricalDataPoint[];
  entityName: string;
  metricLabel: string;
  color?: string;
}

export function TrendChart({
  data,
  entityName,
  metricLabel,
  color = COLORS.defi,
}: TrendChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-foreground-muted">
        No historical data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`gradient-${entityName}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fill: COLORS.text, fontSize: 11 }}
          axisLine={{ stroke: COLORS.grid }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: COLORS.text, fontSize: 11 }}
          axisLine={{ stroke: COLORS.grid }}
          tickLine={false}
          width={50}
        />
        <Tooltip
          cursor={{ stroke: "rgba(255, 255, 255, 0.1)" }}
          wrapperStyle={{ outline: "none" }}
          content={({ payload, label }) => {
            if (!payload || payload.length === 0) return null;
            return (
              <div className="chart-tooltip">
                <p className="text-foreground-muted">{label}</p>
                <p className="font-medium">
                  {metricLabel}: {payload[0].value?.toFixed(2)}
                </p>
              </div>
            );
          }}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          fill={`url(#gradient-${entityName})`}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

interface ComparisonTrendChartProps {
  tradfiData: HistoricalDataPoint[];
  defiData: HistoricalDataPoint[];
  tradfiName: string;
  defiName: string;
}

export function ComparisonTrendChart({
  tradfiData,
  defiData,
  tradfiName,
  defiName,
}: ComparisonTrendChartProps) {
  // Merge data by date
  const allDates = new Set([
    ...tradfiData.map((d) => d.date),
    ...defiData.map((d) => d.date),
  ]);

  const mergedData = Array.from(allDates)
    .sort()
    .map((date) => ({
      date,
      tradfi: tradfiData.find((d) => d.date === date)?.value,
      defi: defiData.find((d) => d.date === date)?.value,
    }));

  if (mergedData.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-foreground-muted">
        No historical data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={mergedData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fill: COLORS.text, fontSize: 11 }}
          axisLine={{ stroke: COLORS.grid }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: COLORS.text, fontSize: 11 }}
          axisLine={{ stroke: COLORS.grid }}
          tickLine={false}
          width={50}
        />
        <Tooltip
          cursor={{ stroke: "rgba(255, 255, 255, 0.1)" }}
          wrapperStyle={{ outline: "none" }}
          content={({ payload, label }) => {
            if (!payload || payload.length === 0) return null;
            return (
              <div className="chart-tooltip">
                <p className="text-foreground-muted mb-2">{label}</p>
                {payload.map((entry) => (
                  <p key={entry.dataKey} style={{ color: entry.color }}>
                    {entry.dataKey === "tradfi" ? tradfiName : defiName}:{" "}
                    {entry.value?.toFixed(2) ?? "N/A"}
                  </p>
                ))}
              </div>
            );
          }}
        />
        <Legend
          formatter={(value) => (value === "tradfi" ? tradfiName : defiName)}
        />
        <Line
          type="monotone"
          dataKey="tradfi"
          stroke={COLORS.tradfi}
          strokeWidth={2}
          dot={false}
          name="tradfi"
        />
        <Line
          type="monotone"
          dataKey="defi"
          stroke={COLORS.defi}
          strokeWidth={2}
          dot={false}
          name="defi"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

interface EquityBarProps {
  tradfiValue: number | null;
  defiValue: number | null;
  maxValue?: number;
}

export function EquityComparisonBar({ tradfiValue, defiValue, maxValue }: EquityBarProps) {
  const max = maxValue || Math.max(tradfiValue || 0, defiValue || 0);
  const tradfiWidth = tradfiValue ? (tradfiValue / max) * 100 : 0;
  const defiWidth = defiValue ? (defiValue / max) * 100 : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-xs text-foreground-muted w-16">TradFi</span>
        <div className="flex-1 h-4 bg-background-secondary rounded overflow-hidden">
          <div
            className="h-full bg-accent-tradfi/60 rounded"
            style={{ width: `${tradfiWidth}%` }}
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-foreground-muted w-16">DeFi</span>
        <div className="flex-1 h-4 bg-background-secondary rounded overflow-hidden">
          <div
            className="h-full bg-accent-defi/60 rounded"
            style={{ width: `${defiWidth}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// Format large numbers for equity values
function formatEquityValue(value: number): string {
  if (value >= 1e12) return `$${(value / 1e12).toFixed(1)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(0)}M`;
  return `$${value.toFixed(0)}`;
}

interface SpreadHistoryChartProps {
  data: HistoricalDataPoint[];
  pairTheme: string;
}

export function SpreadHistoryChart({ data, pairTheme }: SpreadHistoryChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-[200px] flex items-center justify-center text-foreground-muted text-sm">
        No spread history available
      </div>
    );
  }

  // Calculate domain with padding
  const values = data.map((d) => d.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const padding = Math.abs(maxVal - minVal) * 0.1 || 10;

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`spread-gradient-${pairTheme}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fill: COLORS.text, fontSize: 10 }}
          axisLine={{ stroke: COLORS.grid }}
          tickLine={false}
          tickFormatter={(value) => {
            const date = new Date(value);
            return `${date.getMonth() + 1}/${date.getDate()}`;
          }}
        />
        <YAxis
          tick={{ fill: COLORS.text, fontSize: 10 }}
          axisLine={{ stroke: COLORS.grid }}
          tickLine={false}
          width={45}
          domain={[minVal - padding, maxVal + padding]}
          tickFormatter={(value) => value.toFixed(0)}
        />
        <ReferenceLine y={0} stroke={COLORS.text} strokeDasharray="3 3" />
        <Tooltip
          cursor={{ stroke: "rgba(255, 255, 255, 0.1)" }}
          wrapperStyle={{ outline: "none" }}
          content={({ payload, label }) => {
            if (!payload || payload.length === 0) return null;
            const value = payload[0].value as number;
            const isPositive = value >= 0;
            return (
              <div className="chart-tooltip">
                <p className="text-foreground-muted text-xs">{label}</p>
                <p className={`font-mono ${isPositive ? "text-chart-negative" : "text-chart-positive"}`}>
                  {isPositive ? "+" : ""}{value.toFixed(1)}
                </p>
                <p className="text-xs text-foreground-muted">
                  {isPositive ? "DeFi premium" : "DeFi discount"}
                </p>
              </div>
            );
          }}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke="#8b5cf6"
          strokeWidth={2}
          fill={`url(#spread-gradient-${pairTheme})`}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

interface EquityTrendChartProps {
  tradfiData: HistoricalDataPoint[];
  defiData: HistoricalDataPoint[];
  tradfiName: string;
  defiName: string;
}

export function EquityTrendChart({
  tradfiData,
  defiData,
  tradfiName,
  defiName,
}: EquityTrendChartProps) {
  // Merge data by date
  const allDates = new Set([
    ...tradfiData.map((d) => d.date),
    ...defiData.map((d) => d.date),
  ]);

  const mergedData = Array.from(allDates)
    .sort()
    .map((date) => ({
      date,
      tradfi: tradfiData.find((d) => d.date === date)?.value,
      defi: defiData.find((d) => d.date === date)?.value,
    }));

  if (mergedData.length === 0) {
    return (
      <div className="h-[200px] flex items-center justify-center text-foreground-muted text-sm">
        No equity history available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={mergedData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fill: COLORS.text, fontSize: 10 }}
          axisLine={{ stroke: COLORS.grid }}
          tickLine={false}
          tickFormatter={(value) => {
            const date = new Date(value);
            return `${date.getMonth() + 1}/${date.getDate()}`;
          }}
        />
        <YAxis
          tick={{ fill: COLORS.text, fontSize: 10 }}
          axisLine={{ stroke: COLORS.grid }}
          tickLine={false}
          width={55}
          tickFormatter={formatEquityValue}
        />
        <Tooltip
          cursor={{ stroke: "rgba(255, 255, 255, 0.1)" }}
          wrapperStyle={{ outline: "none" }}
          content={({ payload, label }) => {
            if (!payload || payload.length === 0) return null;
            return (
              <div className="chart-tooltip">
                <p className="text-foreground-muted text-xs mb-2">{label}</p>
                {payload.map((entry) => (
                  <p key={entry.dataKey} style={{ color: entry.color }} className="text-sm">
                    {entry.dataKey === "tradfi" ? tradfiName : defiName}:{" "}
                    <span className="font-mono">{entry.value ? formatEquityValue(entry.value as number) : "N/A"}</span>
                  </p>
                ))}
              </div>
            );
          }}
        />
        <Legend
          formatter={(value) => (value === "tradfi" ? tradfiName : defiName)}
          wrapperStyle={{ fontSize: 11 }}
        />
        <Line
          type="monotone"
          dataKey="tradfi"
          stroke={COLORS.tradfi}
          strokeWidth={2}
          dot={false}
          name="tradfi"
        />
        <Line
          type="monotone"
          dataKey="defi"
          stroke={COLORS.defi}
          strokeWidth={2}
          dot={false}
          name="defi"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

interface PairHistoricalChartsProps {
  pairData: PairHistoricalData;
}

export function PairHistoricalCharts({ pairData }: PairHistoricalChartsProps) {
  const hasPEData = pairData.peHistory.tradfi.length > 0 || pairData.peHistory.defi.length > 0;
  const hasEquityData = pairData.equityHistory.tradfi.length > 0 || pairData.equityHistory.defi.length > 0;
  const hasSpreadData = pairData.spreadHistory.length > 0;

  if (!hasPEData && !hasEquityData && !hasSpreadData) {
    return (
      <div className="text-foreground-muted text-sm text-center py-4">
        No historical data available yet
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* P/E Ratio Comparison */}
      {hasPEData && (
        <div>
          <h4 className="text-sm font-medium text-foreground-muted mb-2">P/E Ratio Trend</h4>
          <ComparisonTrendChart
            tradfiData={pairData.peHistory.tradfi}
            defiData={pairData.peHistory.defi}
            tradfiName={pairData.tradfiName}
            defiName={pairData.defiName}
          />
        </div>
      )}

      {/* P/E Spread History */}
      {hasSpreadData && (
        <div>
          <h4 className="text-sm font-medium text-foreground-muted mb-2">P/E Spread (DeFi - TradFi)</h4>
          <SpreadHistoryChart data={pairData.spreadHistory} pairTheme={pairData.theme} />
        </div>
      )}

      {/* Equity/FDV Comparison */}
      {hasEquityData && (
        <div>
          <h4 className="text-sm font-medium text-foreground-muted mb-2">Market Cap / FDV Trend</h4>
          <EquityTrendChart
            tradfiData={pairData.equityHistory.tradfi}
            defiData={pairData.equityHistory.defi}
            tradfiName={pairData.tradfiName}
            defiName={pairData.defiName}
          />
        </div>
      )}
    </div>
  );
}
