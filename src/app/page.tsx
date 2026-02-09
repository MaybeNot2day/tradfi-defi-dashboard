import { PAIRS } from "@/data/pairs";
import { getAllPairComparisons, getLastUpdateTime, getPairHistoricalData } from "@/lib/repository";
import { Dashboard } from "./Dashboard";
import type { PairComparison, PairHistoricalData } from "@/types/metrics";

// ISR: Revalidate every hour
export const revalidate = 3600;

export default async function Home() {
  // Fetch data server-side
  let pairs: PairComparison[] = [];
  let lastUpdated: string | null = null;
  let historicalData: PairHistoricalData[] = [];

  try {
    pairs = await getAllPairComparisons();
    lastUpdated = await getLastUpdateTime();

    // Fetch historical data for all pairs in parallel
    const historicalPromises = PAIRS.map(async (pair) => {
      const history = await getPairHistoricalData(pair.tradfi.id, pair.defi.id, 52);
      return {
        pairId: pair.id,
        theme: pair.theme,
        tradfiId: pair.tradfi.id,
        tradfiName: pair.tradfi.name,
        defiId: pair.defi.id,
        defiName: pair.defi.name,
        ...history,
      } as PairHistoricalData;
    });

    historicalData = await Promise.all(historicalPromises);
  } catch (error) {
    console.error("Error fetching data:", error);
    // Fall back to empty state - will show placeholder
  }

  return (
    <Dashboard
      pairs={pairs}
      pairDefinitions={PAIRS}
      lastUpdated={lastUpdated ?? undefined}
      historicalData={historicalData}
    />
  );
}
