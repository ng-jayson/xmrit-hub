// Workspace API client and hooks

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BaseApiClient } from "./base";
import type { Workspace, WorkspaceWithSlides } from "@/types/db/workspace";

export class WorkspaceApiClient extends BaseApiClient {
  async getAllWorkspaces(): Promise<Workspace[]> {
    const response = await this.request<{ workspaces: Workspace[] }>(
      "/workspaces"
    );
    return response.workspaces;
  }

  async getWorkspaceById(workspaceId: string): Promise<WorkspaceWithSlides> {
    const response = await this.request<{ workspace: WorkspaceWithSlides }>(
      `/workspaces/${workspaceId}`
    );
    return response.workspace;
  }

  async createWorkspace(data: Partial<Workspace>): Promise<Workspace> {
    return this.request("/workspaces", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateWorkspace(
    workspaceId: string,
    data: Partial<Workspace>
  ): Promise<Workspace> {
    return this.request(`/workspaces/${workspaceId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteWorkspace(workspaceId: string): Promise<void> {
    return this.request(`/workspaces/${workspaceId}`, {
      method: "DELETE",
    });
  }
}

// Default workspace client instance
export const workspaceApiClient = new WorkspaceApiClient();

// Query keys for React Query cache management
export const workspaceKeys = {
  all: ["workspaces"] as const,
  lists: () => [...workspaceKeys.all, "list"] as const,
  list: () => [...workspaceKeys.lists()] as const,
  details: () => [...workspaceKeys.all, "detail"] as const,
  detail: (id: string) => [...workspaceKeys.details(), id] as const,
};

// React Query hooks for workspace data fetching
export function useWorkspaces() {
  const query = useQuery({
    queryKey: workspaceKeys.list(),
    queryFn: () => workspaceApiClient.getAllWorkspaces(),
  });

  return {
    workspaces: query.data || [],
    loading: query.isLoading,
    error: query.error?.message || null,
    refetch: query.refetch,
  };
}

export function useWorkspace(workspaceId: string) {
  const query = useQuery({
    queryKey: workspaceKeys.detail(workspaceId),
    queryFn: () => workspaceApiClient.getWorkspaceById(workspaceId),
    enabled: !!workspaceId,
  });

  return {
    workspace: query.data || null,
    loading: query.isLoading,
    error: query.error?.message || null,
    refetch: query.refetch,
  };
}

// Mutation hooks for workspace operations
export function useCreateWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Workspace>) =>
      workspaceApiClient.createWorkspace(data),
    onSuccess: () => {
      // Invalidate and refetch workspaces list
      queryClient.invalidateQueries({ queryKey: workspaceKeys.list() });
    },
  });
}

export function useUpdateWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workspaceId,
      data,
    }: {
      workspaceId: string;
      data: Partial<Workspace>;
    }) => workspaceApiClient.updateWorkspace(workspaceId, data),
    onSuccess: (_, variables) => {
      // Invalidate specific workspace and list
      queryClient.invalidateQueries({
        queryKey: workspaceKeys.detail(variables.workspaceId),
      });
      queryClient.invalidateQueries({ queryKey: workspaceKeys.list() });
    },
  });
}

export function useDeleteWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (workspaceId: string) =>
      workspaceApiClient.deleteWorkspace(workspaceId),
    onSuccess: (_, workspaceId) => {
      // Remove from cache and invalidate list
      queryClient.removeQueries({
        queryKey: workspaceKeys.detail(workspaceId),
      });
      queryClient.invalidateQueries({ queryKey: workspaceKeys.list() });
    },
  });
}
