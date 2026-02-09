"use client";

import { useState } from "react";
import {
  Header,
  MetricCard,
  PairTable,
  CompactPairCard,
  PESpreadChart,
  MarketLandscapeChart,
  Tabs,
  PairHistoricalCharts,
} from "@/components";
import { formatCurrency } from "@/lib/format";
import type { PairComparison, PairHistoricalData } from "@/types/metrics";
import type { Pair } from "@/data/pairs";

interface DashboardProps {
  pairs: PairComparison[];
  pairDefinitions: Pair[];
  lastUpdated?: string;
  historicalData?: PairHistoricalData[];
}

const CATEGORY_TABS = [
  { id: "all", label: "All Pairs" },
  { id: "exchange", label: "Exchanges" },
  { id: "lending", label: "Lending" },
  { id: "derivatives", label: "Derivatives" },
  { id: "other", label: "Other" },
];

const CATEGORY_MAPPING: Record<string, string[]> = {
  exchange: ["Exchange"],
  lending: ["Bank", "Lending"],
  derivatives: ["Derivatives", "Perps DEX", "Options Exchange", "Synths"],
  other: [
    "Asset Management",
    "Liquid Staking",
    "Alt Asset Management",
    "RWA/Tokenization",
    "Brokerage",
    "Custody/Bank",
    "Stablecoin Issuer",
    "Stable Swap",
    "Rates Trading",
    "Bond Trading",
    "Yield Trading",
  ],
};

export function Dashboard({ pairs, pairDefinitions, lastUpdated, historicalData = [] }: DashboardProps) {
  const [activeTab, setActiveTab] = useState("all");
  const [, setSelectedPairId] = useState<number | null>(null);
  const [expandedPair, setExpandedPair] = useState<number | null>(null);

  // Filter pairs by category
  const filteredPairs =
    activeTab === "all"
      ? pairs
      : pairs.filter((p) => {
          const categories = CATEGORY_MAPPING[activeTab] || [];
          return (
            categories.includes(p.tradfi.category) || categories.includes(p.defi.category)
          );
        });

  // Calculate summary stats
  const totalTradFiValue = pairs.reduce((sum, p) => sum + (p.tradfi.equityValue || 0), 0);
  const totalDeFiValue = pairs.reduce((sum, p) => sum + (p.defi.equityValue || 0), 0);
  const avgTradFiPE =
    pairs.filter((p) => p.tradfi.peRatio).reduce((sum, p) => sum + (p.tradfi.peRatio || 0), 0) /
    (pairs.filter((p) => p.tradfi.peRatio).length || 1);
  const avgDeFiPE =
    pairs.filter((p) => p.defi.peRatio).reduce((sum, p) => sum + (p.defi.peRatio || 0), 0) /
    (pairs.filter((p) => p.defi.peRatio).length || 1);

  const hasData = pairs.length > 0;

  return (
    <main className="min-h-screen p-4 md:p-8 max-w-[1800px] mx-auto">
      <Header lastUpdated={lastUpdated} />

      {/* Stats Overview */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <MetricCard
          label="Total Pairs"
          value={pairDefinitions.length.toString()}
        />
        <MetricCard
          label="TradFi Market Cap"
          value={hasData ? formatCurrency(totalTradFiValue) : "—"}
          className="text-accent-tradfi"
        />
        <MetricCard
          label="DeFi FDV"
          value={hasData ? formatCurrency(totalDeFiValue) : "—"}
          className="text-accent-defi"
        />
        <MetricCard
          label="Avg P/E Spread"
          value={hasData ? (avgDeFiPE - avgTradFiPE).toFixed(1) : "—"}
          subValue={hasData ? `DeFi: ${avgDeFiPE.toFixed(1)} vs TradFi: ${avgTradFiPE.toFixed(1)}` : undefined}
        />
      </section>

      {/* No Data State */}
      {!hasData && (
        <section className="glass-card p-8 text-center mb-8">
          <h2 className="text-xl font-semibold mb-2">No Metrics Data Available</h2>
          <p className="text-foreground-muted mb-4">
            Run the data fetcher to populate metrics from FMP, CoinGecko, and DefiLlama.
          </p>
          <code className="bg-background-secondary px-4 py-2 rounded text-sm">
            npm run fetch:metrics
          </code>
          <p className="text-foreground-muted mt-4 text-sm">
            Or seed mock data for development:
          </p>
          <code className="bg-background-secondary px-4 py-2 rounded text-sm">
            npm run db:seed:mock
          </code>
        </section>
      )}

      {/* Category Tabs */}
      {hasData && (
        <>
          <section className="mb-6">
            <Tabs tabs={CATEGORY_TABS} defaultTab="all" onChange={setActiveTab} />
          </section>

          {/* Mobile: Card View */}
          <section className="md:hidden grid gap-4 mb-8">
            {filteredPairs.map((pair) => (
              <CompactPairCard
                key={pair.pairId}
                pair={pair}
                onClick={() => setSelectedPairId(pair.pairId)}
              />
            ))}
          </section>

          {/* Desktop: Table View */}
          <section className="hidden md:block glass-card p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Comparison Table</h2>
            <PairTable pairs={filteredPairs} onPairClick={setSelectedPairId} />
          </section>

          {/* P/E Spread Diverging Bar Chart */}
          <section className="glass-card p-6 mb-8">
            <h2 className="text-xl font-semibold mb-2">Value Gap: P/E Spread</h2>
            <p className="text-foreground-muted text-sm mb-4">
              Positive (red) = DeFi Premium | Negative (green) = DeFi Discount
            </p>
            <PESpreadChart pairs={filteredPairs} />
          </section>

          {/* Market Landscape Scatter Plot */}
          <section className="glass-card p-6 mb-8">
            <h2 className="text-xl font-semibold mb-2">Market Landscape</h2>
            <p className="text-foreground-muted text-sm mb-4">
              Revenue vs P/E across all entities. TradFi clusters in high-revenue, moderate P/E zones while DeFi is more dispersed.
            </p>
            <MarketLandscapeChart pairs={filteredPairs} />
          </section>

          {/* Historical Trends Section */}
          {historicalData.length > 0 && (
            <section className="glass-card p-6 mb-8">
              <h2 className="text-xl font-semibold mb-2">Historical Trends</h2>
              <p className="text-foreground-muted text-sm mb-6">
                Track how valuations and spreads have changed over time. Click a pair to expand.
              </p>
              <div className="space-y-4">
                {historicalData
                  .filter((h) => {
                    if (activeTab === "all") return true;
                    const pair = pairs.find((p) => p.pairId === h.pairId);
                    if (!pair) return false;
                    const categories = CATEGORY_MAPPING[activeTab] || [];
                    return categories.includes(pair.tradfi.category) || categories.includes(pair.defi.category);
                  })
                  .map((pairHistory) => {
                    const isExpanded = expandedPair === pairHistory.pairId;
                    const hasData = pairHistory.spreadHistory.length > 0 ||
                      pairHistory.peHistory.tradfi.length > 0 ||
                      pairHistory.equityHistory.tradfi.length > 0;

                    return (
                      <div
                        key={pairHistory.pairId}
                        className="border border-border rounded-lg overflow-hidden"
                      >
                        <button
                          onClick={() => setExpandedPair(isExpanded ? null : pairHistory.pairId)}
                          className="w-full px-4 py-3 flex items-center justify-between hover:bg-background-secondary/50 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <span className="text-foreground-muted text-sm">#{pairHistory.pairId}</span>
                            <span className="font-medium">{pairHistory.theme}</span>
                            <span className="text-sm text-foreground-muted">
                              <span className="text-accent-tradfi">{pairHistory.tradfiName}</span>
                              {" vs "}
                              <span className="text-accent-defi">{pairHistory.defiName}</span>
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            {hasData && (
                              <span className="text-xs text-foreground-muted">
                                {pairHistory.spreadHistory.length} data points
                              </span>
                            )}
                            <svg
                              className={`w-5 h-5 text-foreground-muted transition-transform ${isExpanded ? "rotate-180" : ""}`}
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </button>
                        {isExpanded && (
                          <div className="px-4 pb-4 border-t border-border bg-background-secondary/30">
                            <div className="pt-4">
                              <PairHistoricalCharts pairData={pairHistory} />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </section>
          )}
        </>
      )}

      {/* Pairs List (Static) */}
      {!hasData && (
        <section>
          <h2 className="text-xl font-semibold mb-4">Configured Pairs</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {pairDefinitions.map((pair) => (
              <div key={pair.id} className="glass-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-foreground-muted text-sm">#{pair.id}</span>
                  <span className="font-medium text-sm">{pair.theme}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-accent-tradfi">{pair.tradfi.name}</span>
                  <span className="text-foreground-muted">vs</span>
                  <span className="text-accent-defi">{pair.defi.name}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="mt-16 pt-8 border-t border-border text-center text-foreground-muted text-sm">
        <p>Data sourced from FMP, CoinGecko, and DefiLlama</p>
        <p className="mt-1">Weekly updates on Mondays at 6:00 AM UTC</p>
      </footer>
    </main>
  );
}
