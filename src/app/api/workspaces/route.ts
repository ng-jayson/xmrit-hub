import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { getAllWorkspaces } from "@/lib/action/workspace";

export async function GET() {
  try {
    const session = await getAuthSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaces = await getAllWorkspaces();
    return NextResponse.json({ workspaces });
  } catch (error) {
    console.error("Error fetching workspaces:", error);
    return NextResponse.json(
      { error: "Failed to fetch workspaces" },
      { status: 500 }
    );
  }
}
