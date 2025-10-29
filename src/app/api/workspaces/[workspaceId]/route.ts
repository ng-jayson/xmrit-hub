import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { getWorkspaceById } from "@/lib/action/workspace";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const session = await getAuthSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceId } = await params;
    const workspace = await getWorkspaceById(workspaceId);

    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ workspace });
  } catch (error) {
    console.error("Error fetching workspace:", error);
    return NextResponse.json(
      { error: "Failed to fetch workspace" },
      { status: 500 }
    );
  }
}
