/**
 * Submetric-related database entity types
 */

export interface DataPointJson {
  timestamp: string; // ISO date string
  value: number;
  confidence?: number | null;
  source?: string | null;
  dimensions?: Record<string, unknown> | null;
}

export interface Submetric {
  id: string;
  label: string;
  category: string | null;
  metricId: string;
  xAxis: string;
  timezone: string | null;
  trend: string | null;
  unit: string | null;
  aggregationType: string | null;
  color: string | null;
  metadata: any; // JSON object for additional metadata
  dataPoints: DataPointJson[] | null; // Data points stored as JSON array
  createdAt: Date;
  updatedAt: Date;
}
