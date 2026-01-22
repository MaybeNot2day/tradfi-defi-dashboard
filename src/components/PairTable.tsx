"use client";

import { Badge } from "./Badge";
import { MetricInfoIcon, Tooltip } from "./Tooltip";
import { formatCurrency, formatRatio, formatSpread, getValueColorClass } from "@/lib/format";
import type { PairComparison } from "@/types/metrics";

// Special case annotations for specific protocols
const PROTOCOL_NOTES: Record<string, { note: string; revenueDisplay: string }> = {
  ondo: {
    note: "Ondo Finance has actively waived management fees on OUSG until July 2026 to capture market share.",
    revenueDisplay: "Fees Waived",
  },
};

interface PairTableProps {
  pairs: PairComparison[];
  onPairClick?: (pairId: number) => void;
}

export function PairTable({ pairs, onPairClick }: PairTableProps) {
  if (pairs.length === 0) {
    return (
      <div className="glass-card p-8 text-center text-foreground-muted">
        No data available. Run the data fetcher to populate metrics.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full table-fixed">
        <colgroup><col className="w-12" /><col className="w-40" /><col className="w-44" /><col className="w-28" /><col className="w-32" /><col className="w-20" /><col className="w-44" /><col className="w-28" /><col className="w-32" /><col className="w-20" /><col className="w-28" /></colgroup>
        <thead>
          <tr className="border-b border-border text-left text-sm text-foreground-muted">
            <th className="pb-4 pr-4 font-medium">#</th>
            <th className="pb-4 pr-4 font-medium">Theme</th>
            <th className="pb-4 pr-4 font-medium">TradFi</th>
            <th className="pb-4 pr-4 font-medium text-right">
              <span className="inline-flex items-center justify-end">
                Market Cap
                <MetricInfoIcon metric="equity_value" />
              </span>
            </th>
            <th className="pb-4 pr-4 font-medium text-right">
              <span className="inline-flex items-center justify-end">
                TTM Revenue
                <MetricInfoIcon metric="revenue" />
              </span>
            </th>
            <th className="pb-4 pr-4 font-medium text-right">
              <span className="inline-flex items-center justify-end">
                P/E
                <MetricInfoIcon metric="pe_ratio" />
              </span>
            </th>
            <th className="pb-4 pr-4 font-medium">DeFi</th>
            <th className="pb-4 pr-4 font-medium text-right">
              <span className="inline-flex items-center justify-end">
                FDV
                <MetricInfoIcon metric="equity_value" />
              </span>
            </th>
            <th className="pb-4 pr-4 font-medium text-right">
              <span className="inline-flex items-center justify-end">
                Ann. Revenue
                <MetricInfoIcon metric="revenue" />
              </span>
            </th>
            <th className="pb-4 pr-4 font-medium text-right">
              <span className="inline-flex items-center justify-end">
                P/E
                <MetricInfoIcon metric="pe_ratio" />
              </span>
            </th>
            <th className="pb-4 font-medium text-right">
              <span className="inline-flex items-center justify-end">
                Spread
                <MetricInfoIcon metric="spread" />
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          {pairs.map((pair, index) => (
            <tr
              key={pair.pairId}
              className={`border-b border-border/50 hover:bg-background-secondary transition-colors cursor-pointer ${
                index % 2 === 1 ? "bg-background-secondary/30" : ""
              }`}
              onClick={() => onPairClick?.(pair.pairId)}
            >
              {/* Text columns - left aligned */}
              <td className="py-4 pr-4 text-left font-mono tabular-nums text-foreground-muted">{pair.pairId}</td>
              <td className="py-4 pr-4 text-left">
                <span className="font-medium">{pair.theme}</span>
              </td>

              {/* TradFi - name left aligned */}
              <td className="py-4 pr-4 text-left">
                <div className="flex items-center gap-2">
                  <Badge variant="tradfi">TradFi</Badge>
                  <span className="text-accent-tradfi font-medium">{pair.tradfi.name}</span>
                </div>
                <span className="text-xs text-foreground-muted">{pair.tradfi.category}</span>
              </td>
              {/* TradFi numbers - right aligned, monospace, tabular */}
              <td className="py-4 pr-4 text-right font-mono tabular-nums">
                {formatCurrency(pair.tradfi.equityValue)}
              </td>
              <td className="py-4 pr-4 text-right font-mono tabular-nums text-foreground-muted">
                {formatCurrency(pair.tradfi.revenue)}
              </td>
              <td className="py-4 pr-4 text-right font-mono tabular-nums">
                {formatRatio(pair.tradfi.peRatio)}
              </td>

              {/* DeFi - name left aligned */}
              <td className="py-4 pr-4 text-left">
                <div className="flex items-center gap-2">
                  <Badge variant="defi">DeFi</Badge>
                  <span className="text-accent-defi font-medium">{pair.defi.name}</span>
                </div>
                <span className="text-xs text-foreground-muted">{pair.defi.category}</span>
              </td>
              {/* DeFi numbers - right aligned, monospace, tabular */}
              <td className="py-4 pr-4 text-right font-mono tabular-nums">
                {formatCurrency(pair.defi.equityValue)}
              </td>
              <td className="py-4 pr-4 text-right font-mono tabular-nums text-foreground-muted">
                {PROTOCOL_NOTES[pair.defi.entityId] ? (
                  <span className="inline-flex items-center justify-end gap-1">
                    {PROTOCOL_NOTES[pair.defi.entityId].revenueDisplay}
                    <Tooltip
                      content={
                        <div className="w-64 whitespace-normal text-left">
                          {PROTOCOL_NOTES[pair.defi.entityId].note}
                        </div>
                      }
                      position="top"
                    >
                      <span className="text-accent-defi cursor-help">*</span>
                    </Tooltip>
                  </span>
                ) : (
                  formatCurrency(pair.defi.revenue)
                )}
              </td>
              <td className="py-4 pr-4 text-right font-mono tabular-nums">
                {PROTOCOL_NOTES[pair.defi.entityId] ? (
                  <span className="inline-flex items-center justify-end gap-1">
                    N/A
                    <Tooltip
                      content={
                        <div className="w-64 whitespace-normal text-left">
                          {PROTOCOL_NOTES[pair.defi.entityId].note}
                        </div>
                      }
                      position="top"
                    >
                      <span className="text-accent-defi cursor-help">*</span>
                    </Tooltip>
                  </span>
                ) : (
                  formatRatio(pair.defi.peRatio)
                )}
              </td>

              {/* Spread - right aligned, monospace, tabular */}
              <td className={`py-4 text-right font-mono tabular-nums ${getValueColorClass(pair.peSpread)}`}>
                {formatSpread(pair.peSpread)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface CompactPairCardProps {
  pair: PairComparison;
  onClick?: () => void;
}

export function CompactPairCard({ pair, onClick }: CompactPairCardProps) {
  return (
    <div
      className="glass-card p-4 hover:border-accent-defi/30 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-foreground-muted text-sm font-mono tabular-nums">#{pair.pairId}</span>
        <span className="font-medium text-sm">{pair.theme}</span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* TradFi */}
        <div>
          <div className="flex items-center gap-1 mb-1">
            <Badge variant="tradfi">TradFi</Badge>
          </div>
          <p className="text-accent-tradfi font-medium text-left">{pair.tradfi.name}</p>
          <p className="text-xs text-foreground-muted mt-1">
            Mkt Cap: <span className="font-mono tabular-nums">{formatCurrency(pair.tradfi.equityValue)}</span>
          </p>
          <p className="text-xs text-foreground-muted">
            Revenue: <span className="font-mono tabular-nums">{formatCurrency(pair.tradfi.revenue)}</span>
          </p>
          <p className="text-xs text-foreground-muted">
            P/E: <span className="font-mono tabular-nums">{formatRatio(pair.tradfi.peRatio)}</span>
          </p>
        </div>

        {/* DeFi */}
        <div>
          <div className="flex items-center gap-1 mb-1">
            <Badge variant="defi">DeFi</Badge>
          </div>
          <p className="text-accent-defi font-medium text-left">{pair.defi.name}</p>
          <p className="text-xs text-foreground-muted mt-1">
            FDV: <span className="font-mono tabular-nums">{formatCurrency(pair.defi.equityValue)}</span>
          </p>
          <p className="text-xs text-foreground-muted">
            Revenue: <span className="font-mono tabular-nums">{formatCurrency(pair.defi.revenue)}</span>
          </p>
          <p className="text-xs text-foreground-muted">
            P/E: <span className="font-mono tabular-nums">{formatRatio(pair.defi.peRatio)}</span>
          </p>
        </div>
      </div>

      {/* Spread indicator */}
      <div className="mt-3 pt-3 border-t border-border/50 flex justify-between text-xs">
        <span className="text-foreground-muted">P/E Spread</span>
        <span className={`font-mono tabular-nums ${getValueColorClass(pair.peSpread)}`}>
          {formatSpread(pair.peSpread)}
        </span>
      </div>
    </div>
  );
}
