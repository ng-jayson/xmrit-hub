/**
 * Metric-related database entity types
 */

import type { Submetric } from "@/types/db/submetric";

export interface Metric {
  id: string;
  name: string;
  description: string | null;
  slideId: string;
  sortOrder: number | null;
  chartType: string | null;
  chartConfig: any; // JSON object for chart configuration
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Extended metric type with related submetrics (with embedded data points)
 */
export interface MetricWithSubmetrics extends Metric {
  submetrics: Submetric[];
}
