"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useWorkspace, useDeleteSlide } from "@/lib/api";
import { SlideTable } from "./components/slide-table";
import * as React from "react";

interface WorkspacePageProps {
  params: Promise<{
    workspaceId: string;
  }>;
}

export default function WorkspacePage({ params }: WorkspacePageProps) {
  const { workspaceId } = use(params);
  const router = useRouter();
  const { workspace, loading } = useWorkspace(workspaceId);
  const deleteSlide = useDeleteSlide();

  const handleCreateSlide = React.useCallback(() => {
    // TODO: Implement slide creation
    console.log("Creating new slide");
  }, []);

  const handleCreateMetric = React.useCallback((slideId: string) => {
    // TODO: Implement metric creation
    console.log("Creating new metric for slide:", slideId);
  }, []);

  const handleEditSlide = React.useCallback((slide: any) => {
    // TODO: Implement slide editing
    console.log("Editing slide:", slide.title);
  }, []);

  const handleDeleteSlide = React.useCallback(
    async (slideId: string) => {
      try {
        // Show confirmation dialog
        if (
          !confirm(
            "Are you sure you want to delete this slide? This will also delete all metrics and data points associated with it. This action cannot be undone."
          )
        ) {
          return;
        }

        // Call the mutation - React Query will automatically invalidate the cache
        // and update both the page and sidebar!
        await deleteSlide.mutateAsync(slideId);

        console.log("Slide deleted successfully:", slideId);
      } catch (error) {
        console.error("Error deleting slide:", error);
        alert("Failed to delete slide. Please try again.");
      }
    },
    [deleteSlide]
  );

  const handleViewSlide = React.useCallback(
    (slideId: string) => {
      router.push(`/${workspaceId}/slide/${slideId}`);
    },
    [router, workspaceId]
  );

  // Show loading skeleton while workspace is being fetched
  if (loading || !workspace) {
    return (
      <SlideTable
        currentWorkspace={{
          id: workspaceId,
          name: "",
          description: null,
          settings: null,
          isArchived: false,
          isPublic: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        }}
        slides={[]}
        onCreateSlide={handleCreateSlide}
        onEditSlide={handleEditSlide}
        onDeleteSlide={handleDeleteSlide}
        isLoading={true}
      />
    );
  }

  return (
    <SlideTable
      currentWorkspace={workspace}
      slides={workspace.slides}
      onCreateSlide={handleCreateSlide}
      onEditSlide={handleEditSlide}
      onDeleteSlide={handleDeleteSlide}
      isLoading={false}
    />
  );
}
