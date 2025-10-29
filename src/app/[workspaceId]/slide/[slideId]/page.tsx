import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { slides, workspaces } from "@/lib/db/schema";
import { SlideClient } from "./components/slide-client";
import type { SlideWithMetrics } from "@/types/db/slide";
import type { Workspace } from "@/types/db/workspace";

interface SlidePageProps {
  params: Promise<{
    workspaceId: string;
    slideId: string;
  }>;
}

// Server-side data fetching functions
async function getSlideData(slideId: string): Promise<SlideWithMetrics | null> {
  const session = await getAuthSession();
  if (!session) return null;

  const slide = await db.query.slides.findFirst({
    where: eq(slides.id, slideId),
    with: {
      metrics: {
        with: {
          submetrics: true,
        },
      },
    },
  });

  return slide || null;
}

async function getWorkspaceData(
  workspaceId: string
): Promise<Workspace | null> {
  const session = await getAuthSession();
  if (!session) return null;

  const workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.id, workspaceId),
  });

  return workspace || null;
}

// Metadata generation
export async function generateMetadata({
  params,
}: SlidePageProps): Promise<Metadata> {
  const { workspaceId, slideId } = await params;

  const [slide, workspace] = await Promise.all([
    getSlideData(slideId),
    getWorkspaceData(workspaceId),
  ]);

  if (!slide || !workspace) {
    return {
      title: "XMRIT - Slide",
      description: "Statistical Process Control and XMR Chart Analysis",
    };
  }

  // Verify slide belongs to workspace
  if (slide.workspaceId !== workspace.id) {
    return {
      title: "XMRIT - Slide",
      description: "Statistical Process Control and XMR Chart Analysis",
    };
  }

  const title = `${slide.title}`;
  const description = slide.description || `Slide: ${slide.title}`;
  const slideDate = slide.slideDate
    ? new Date(slide.slideDate).toLocaleDateString("en-CA")
    : null;

  return {
    title,
    description: slideDate ? `${description} (${slideDate})` : description,
    openGraph: {
      title,
      description: slideDate ? `${description} (${slideDate})` : description,
      type: "website",
    },
    twitter: {
      card: "summary",
      title,
      description: slideDate ? `${description} (${slideDate})` : description,
    },
  };
}

export default async function SlidePage({ params }: SlidePageProps) {
  const { workspaceId, slideId } = await params;

  const [slide, workspace] = await Promise.all([
    getSlideData(slideId),
    getWorkspaceData(workspaceId),
  ]);

  if (!slide || !workspace) {
    notFound();
  }

  // Verify slide belongs to workspace
  if (slide.workspaceId !== workspace.id) {
    notFound();
  }

  return <SlideClient slide={slide} workspace={workspace} />;
}
