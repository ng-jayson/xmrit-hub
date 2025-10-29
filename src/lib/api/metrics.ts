// Metrics API client and hooks

import * as React from "react";
import { BaseApiClient } from "./base";
import type { Metric } from "@/types/db/metric";

export class MetricApiClient extends BaseApiClient {
  async createMetric(slideId: string, data: any): Promise<Metric> {
    return this.request(`/slides/${slideId}/metrics`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateMetric(metricId: string, data: any): Promise<Metric> {
    return this.request(`/metrics/${metricId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteMetric(metricId: string): Promise<void> {
    return this.request(`/metrics/${metricId}`, {
      method: "DELETE",
    });
  }

  async getMetricById(metricId: string): Promise<Metric> {
    const response = await this.request<{ metric: Metric }>(
      `/metrics/${metricId}`
    );
    return response.metric;
  }
}

// Default metric client instance
export const metricApiClient = new MetricApiClient();

// React hooks for metric data fetching
export function useMetric(metricId: string) {
  const [metric, setMetric] = React.useState<Metric | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!metricId) return;

    metricApiClient
      .getMetricById(metricId)
      .then(setMetric)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [metricId]);

  const refetch = React.useCallback(() => {
    if (!metricId) return;
    setLoading(true);
    setError(null);
    metricApiClient
      .getMetricById(metricId)
      .then(setMetric)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [metricId]);

  return {
    metric,
    loading,
    error,
    refetch,
  };
}
