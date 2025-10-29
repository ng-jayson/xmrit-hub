// Workspace API client and hooks

import * as React from "react";
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

// React hooks for workspace data fetching
export function useWorkspaces() {
  const [workspaces, setWorkspaces] = React.useState<Workspace[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    workspaceApiClient
      .getAllWorkspaces()
      .then(setWorkspaces)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const refetch = React.useCallback(() => {
    setLoading(true);
    setError(null);
    workspaceApiClient
      .getAllWorkspaces()
      .then(setWorkspaces)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return {
    workspaces,
    loading,
    error,
    refetch,
  };
}

export function useWorkspace(workspaceId: string) {
  const [workspace, setWorkspace] = React.useState<WorkspaceWithSlides | null>(
    null
  );
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!workspaceId) return;

    workspaceApiClient
      .getWorkspaceById(workspaceId)
      .then(setWorkspace)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  const refetch = React.useCallback(() => {
    if (!workspaceId) return;
    setLoading(true);
    setError(null);
    workspaceApiClient
      .getWorkspaceById(workspaceId)
      .then(setWorkspace)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  return {
    workspace,
    loading,
    error,
    refetch,
  };
}
