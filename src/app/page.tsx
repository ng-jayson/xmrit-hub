"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useWorkspaces } from "@/lib/api";
import { LoaderCircle } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { workspaces, loading, error } = useWorkspaces();

  useEffect(() => {
    // If not authenticated, redirect to sign-in
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }

    // Wait for authentication to be determined
    if (status === "loading") return;

    // Wait for workspaces to load
    if (loading) return;

    if (error) {
      console.error("Error in home page:", error);
      // Could redirect to an error page or show error state
      return;
    }

    if (workspaces.length === 0) {
      // TODO: Handle case where no workspaces exist
      // For now, we'll show a message or create a default workspace via API
      console.log("No workspaces found");
      return;
    }

    // Redirect to the first workspace
    router.push(`/${workspaces[0].id}`);
  }, [workspaces, loading, error, router, session, status]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <LoaderCircle className="h-8 w-8 mx-auto mb-4 text-foreground animate-spin" />
          <p className="text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null; // Will redirect to sign-in
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <LoaderCircle className="h-8 w-8 mx-auto mb-4 text-foreground animate-spin" />
          <p className="text-muted-foreground">Loading workspaces...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (workspaces.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">No Workspaces Found</h1>
          <p className="text-muted-foreground">
            Please create a workspace to get started.
          </p>
        </div>
      </div>
    );
  }

  return null; // Should redirect before reaching here
}
