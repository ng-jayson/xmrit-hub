/**
 * Workspace-related database entity types
 */

import type { SlideWithMetrics } from "@/types/db/slide";

export interface Workspace {
  id: string;
  name: string;
  description: string | null;
  settings: any; // JSON object for workspace-level settings
  isArchived: boolean | null;
  isPublic: boolean | null; // Public workspaces accessible to all
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Extended workspace type with related slides
 */
export interface WorkspaceWithSlides extends Workspace {
  slides: SlideWithMetrics[];
}
