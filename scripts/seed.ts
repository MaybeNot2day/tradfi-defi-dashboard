/**
 * Database seeding script.
 * Initializes schema and populates with pairs metadata + optional mock data.
 *
 * Usage:
 *   npx tsx scripts/seed.ts          # Seed entities and pairs only
 *   npx tsx scripts/seed.ts --mock   # Also add mock metrics for development
 *   npx tsx scripts/seed.ts --reset  # Drop all tables first, then seed
 */

import { PAIRS, getAllEntities } from "../src/data/pairs";
import { closeDb } from "../src/lib/db";
import { initializeSchema, dropAllTables } from "../src/lib/schema";
import { upsertEntity, upsertPair, insertSnapshot, insertMetrics } from "../src/lib/repository";

const args = process.argv.slice(2);
const shouldReset = args.includes("--reset");
const shouldMock = args.includes("--mock");

async function seed() {
  console.log("Starting database seed...\n");

  try {
    // Reset if requested
    if (shouldReset) {
      console.log("Dropping existing tables...");
      await dropAllTables();
    }

    // Initialize schema
    console.log("Initializing schema...");
    await initializeSchema();

    // Seed entities
    console.log("\nSeeding entities...");
    const entities = getAllEntities();
    for (const entity of entities) {
      await upsertEntity(entity);
      console.log(`  - ${entity.name} (${entity.type})`);
    }

    // Seed pairs
    console.log("\nSeeding pairs...");
    for (const pair of PAIRS) {
      await upsertPair(pair);
      console.log(`  - #${pair.id}: ${pair.tradfi.name} vs ${pair.defi.name}`);
    }

    // Add mock data if requested
    if (shouldMock) {
      console.log("\nSeeding mock metrics...");
      await seedMockMetrics();
    }

    console.log("\nDatabase seeded successfully!");
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  } finally {
    closeDb();
  }
}

/**
 * Generate mock metrics for development/testing.
 */
async function seedMockMetrics() {
  const now = new Date();

  // Mock data based on approximate real values (for development only)
  const mockData: Record<string, {
    equityValue: number;
    revenue: number;
    fees: number;
  }> = {
    // TradFi
    nasdaq: { equityValue: 42_000_000_000, revenue: 6_500_000_000, fees: 3_200_000_000 },
    jpmorgan: { equityValue: 580_000_000_000, revenue: 130_000_000_000, fees: 45_000_000_000 },
    blackrock: { equityValue: 130_000_000_000, revenue: 18_000_000_000, fees: 12_000_000_000 },
    apollo: { equityValue: 75_000_000_000, revenue: 25_000_000_000, fees: 8_000_000_000 },
    ibkr: { equityValue: 45_000_000_000, revenue: 4_500_000_000, fees: 2_800_000_000 },
    statestreet: { equityValue: 26_000_000_000, revenue: 12_000_000_000, fees: 6_000_000_000 },
    cme: { equityValue: 85_000_000_000, revenue: 5_600_000_000, fees: 4_200_000_000 },
    tradeweb: { equityValue: 25_000_000_000, revenue: 1_400_000_000, fees: 900_000_000 },
    marketaxess: { equityValue: 10_000_000_000, revenue: 750_000_000, fees: 450_000_000 },
    cboe: { equityValue: 20_000_000_000, revenue: 4_000_000_000, fees: 2_500_000_000 },

    // DeFi (using FDV and annualized figures)
    uniswap: { equityValue: 8_500_000_000, revenue: 800_000_000, fees: 1_200_000_000 },
    aave: { equityValue: 3_200_000_000, revenue: 250_000_000, fees: 400_000_000 },
    lido: { equityValue: 2_800_000_000, revenue: 120_000_000, fees: 150_000_000 },
    ondo: { equityValue: 4_500_000_000, revenue: 45_000_000, fees: 30_000_000 },
    hyperliquid: { equityValue: 12_000_000_000, revenue: 350_000_000, fees: 500_000_000 },
    makerdao: { equityValue: 2_000_000_000, revenue: 280_000_000, fees: 180_000_000 },
    gmx: { equityValue: 450_000_000, revenue: 85_000_000, fees: 120_000_000 },
    curve: { equityValue: 350_000_000, revenue: 25_000_000, fees: 45_000_000 },
    pendle: { equityValue: 650_000_000, revenue: 55_000_000, fees: 70_000_000 },
    jupiter: { equityValue: 1_200_000_000, revenue: 90_000_000, fees: 140_000_000 },
  };

  for (const [entityId, data] of Object.entries(mockData)) {
    const snapshotId = await insertSnapshot(
      entityId,
      now,
      "mock",
      JSON.stringify(data)
    );

    const peRatio = data.revenue > 0 ? data.equityValue / data.revenue : null;
    const psRatio = data.fees > 0 ? data.equityValue / data.fees : null;

    await insertMetrics(snapshotId, [
      { type: "equity_value", value: data.equityValue },
      { type: "revenue", value: data.revenue },
      { type: "fees", value: data.fees },
      { type: "pe_ratio", value: peRatio },
      { type: "ps_ratio", value: psRatio },
    ]);

    console.log(`  - ${entityId}: P/E=${peRatio?.toFixed(1) ?? "N/A"}, P/S=${psRatio?.toFixed(1) ?? "N/A"}`);
  }
}

// Run the seed
seed();
