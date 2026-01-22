import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getHistoricalMetrics, getLastUpdateTime } from "@/lib/repository";
import type { ApiResponse, HistoryResponse, MetricType } from "@/types/metrics";

// ISR: Revalidate every hour
export const revalidate = 3600;

const querySchema = z.object({
  entity: z.string().min(1, "Entity ID is required"),
  metric: z.enum(["pe_ratio", "ps_ratio", "equity_value", "revenue", "fees"]),
  limit: z.coerce.number().int().min(1).max(260).optional().default(52),
});

/**
 * GET /api/history
 * Returns historical time series for a specific entity and metric.
 *
 * Query params:
 *   entity - Entity ID (required, e.g., "uniswap", "nasdaq")
 *   metric - Metric type (required: pe_ratio, ps_ratio, equity_value, revenue, fees)
 *   limit  - Number of data points (optional, default 52, max 260 = 5 years weekly)
 *
 * Response:
 *   { success: true, data: { series: HistoricalSeries, lastUpdated: string } }
 */
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<HistoryResponse>>> {
  try {
    const { searchParams } = new URL(request.url);

    const params = querySchema.parse({
      entity: searchParams.get("entity") || "",
      metric: searchParams.get("metric") || "",
      limit: searchParams.get("limit") || undefined,
    });

    const data = await getHistoricalMetrics(
      params.entity,
      params.metric as MetricType,
      params.limit
    );

    const lastUpdated = await getLastUpdateTime();

    return NextResponse.json({
      success: true,
      data: {
        series: {
          entityId: params.entity,
          metricType: params.metric as MetricType,
          data,
        },
        lastUpdated: lastUpdated ?? new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("API /history error:", error);

    if (error instanceof z.ZodError) {
      const messages = error.issues.map((e) => `${e.path.join(".")}: ${e.message}`);
      return NextResponse.json(
        {
          success: false,
          error: `Invalid parameters: ${messages.join(", ")}`,
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
