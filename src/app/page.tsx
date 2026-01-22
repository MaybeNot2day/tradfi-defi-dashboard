import { PAIRS } from "@/data/pairs";
import { getAllPairComparisons, getLastUpdateTime } from "@/lib/repository";
import { Dashboard } from "./Dashboard";
import type { PairComparison } from "@/types/metrics";

// ISR: Revalidate every hour
export const revalidate = 3600;

export default async function Home() {
  // Fetch data server-side
  let pairs: PairComparison[] = [];
  let lastUpdated: string | null = null;

  try {
    pairs = await getAllPairComparisons();
    lastUpdated = await getLastUpdateTime();
  } catch (error) {
    console.error("Error fetching data:", error);
    // Fall back to empty state - will show placeholder
  }

  return (
    <Dashboard
      pairs={pairs}
      pairDefinitions={PAIRS}
      lastUpdated={lastUpdated ?? undefined}
    />
  );
}
