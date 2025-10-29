"use client";

import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { Workspace } from "@/types/db/workspace";

interface WorkspaceSelectorProps {
  workspaces: Workspace[];
  currentWorkspace: Workspace;
  onWorkspaceChange: (workspace: Workspace) => void;
  onCreateWorkspace: () => void;
}

export function WorkspaceSelector({
  workspaces,
  currentWorkspace,
  onWorkspaceChange,
  onCreateWorkspace,
}: WorkspaceSelectorProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className="w-full justify-between h-auto py-2"
        >
          <div className="flex flex-col items-start min-w-0 flex-1">
            <span className="font-medium text-left truncate w-full">
              {currentWorkspace.name}
            </span>
            {/* {currentWorkspace.description && (
              <span className="text-xs text-muted-foreground truncate w-full text-left mt-1">
                {currentWorkspace.description}
              </span>
            )} */}
          </div>
          <ChevronsUpDown className="ml-3 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-72" align="start">
        <DropdownMenuLabel className="px-3 py-2">Workspaces</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {workspaces.map((workspace) => (
          <DropdownMenuItem
            key={workspace.id}
            onSelect={() => onWorkspaceChange(workspace)}
            className="flex items-center justify-between px-3 py-3"
          >
            <div className="flex flex-col min-w-0 flex-1">
              <span className="font-medium truncate">{workspace.name}</span>
              {workspace.description && (
                <span className="text-xs text-muted-foreground truncate mt-1">
                  {workspace.description}
                </span>
              )}
            </div>
            <Check
              className={cn(
                "ml-3 h-4 w-4 shrink-0",
                currentWorkspace.id === workspace.id
                  ? "opacity-100"
                  : "opacity-0",
              )}
            />
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={onCreateWorkspace}
          className="px-3 py-3"
          disabled={true}
        >
          <Plus className="mr-2 h-4 w-4" />
          Create workspace
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
