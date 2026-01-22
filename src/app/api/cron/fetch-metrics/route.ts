import { NextResponse } from "next/server";
import { PAIRS, getAllEntities, type Entity } from "@/data/pairs";
import { initializeSchema } from "@/lib/schema";
import { upsertEntity, upsertPair, insertSnapshot, insertMetrics } from "@/lib/repository";
import { fetchTradFiData } from "@/lib/api/fmp";
import { fetchDeFiTokenData } from "@/lib/api/coingecko";
import { fetchDeFiFeesData } from "@/lib/api/defillama";

// Vercel cron jobs require a GET handler
export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes max

interface FetchResult {
  entityId: string;
  name: string;
  success: boolean;
  error?: string;
}

async function fetchEntityData(entity: Entity): Promise<FetchResult & { metrics?: Record<string, number | null> }> {
  const result: FetchResult = {
    entityId: entity.id,
    name: entity.name,
    success: false,
  };

  try {
    if (entity.type === "tradfi") {
      if (!entity.ticker) {
        return { ...result, error: "No ticker" };
      }

      const data = await fetchTradFiData(entity.ticker);
      if (!data) {
        return { ...result, error: "FMP returned no data" };
      }

      return {
        ...result,
        success: true,
        metrics: {
          equityValue: data.marketCap,
          revenue: data.ttmRevenue,
          fees: data.ttmRevenue,
          peRatio: data.peRatio,
          psRatio: data.psRatio,
        },
      };
    } else {
      const [tokenData, feesData] = await Promise.all([
        entity.coingeckoId ? fetchDeFiTokenData(entity.coingeckoId) : null,
        entity.defiLlamaId ? fetchDeFiFeesData(entity.defiLlamaId) : null,
      ]);

      if (!tokenData && !feesData) {
        return { ...result, error: "No DeFi data available" };
      }

      const fdv = tokenData?.fdv ?? tokenData?.marketCap ?? null;
      const annualizedRevenue = feesData?.annualizedRevenue ?? null;
      const annualizedFees = feesData?.annualizedFees ?? null;

      const peRatio = fdv && annualizedRevenue && annualizedRevenue > 0 ? fdv / annualizedRevenue : null;
      const psRatio = fdv && annualizedFees && annualizedFees > 0 ? fdv / annualizedFees : null;

      return {
        ...result,
        success: true,
        metrics: {
          equityValue: fdv,
          revenue: annualizedRevenue,
          fees: annualizedFees,
          peRatio,
          psRatio,
        },
      };
    }
  } catch (error) {
    return { ...result, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function GET(request: Request) {
  // Verify cron secret for security (optional but recommended)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();
  const results: FetchResult[] = [];
  const capturedAt = new Date();

  try {
    // Initialize schema
    await initializeSchema();

    // Sync entities and pairs
    const entities = getAllEntities();
    for (const entity of entities) {
      await upsertEntity(entity);
    }
    for (const pair of PAIRS) {
      await upsertPair(pair);
    }

    // Fetch all entities
    for (const entity of entities) {
      const result = await fetchEntityData(entity);
      results.push(result);

      if (result.success && result.metrics) {
        const snapshotId = await insertSnapshot(
          entity.id,
          capturedAt,
          entity.type === "tradfi" ? "fmp" : "coingecko+defillama",
          JSON.stringify(result.metrics)
        );

        await insertMetrics(snapshotId, [
          { type: "equity_value", value: result.metrics.equityValue ?? null },
          { type: "revenue", value: result.metrics.revenue ?? null },
          { type: "fees", value: result.metrics.fees ?? null },
          { type: "pe_ratio", value: result.metrics.peRatio ?? null },
          { type: "ps_ratio", value: result.metrics.psRatio ?? null },
        ]);
      }

      // Rate limiting delay
      await new Promise((r) => setTimeout(r, 500));
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;
    const duration = Date.now() - startTime;

    // Send alert on failures
    if (failCount > 0 && process.env.ALERT_WEBHOOK_URL) {
      await sendAlert(results.filter((r) => !r.success));
    }

    return NextResponse.json({
      success: failCount === 0,
      message: `Fetched ${successCount}/${results.length} entities`,
      duration: `${duration}ms`,
      timestamp: capturedAt.toISOString(),
      failures: results.filter((r) => !r.success).map((r) => ({ name: r.name, error: r.error })),
    });
  } catch (error) {
    console.error("Cron job error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

async function sendAlert(failures: FetchResult[]) {
  const webhookUrl = process.env.ALERT_WEBHOOK_URL;
  if (!webhookUrl) return;

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `Metrics Fetch: ${failures.length} failures`,
        failures: failures.map((f) => ({ name: f.name, error: f.error })),
      }),
    });
  } catch (e) {
    console.error("Alert failed:", e);
  }
}
