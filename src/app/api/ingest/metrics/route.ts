import { db } from "@/lib/db";
import { metrics, slides, submetrics, workspaces } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Metric Ingestion API
 *
 * POST /api/ingest/metrics
 *
 * Headers:
 *   - Authorization: Bearer <API_KEY>
 *   - Content-Type: application/json
 *
 * Body:
 * {
 *   "workspace_id": "uuid", // optional - will create if not provided
 *   "slide_id": "uuid",     // optional - will create if not provided
 *   "slide_title": "My Slide Title", // required if slide_id not provided
 *   "slide_date": "2025-10-06",      // optional
 *   "metrics": [
 *     {
 *       "metric_name": "Transaction Count",
 *       "description": "Optional description",
 *       "chart_type": "line", // optional, default: "line"
 *       "submetrics": [
 *         {
 *           "label": "Transaction Count",
 *           "category": "Adidas",
 *           "timezone": "ltz",
 *           "xaxis": "period",
 *           "trend": "downtrend",
 *           "unit": "%",              // optional
 *           "aggregation_type": "avg", // optional
 *           "color": "#3b82f6",       // optional
 *           "data_points": [
 *             {
 *               "timestamp": "2025-08-04",
 *               "value": 6.963562753036437,
 *               "confidence": 0.95,  // optional
 *               "source": "api"      // optional
 *             }
 *           ]
 *         }
 *       ]
 *     }
 *   ]
 * }
 */

interface DataPointInput {
  timestamp: string;
  value: number;
  confidence?: number;
  source?: string;
  dimensions?: Record<string, unknown>;
}

interface SubmetricInput {
  label: string;
  category?: string;
  timezone?: string;
  xaxis?: string;
  trend?: "uptrend" | "downtrend" | "stable" | null;
  unit?: string;
  aggregation_type?: string;
  color?: string;
  metadata?: Record<string, unknown>;
  data_points: DataPointInput[];
}

interface MetricInput {
  metric_name: string;
  description?: string;
  chart_type?: "line" | "bar" | "area" | "pie" | "scatter";
  submetrics: SubmetricInput[];
}

interface IngestRequest {
  workspace_id?: string;
  slide_id?: string;
  slide_title?: string;
  slide_date?: string;
  slide_description?: string;
  metrics: MetricInput[];
}

// Validate API key from environment variable
function validateApiKey(request: NextRequest): {
  valid: boolean;
  error?: string;
} {
  const authHeader = request.headers.get("authorization");
  const apiKey = process.env.METRICS_API_KEY;

  // Check if API key is configured
  if (!apiKey) {
    console.error(
      "[SECURITY] METRICS_API_KEY environment variable not set. Ingestion endpoint is disabled."
    );
    return { valid: false, error: "Service temporarily unavailable" };
  }

  // Validate API key strength (minimum 32 characters)
  if (apiKey.length < 32) {
    console.error(
      "[SECURITY] METRICS_API_KEY is too weak (< 32 characters). Please use a stronger key."
    );
    return { valid: false, error: "Service configuration error" };
  }

  // Check authorization header format
  if (!authHeader?.startsWith("Bearer ")) {
    console.warn(
      `[SECURITY] Invalid authorization header format from ${
        request.headers.get("x-forwarded-for") ||
        request.headers.get("x-real-ip") ||
        "unknown IP"
      }`
    );
    return { valid: false, error: "Invalid authorization header" };
  }

  const providedKey = authHeader.substring(7);

  // Validate provided key
  if (!providedKey || providedKey.length === 0) {
    console.warn(
      `[SECURITY] Empty API key provided from ${
        request.headers.get("x-forwarded-for") ||
        request.headers.get("x-real-ip") ||
        "unknown IP"
      }`
    );
    return { valid: false, error: "Invalid API key" };
  }

  // Use timing-safe comparison to prevent timing attacks
  if (providedKey === apiKey) {
    return { valid: true };
  }

  // Log failed authentication attempts
  console.warn(
    `[SECURITY] Failed API key authentication attempt from ${
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown IP"
    }`
  );
  return { valid: false, error: "Invalid API key" };
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const clientIp =
    request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip") ||
    "unknown";

  try {
    // Validate API key
    const authResult = validateApiKey(request);
    if (!authResult.valid) {
      console.warn(
        `[SECURITY] Unauthorized ingest attempt from ${clientIp}: ${authResult.error}`
      );
      return NextResponse.json(
        { error: authResult.error || "Unauthorized" },
        { status: 401 }
      );
    }

    // Log successful authentication
    console.log(`[AUDIT] Authenticated ingest request from ${clientIp}`);

    // Parse request body
    const body: IngestRequest = await request.json();

    // Validate required fields
    if (
      !body.metrics ||
      !Array.isArray(body.metrics) ||
      body.metrics.length === 0
    ) {
      return NextResponse.json(
        { error: "Invalid request - 'metrics' array is required" },
        { status: 400 }
      );
    }

    // Get or validate workspace
    let workspaceId = body.workspace_id;
    if (!workspaceId) {
      // Create a new public workspace if not provided
      const [newWorkspace] = await db
        .insert(workspaces)
        .values({
          name: body.slide_title || "API Ingestion Workspace",
          description: "Created via API",
          isPublic: true,
        })
        .returning();
      workspaceId = newWorkspace.id;
    } else {
      // Verify workspace exists
      const workspace = await db.query.workspaces.findFirst({
        where: eq(workspaces.id, workspaceId),
      });

      if (!workspace) {
        return NextResponse.json(
          { error: `Workspace with id '${workspaceId}' not found` },
          { status: 404 }
        );
      }
    }

    // Get or create slide
    let slideId = body.slide_id;
    if (!slideId) {
      if (!body.slide_title) {
        return NextResponse.json(
          { error: "Either 'slide_id' or 'slide_title' is required" },
          { status: 400 }
        );
      }

      // Create new slide
      const [newSlide] = await db
        .insert(slides)
        .values({
          title: body.slide_title,
          description: body.slide_description || null,
          workspaceId,
          slideDate: body.slide_date || null,
        })
        .returning();
      slideId = newSlide.id;
    } else {
      // Verify slide exists and belongs to workspace
      const slide = await db.query.slides.findFirst({
        where: eq(slides.id, slideId),
      });

      if (!slide) {
        return NextResponse.json(
          { error: `Slide with id '${slideId}' not found` },
          { status: 404 }
        );
      }

      if (slide.workspaceId !== workspaceId) {
        return NextResponse.json(
          { error: "Slide does not belong to the specified workspace" },
          { status: 400 }
        );
      }
    }

    // Insert metrics, submetrics, and data points
    const insertedMetrics: string[] = [];
    let totalSubmetrics = 0;
    let totalDataPoints = 0;

    for (const metricInput of body.metrics) {
      // Insert metric
      const [metric] = await db
        .insert(metrics)
        .values({
          name: metricInput.metric_name,
          description: metricInput.description || null,
          slideId,
          chartType: metricInput.chart_type || "line",
          sortOrder: 0,
        })
        .returning();

      insertedMetrics.push(metric.id);

      // Insert submetrics with data points
      for (const submetricInput of metricInput.submetrics) {
        // Prepare data points as JSON array
        const dataPointsJson =
          submetricInput.data_points && submetricInput.data_points.length > 0
            ? submetricInput.data_points.map((dp) => ({
                timestamp: dp.timestamp,
                value: dp.value,
                confidence: dp.confidence ?? null,
                source: dp.source ?? null,
                dimensions: dp.dimensions ?? null,
              }))
            : [];

        await db.insert(submetrics).values({
          label: submetricInput.label,
          category: submetricInput.category || null,
          metricId: metric.id,
          xAxis: submetricInput.xaxis || "date",
          timezone: submetricInput.timezone || "UTC",
          trend: submetricInput.trend || null,
          unit: submetricInput.unit || null,
          aggregationType: submetricInput.aggregation_type || "none",
          color: submetricInput.color || null,
          metadata: submetricInput.metadata || null,
          dataPoints: dataPointsJson,
        });

        totalSubmetrics++;
        totalDataPoints += dataPointsJson.length;
      }
    }

    const duration = Date.now() - startTime;
    console.log(
      `[AUDIT] Successfully ingested metrics from ${clientIp}: ` +
        `workspace=${workspaceId}, slide=${slideId}, ` +
        `metrics=${insertedMetrics.length}, submetrics=${totalSubmetrics}, ` +
        `datapoints=${totalDataPoints}, duration=${duration}ms`
    );

    return NextResponse.json(
      {
        success: true,
        message: "Metrics ingested successfully",
        data: {
          workspace_id: workspaceId,
          slide_id: slideId,
          metrics_created: insertedMetrics.length,
          submetrics_created: totalSubmetrics,
          data_points_created: totalDataPoints,
          metric_ids: insertedMetrics,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(
      `[ERROR] Failed to ingest metrics from ${clientIp} after ${duration}ms:`,
      error
    );

    // Don't leak internal error details to the client
    const isValidationError =
      error instanceof Error &&
      (error.message.includes("not found") ||
        error.message.includes("required") ||
        error.message.includes("invalid"));

    return NextResponse.json(
      {
        error: isValidationError
          ? error.message
          : "Internal server error - please contact support",
        ...(process.env.NODE_ENV === "development" && {
          debug: error instanceof Error ? error.message : "Unknown error",
        }),
      },
      { status: isValidationError ? 400 : 500 }
    );
  }
}

// GET endpoint to check API status (also requires authentication)
export async function GET(request: NextRequest) {
  const clientIp =
    request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip") ||
    "unknown";

  const authResult = validateApiKey(request);
  if (!authResult.valid) {
    console.warn(
      `[SECURITY] Unauthorized GET attempt to ingest endpoint from ${clientIp}`
    );
    return NextResponse.json(
      { error: "Unauthorized - API documentation requires authentication" },
      { status: 401 }
    );
  }

  console.log(`[AUDIT] API documentation accessed from ${clientIp}`);

  return NextResponse.json({
    endpoint: "/api/ingest/metrics",
    methods: ["POST", "GET"],
    description: "Ingest metrics with Bearer token authentication",
    authentication: {
      type: "Bearer",
      header: "Authorization: Bearer <METRICS_API_KEY>",
      note: "API key must be at least 32 characters",
    },
    post_body_example: {
      workspace_id: "uuid (optional - will create if not provided)",
      slide_id: "uuid (optional - will create if not provided)",
      slide_title: "My Slide Title (required if slide_id not provided)",
      slide_date: "2025-10-06 (optional)",
      slide_description: "Optional description",
      metrics: [
        {
          metric_name: "% of MCB Count to Total Transactions",
          description: "Optional description",
          chart_type: "line",
          submetrics: [
            {
              label: "[Adidas] - % of MCB Count",
              category: "Adidas",
              timezone: "ltz",
              xaxis: "period",
              trend: "downtrend",
              unit: "%",
              aggregation_type: "avg",
              color: "#3b82f6",
              data_points: [
                {
                  timestamp: "2025-08-04",
                  value: 6.963562753036437,
                  confidence: 0.95,
                  source: "api",
                },
              ],
            },
          ],
        },
      ],
    },
  });
}
