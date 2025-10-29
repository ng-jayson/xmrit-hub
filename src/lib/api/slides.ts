// Slide API client and hooks

import * as React from "react";
import { BaseApiClient } from "./base";
import type { SlideWithMetrics } from "@/types/db/slide";

export class SlideApiClient extends BaseApiClient {
  async getSlideById(slideId: string): Promise<SlideWithMetrics> {
    const response = await this.request<{ slide: SlideWithMetrics }>(
      `/slides/${slideId}`
    );
    return response.slide;
  }

  async createSlide(workspaceId: string, data: any): Promise<SlideWithMetrics> {
    return this.request(`/workspaces/${workspaceId}/slides`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateSlide(slideId: string, data: any): Promise<SlideWithMetrics> {
    return this.request(`/slides/${slideId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteSlide(slideId: string): Promise<void> {
    return this.request(`/slides/${slideId}`, {
      method: "DELETE",
    });
  }
}

// Default slide client instance
export const slideApiClient = new SlideApiClient();

// React hooks for slide data fetching
export function useSlide(slideId: string) {
  const [slide, setSlide] = React.useState<SlideWithMetrics | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!slideId) return;

    slideApiClient
      .getSlideById(slideId)
      .then(setSlide)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [slideId]);

  const refetch = React.useCallback(() => {
    if (!slideId) return;
    setLoading(true);
    setError(null);
    slideApiClient
      .getSlideById(slideId)
      .then(setSlide)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [slideId]);

  return {
    slide,
    loading,
    error,
    refetch,
  };
}
