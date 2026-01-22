import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { PAIRS } from "@/data/pairs";
import { getLatestMetrics, getLastUpdateTime } from "@/lib/repository";
import type { ApiResponse, EntityMetrics } from "@/types/metrics";

// ISR: Revalidate every hour
export const revalidate = 3600;

const querySchema = z.object({
  id: z.coerce.number().int().min(1).max(10).optional(),
});

interface PairWithMetrics {
  id: number;
  theme: string;
  tradfi: {
    id: string;
    name: string;
    type: "tradfi";
    category: string;
    ticker?: string;
    metrics: EntityMetrics | null;
  };
  defi: {
    id: string;
    name: string;
    type: "defi";
    category: string;
    coingeckoId?: string;
    defiLlamaId?: string;
    metrics: EntityMetrics | null;
  };
}

interface PairsResponse {
  pairs: PairWithMetrics[];
  lastUpdated: string;
}

/**
 * GET /api/pairs
 * Returns pair metadata with latest metrics for each entity.
 *
 * Query params:
 *   id - Filter to a specific pair ID (1-10)
 *
 * Response:
 *   { success: true, data: { pairs: PairWithMetrics[], lastUpdated: string } }
 */
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<PairsResponse>>> {
  try {
    const { searchParams } = new URL(request.url);

    const params = querySchema.parse({
      id: searchParams.get("id") || undefined,
    });

    // Filter pairs if ID specified
    let pairsToFetch = PAIRS;
    if (params.id) {
      pairsToFetch = PAIRS.filter((p) => p.id === params.id);
    }

    // Fetch metrics for each pair
    const pairsWithMetrics: PairWithMetrics[] = await Promise.all(
      pairsToFetch.map(async (pair) => {
        const [tradfiMetrics, defiMetrics] = await Promise.all([
          getLatestMetrics(pair.tradfi.id),
          getLatestMetrics(pair.defi.id),
        ]);

        return {
          id: pair.id,
          theme: pair.theme,
          tradfi: {
            id: pair.tradfi.id,
            name: pair.tradfi.name,
            type: "tradfi" as const,
            category: pair.tradfi.category,
            ticker: pair.tradfi.ticker,
            metrics: tradfiMetrics,
          },
          defi: {
            id: pair.defi.id,
            name: pair.defi.name,
            type: "defi" as const,
            category: pair.defi.category,
            coingeckoId: pair.defi.coingeckoId,
            defiLlamaId: pair.defi.defiLlamaId,
            metrics: defiMetrics,
          },
        };
      })
    );

    const lastUpdated = await getLastUpdateTime();

    return NextResponse.json({
      success: true,
      data: {
        pairs: pairsWithMetrics,
        lastUpdated: lastUpdated ?? new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("API /pairs error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid pair ID (must be 1-10)",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
