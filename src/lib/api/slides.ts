// Slide API client and hooks

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BaseApiClient } from "./base";
import type { SlideWithMetrics } from "@/types/db/slide";
import { workspaceKeys } from "./workspaces";

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

// Query keys for React Query cache management
export const slideKeys = {
  all: ["slides"] as const,
  lists: () => [...slideKeys.all, "list"] as const,
  list: (workspaceId?: string) =>
    workspaceId
      ? ([...slideKeys.lists(), workspaceId] as const)
      : slideKeys.lists(),
  details: () => [...slideKeys.all, "detail"] as const,
  detail: (id: string) => [...slideKeys.details(), id] as const,
};

// React Query hooks for slide data fetching
export function useSlide(slideId: string) {
  const query = useQuery({
    queryKey: slideKeys.detail(slideId),
    queryFn: () => slideApiClient.getSlideById(slideId),
    enabled: !!slideId,
  });

  return {
    slide: query.data || null,
    loading: query.isLoading,
    error: query.error?.message || null,
    refetch: query.refetch,
  };
}

// Mutation hooks for slide operations
export function useCreateSlide() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceId, data }: { workspaceId: string; data: any }) =>
      slideApiClient.createSlide(workspaceId, data),
    onSuccess: (_, variables) => {
      // Invalidate workspace to refetch slides
      queryClient.invalidateQueries({
        queryKey: workspaceKeys.detail(variables.workspaceId),
      });
    },
  });
}

export function useUpdateSlide() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ slideId, data }: { slideId: string; data: any }) =>
      slideApiClient.updateSlide(slideId, data),
    onSuccess: (data, variables) => {
      // Invalidate specific slide
      queryClient.invalidateQueries({
        queryKey: slideKeys.detail(variables.slideId),
      });
      // Also invalidate the workspace since slides list might have changed
      if (data.workspaceId) {
        queryClient.invalidateQueries({
          queryKey: workspaceKeys.detail(data.workspaceId),
        });
      }
    },
  });
}

export function useDeleteSlide() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (slideId: string) => slideApiClient.deleteSlide(slideId),
    onSuccess: (_, slideId) => {
      // Remove slide from cache
      queryClient.removeQueries({ queryKey: slideKeys.detail(slideId) });
      // Invalidate all workspaces to update sidebar and page
      queryClient.invalidateQueries({ queryKey: workspaceKeys.all });
    },
  });
}
