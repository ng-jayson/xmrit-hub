"use client";

import { useEffect } from "react";
import { use } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useWorkspaces, useWorkspace } from "@/lib/api";
import { DashboardLayout } from "./components/dashboard-layout";
import { LoaderCircle } from "lucide-react";

interface WorkspaceLayoutProps {
  children: React.ReactNode;
  params: Promise<{
    workspaceId: string;
  }>;
}

export default function WorkspaceLayout({
  children,
  params,
}: WorkspaceLayoutProps) {
  const { workspaceId } = use(params);
  const { data: session, status } = useSession();
  const router = useRouter();
  const {
    workspaces,
    loading: workspacesLoading,
    error: workspacesError,
  } = useWorkspaces();
  const {
    workspace,
    loading: workspaceLoading,
    error: workspaceError,
  } = useWorkspace(workspaceId);

  const loading = workspacesLoading || workspaceLoading;
  const error = workspacesError || workspaceError;

  useEffect(() => {
    // If not authenticated, redirect to sign-in
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }
  }, [status, router]);

  useEffect(() => {
    if (!loading && workspaceError) {
      // Workspace not found, redirect to 404
      router.push("/404");
    }
  }, [loading, workspaceError, router]);

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
          <p className="text-muted-foreground">Loading workspace...</p>
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

  if (!workspace) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Workspace Not Found</h1>
          <p className="text-muted-foreground">
            The requested workspace could not be found.
          </p>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout
      session={session}
      workspaces={workspaces}
      currentWorkspace={workspace}
      slides={workspace.slides}
    >
      {children}
    </DashboardLayout>
  );
}
