import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAllPairComparisons, getLastUpdateTime } from "@/lib/repository";
import type { ApiResponse, LatestMetricsResponse } from "@/types/metrics";

// ISR: Revalidate every hour
export const revalidate = 3600;

const querySchema = z.object({
  category: z.string().optional(),
});

/**
 * GET /api/latest
 * Returns latest metrics for all pairs with optional category filter.
 *
 * Query params:
 *   category - Filter by TradFi or DeFi category (e.g., "Exchange", "Lending")
 *
 * Response:
 *   { success: true, data: { pairs: PairComparison[], lastUpdated: string } }
 */
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<LatestMetricsResponse>>> {
  try {
    const { searchParams } = new URL(request.url);
    const params = querySchema.parse({
      category: searchParams.get("category") || undefined,
    });

    let pairs = await getAllPairComparisons();

    // Filter by category if specified
    if (params.category) {
      const categoryLower = params.category.toLowerCase();
      pairs = pairs.filter(
        (p) =>
          p.tradfi.category.toLowerCase() === categoryLower ||
          p.defi.category.toLowerCase() === categoryLower
      );
    }

    const lastUpdated = await getLastUpdateTime();

    return NextResponse.json({
      success: true,
      data: {
        pairs,
        lastUpdated: lastUpdated ?? new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("API /latest error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid query parameters",
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
