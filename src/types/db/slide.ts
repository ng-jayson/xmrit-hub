/**
 * Slide-related database entity types
 */

import type { MetricWithSubmetrics } from "@/types/db/metric";

export interface Slide {
  id: string;
  title: string;
  description: string | null;
  workspaceId: string;
  slideDate: string | null; // Date string from database (YYYY-MM-DD format)
  sortOrder: number | null;
  layout: any; // JSON object for slide layout configuration
  isPublished: boolean | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Extended slide type with related metrics
 */
export interface SlideWithMetrics extends Slide {
  metrics: MetricWithSubmetrics[];
}
