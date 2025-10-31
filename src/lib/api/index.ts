// Main API client exports - centralized access point

// Export all API clients
export { BaseApiClient } from "./base";
export { WorkspaceApiClient, workspaceApiClient } from "./workspaces";
export { SlideApiClient, slideApiClient } from "./slides";
export { MetricApiClient, metricApiClient } from "./metrics";

// Export all hooks
export {
  useWorkspaces,
  useWorkspace,
  useCreateWorkspace,
  useUpdateWorkspace,
  useDeleteWorkspace,
  workspaceKeys,
} from "./workspaces";
export {
  useSlide,
  useCreateSlide,
  useUpdateSlide,
  useDeleteSlide,
  slideKeys,
} from "./slides";
export { useMetric } from "./metrics";

// Export types
export type { ApiError } from "./base";

// Legacy compatibility - create a combined client for backward compatibility
import { BaseApiClient } from "./base";
import { WorkspaceApiClient } from "./workspaces";
import { SlideApiClient } from "./slides";
import { MetricApiClient } from "./metrics";

export class ApiClient extends BaseApiClient {
  public workspaces: WorkspaceApiClient;
  public slides: SlideApiClient;
  public metrics: MetricApiClient;

  constructor(baseUrl: string = "") {
    super(baseUrl);
    this.workspaces = new WorkspaceApiClient(baseUrl);
    this.slides = new SlideApiClient(baseUrl);
    this.metrics = new MetricApiClient(baseUrl);
  }

  // Legacy methods for backward compatibility
  async getAllWorkspaces() {
    return this.workspaces.getAllWorkspaces();
  }

  async getWorkspaceById(workspaceId: string) {
    return this.workspaces.getWorkspaceById(workspaceId);
  }

  async getSlideById(slideId: string) {
    return this.slides.getSlideById(slideId);
  }

  async createWorkspace(data: any) {
    return this.workspaces.createWorkspace(data);
  }

  async createSlide(workspaceId: string, data: any) {
    return this.slides.createSlide(workspaceId, data);
  }

  async createMetric(slideId: string, data: any) {
    return this.metrics.createMetric(slideId, data);
  }
}

// Default client instance for backward compatibility
export const apiClient = new ApiClient();
