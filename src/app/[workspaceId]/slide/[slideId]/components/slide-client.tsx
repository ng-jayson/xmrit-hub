"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { SlideContainer } from "./slide-container";
import type { SlideWithMetrics } from "@/types/db/slide";
import type { Workspace } from "@/types/db/workspace";

interface SlideClientProps {
  slide: SlideWithMetrics;
  workspace: Workspace;
}

export function SlideClient({ slide, workspace }: SlideClientProps) {
  const router = useRouter();

  // Verify slide belongs to the workspace
  useEffect(() => {
    if (slide && workspace && slide.workspaceId !== workspace.id) {
      router.push("/404");
    }
  }, [slide, workspace, router]);

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{slide.title}</h1>
            {slide.description && (
              <p className="text-muted-foreground mt-2">{slide.description}</p>
            )}
            {slide.slideDate && (
              <p className="text-sm text-muted-foreground mt-1">
                Date: {new Date(slide.slideDate).toLocaleDateString("en-CA")}
              </p>
            )}
          </div>
        </div>
      </div>

      <SlideContainer metrics={slide.metrics} />
    </div>
  );
}
