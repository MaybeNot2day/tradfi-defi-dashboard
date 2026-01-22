/**
 * Data Fetcher Script
 * Fetches metrics from FMP (TradFi), CoinGecko (DeFi FDV), and DefiLlama (DeFi fees/revenue).
 *
 * Usage:
 *   npm run fetch:metrics           # Fetch real data
 *   npm run fetch:metrics:dry       # Dry run (no database writes)
 *
 * Required environment variables:
 *   FMP_API_KEY - Financial Modeling Prep API key
 *
 * Optional:
 *   COINGECKO_API_KEY - CoinGecko Pro API key (improves rate limits)
 *   ALERT_WEBHOOK_URL - Webhook for failure notifications
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { PAIRS, getAllEntities, type Entity } from "../src/data/pairs";
import { closeDb } from "../src/lib/db";
import { initializeSchema } from "../src/lib/schema";
import { upsertEntity, upsertPair, insertSnapshot, insertMetrics } from "../src/lib/repository";

/**
 * Retry wrapper for database operations.
 * Handles transient connection errors with exponential backoff.
 */
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt - 1);
        console.log(`  [Retry ${attempt}/${maxRetries}] DB error, waiting ${delay}ms...`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  
  throw lastError;
}
import { fetchTradFiData } from "../src/lib/api/fmp";
import { fetchDeFiTokenData } from "../src/lib/api/coingecko";
import { fetchDeFiFeesData } from "../src/lib/api/defillama";

const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");
const dateOverride = args.find((a) => a.startsWith("--date="))?.split("=")[1];

/**
 * Protocol-specific revenue adjustments.
 * Some protocols report revenue differently than actual protocol share.
 * Multiplier is applied to the DefiLlama revenue value.
 */
const REVENUE_ADJUSTMENTS: Record<string, number> = {
  // GMX: DefiLlama reports ~100% of fees as revenue, but protocol only captures ~30%
  gmx: 0.30,
};

interface FetchResult {
  entityId: string;
  name: string;
  type: "tradfi" | "defi";
  success: boolean;
  error?: string;
  metrics?: {
    equityValue: number | null;
    revenue: number | null;
    fees: number | null;
    peRatio: number | null;
    psRatio: number | null;
  };
}

async function fetchEntityData(entity: Entity): Promise<FetchResult> {
  const result: FetchResult = {
    entityId: entity.id,
    name: entity.name,
    type: entity.type,
    success: false,
  };

  try {
    if (entity.type === "tradfi") {
      if (!entity.ticker) {
        result.error = "No ticker defined";
        return result;
      }

      const data = await fetchTradFiData(entity.ticker);
      if (!data) {
        result.error = "FMP API returned no data";
        return result;
      }

      result.success = true;
      result.metrics = {
        equityValue: data.marketCap,
        revenue: data.ttmRevenue,
        fees: data.ttmRevenue, // Using revenue as fees proxy for TradFi
        peRatio: data.peRatio,
        psRatio: data.psRatio,
      };
    } else {
      // DeFi: Fetch from CoinGecko (FDV) and DefiLlama (fees/revenue)
      const [tokenData, feesData] = await Promise.all([
        entity.coingeckoId ? fetchDeFiTokenData(entity.coingeckoId) : null,
        entity.defiLlamaId ? fetchDeFiFeesData(entity.defiLlamaId) : null,
      ]);

      if (!tokenData && !feesData) {
        result.error = "Both CoinGecko and DefiLlama returned no data";
        return result;
      }

      const fdv = tokenData?.fdv ?? tokenData?.marketCap ?? null;
      let annualizedRevenue = feesData?.annualizedRevenue ?? null;
      const annualizedFees = feesData?.annualizedFees ?? null;

      // Apply protocol-specific revenue adjustments
      const revenueMultiplier = REVENUE_ADJUSTMENTS[entity.id];
      if (revenueMultiplier && annualizedRevenue) {
        annualizedRevenue = annualizedRevenue * revenueMultiplier;
      }

      // Calculate ratios using proper methodology:
      // P/E = FDV / Annualized Protocol Revenue (what the protocol retains)
      // P/S = FDV / Annualized Total Fees (what users pay)
      //
      // Note: For protocols where 100% of fees go to LPs (like Uniswap),
      // revenue is 0, so P/E will be null (correctly reflecting no cash flow to token)
      let peRatio: number | null = null;
      let psRatio: number | null = null;

      // P/E: Only calculate if protocol has revenue > 0
      if (fdv && annualizedRevenue && annualizedRevenue > 0) {
        peRatio = fdv / annualizedRevenue;
      }

      // P/S: Calculate based on total fees (demand for the service)
      if (fdv && annualizedFees && annualizedFees > 0) {
        psRatio = fdv / annualizedFees;
      }

      result.success = true;
      result.metrics = {
        equityValue: fdv,
        revenue: annualizedRevenue, // Protocol revenue (what protocol retains, adjusted if needed)
        fees: annualizedFees, // Total fees (what users pay)
        peRatio,
        psRatio,
      };
    }
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
  }

  return result;
}

async function main() {
  console.log("=".repeat(60));
  console.log("TradFi vs DeFi Metrics Fetcher");
  console.log("=".repeat(60));
  console.log(`Mode: ${isDryRun ? "DRY RUN (no database writes)" : "LIVE"}`);
  console.log(`Date: ${dateOverride ?? new Date().toISOString().split("T")[0]}`);
  console.log("");

  // Check required API keys
  if (!process.env.FMP_API_KEY) {
    console.error("ERROR: FMP_API_KEY environment variable not set");
    console.error("Get your key at: https://site.financialmodelingprep.com/developer/docs");
    process.exit(1);
  }

  const capturedAt = dateOverride ? new Date(dateOverride) : new Date();
  const entities = getAllEntities();
  const results: FetchResult[] = [];

  // Initialize database (if not dry run)
  if (!isDryRun) {
    await initializeSchema();

    // Ensure all entities and pairs exist
    console.log("Syncing entities and pairs...\n");
    for (const entity of entities) {
      await upsertEntity(entity);
    }
    for (const pair of PAIRS) {
      await upsertPair(pair);
    }
  }

  // Fetch data for all entities
  console.log("Fetching metrics...\n");

  for (const entity of entities) {
    process.stdout.write(`  ${entity.name.padEnd(25)} `);

    const result = await fetchEntityData(entity);
    results.push(result);

    if (result.success && result.metrics) {
      const pe = result.metrics.peRatio?.toFixed(1) ?? "N/A";
      const ps = result.metrics.psRatio?.toFixed(1) ?? "N/A";
      const ev = formatCurrency(result.metrics.equityValue);

      console.log(`OK  (EV: ${ev}, P/E: ${pe}, P/S: ${ps})`);

      // Store in database (if not dry run) with retry logic
      if (!isDryRun) {
        await withRetry(async () => {
          const snapshotId = await insertSnapshot(
            entity.id,
            capturedAt,
            entity.type === "tradfi" ? "fmp" : "coingecko+defillama",
            JSON.stringify(result.metrics)
          );

          await insertMetrics(snapshotId, [
            { type: "equity_value", value: result.metrics.equityValue },
            { type: "revenue", value: result.metrics.revenue },
            { type: "fees", value: result.metrics.fees },
            { type: "pe_ratio", value: result.metrics.peRatio },
            { type: "ps_ratio", value: result.metrics.psRatio },
          ]);
        });
      }
    } else {
      console.log(`FAIL (${result.error})`);
    }

    // Small delay between requests
    await new Promise((r) => setTimeout(r, 500));
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;

  console.log(`Results: ${successCount} succeeded, ${failCount} failed`);

  if (failCount > 0) {
    console.log("\nFailed entities:");
    for (const r of results.filter((r) => !r.success)) {
      console.log(`  - ${r.name}: ${r.error}`);
    }

    // Send alert if webhook configured
    if (process.env.ALERT_WEBHOOK_URL && !isDryRun) {
      await sendAlert(results.filter((r) => !r.success));
    }
  }

  if (!isDryRun) {
    closeDb();
  }

  // Exit with error code if any failures
  if (failCount > 0) {
    process.exit(1);
  }
}

function formatCurrency(value: number | null): string {
  if (value === null) return "N/A";
  if (value >= 1e12) return `$${(value / 1e12).toFixed(1)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  return `$${value.toFixed(0)}`;
}

async function sendAlert(failures: FetchResult[]) {
  const webhookUrl = process.env.ALERT_WEBHOOK_URL;
  if (!webhookUrl) return;

  try {
    const message = {
      text: `TradFi vs DeFi Fetcher: ${failures.length} entities failed`,
      blocks: [
        {
          type: "header",
          text: { type: "plain_text", text: "Metrics Fetch Failures" },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: failures.map((f) => `• *${f.name}*: ${f.error}`).join("\n"),
          },
        },
      ],
    };

    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message),
    });
  } catch (error) {
    console.error("Failed to send alert:", error);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
