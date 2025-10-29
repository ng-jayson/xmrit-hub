import { db } from "@/lib/db";
import { workspaces, slides } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { Workspace, WorkspaceWithSlides } from "@/types/db/workspace";

/**
 * Server-side workspace actions for API routes
 */

export async function getAllWorkspaces(): Promise<Workspace[]> {
  try {
    const result = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.isArchived, false))
      .orderBy(workspaces.updatedAt);

    return result;
  } catch (error) {
    console.error("Error fetching all workspaces:", error);
    throw new Error("Failed to fetch workspaces");
  }
}

export async function getWorkspaceById(
  workspaceId: string
): Promise<WorkspaceWithSlides | null> {
  try {
    // Get workspace with its slides
    const workspace = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .limit(1);

    if (!workspace.length) {
      return null;
    }

    // Get slides for this workspace with their metrics
    const workspaceSlides = await db.query.slides.findMany({
      where: eq(slides.workspaceId, workspaceId),
      with: {
        metrics: {
          with: {
            submetrics: true,
          },
        },
      },
      orderBy: [slides.sortOrder, slides.createdAt],
    });

    return {
      ...workspace[0],
      slides: workspaceSlides,
    };
  } catch (error) {
    console.error("Error fetching workspace by ID:", error);
    throw new Error("Failed to fetch workspace");
  }
}

export async function createWorkspace(
  data: Partial<Workspace>
): Promise<Workspace> {
  try {
    const newWorkspace = await db
      .insert(workspaces)
      .values({
        name: data.name || "Untitled Workspace",
        description: data.description,
        settings: data.settings,
        isArchived: data.isArchived || false,
        isPublic: data.isPublic ?? true,
      })
      .returning();

    return newWorkspace[0];
  } catch (error) {
    console.error("Error creating workspace:", error);
    throw new Error("Failed to create workspace");
  }
}

export async function updateWorkspace(
  workspaceId: string,
  data: Partial<Workspace>
): Promise<Workspace> {
  try {
    const updatedWorkspace = await db
      .update(workspaces)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(workspaces.id, workspaceId))
      .returning();

    if (!updatedWorkspace.length) {
      throw new Error("Workspace not found");
    }

    return updatedWorkspace[0];
  } catch (error) {
    console.error("Error updating workspace:", error);
    throw new Error("Failed to update workspace");
  }
}

export async function deleteWorkspace(workspaceId: string): Promise<void> {
  try {
    // Soft delete by marking as archived
    await db
      .update(workspaces)
      .set({
        isArchived: true,
        updatedAt: new Date(),
      })
      .where(eq(workspaces.id, workspaceId));
  } catch (error) {
    console.error("Error deleting workspace:", error);
    throw new Error("Failed to delete workspace");
  }
}
