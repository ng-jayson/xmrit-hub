import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { slides } from "@/lib/db/schema";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slideId: string }> }
) {
  try {
    const session = await getAuthSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slideId } = await params;
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

    if (!slide) {
      return NextResponse.json({ error: "Slide not found" }, { status: 404 });
    }

    return NextResponse.json({ slide });
  } catch (error) {
    console.error("Error fetching slide:", error);
    return NextResponse.json(
      { error: "Failed to fetch slide" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ slideId: string }> }
) {
  try {
    const session = await getAuthSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slideId } = await params;

    // First check if the slide exists
    const slide = await db.query.slides.findFirst({
      where: eq(slides.id, slideId),
    });

    if (!slide) {
      return NextResponse.json({ error: "Slide not found" }, { status: 404 });
    }

    // Delete the slide - this will cascade to metrics and submetrics (with datapoints)
    await db.delete(slides).where(eq(slides.id, slideId));

    return NextResponse.json({
      message: "Slide deleted successfully",
      slideId,
    });
  } catch (error) {
    console.error("Error deleting slide:", error);
    return NextResponse.json(
      { error: "Failed to delete slide" },
      { status: 500 }
    );
  }
}
