"use client";

import { BarChart3, FileText, Github, Home, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import type { SlideWithMetrics } from "@/types/db/slide";
import type { Workspace } from "@/types/db/workspace";
import { ThemeToggle } from "./theme-toggle";
import { WorkspaceSelector } from "./workspace-selector";

interface DashboardSidebarProps {
  workspaces: Workspace[];
  currentWorkspace: Workspace;
  slides: SlideWithMetrics[];
  onWorkspaceChange: (workspace: Workspace) => void;
  onCreateWorkspace: () => void;
  onCreateSlide: () => void;
  onCreateMetric: (slideId: string) => void;
}

export function DashboardSidebar({
  workspaces,
  currentWorkspace,
  slides,
  onWorkspaceChange,
  onCreateWorkspace,
  onCreateSlide,
  onCreateMetric,
}: DashboardSidebarProps) {
  const pathname = usePathname();

  const _navigationItems = [
    {
      title: "Dashboard",
      href: `/${currentWorkspace.id}`,
      icon: Home,
    },
    {
      title: "Analytics",
      href: `/${currentWorkspace.id}/analytics`,
      icon: BarChart3,
    },
    {
      title: "Settings",
      href: `/${currentWorkspace.id}/settings`,
      icon: Settings,
    },
  ];

  return (
    <Sidebar>
      <SidebarHeader className="p-4 pt-3.5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">XMRIT</h2>
          <ThemeToggle />
        </div>
        <WorkspaceSelector
          workspaces={workspaces}
          currentWorkspace={currentWorkspace}
          onWorkspaceChange={onWorkspaceChange}
          onCreateWorkspace={onCreateWorkspace}
        />
      </SidebarHeader>
      <SidebarContent>
        {/* <SidebarMenu>
          {navigationItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton asChild isActive={pathname === item.href}>
                <Link href={item.href}>
                  <item.icon className="h-4 w-4" />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu> */}

        <Separator className="my-2" />

        <div className="px-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-muted-foreground">
              Slides
            </h3>
            {/* <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onCreateSlide}
            >
               <Plus className="h-4 w-4" />
              <span className="sr-only">Add slide</span>
            </Button> */}
          </div>
        </div>

        <ScrollArea className="flex-1 px-4">
          <SidebarMenu>
            {slides.map((slide) => (
              <SidebarMenuItem key={slide.id}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.includes(`/slide/${slide.id}`)}
                >
                  <Link href={`/${currentWorkspace.id}/slide/${slide.id}`}>
                    <span className="truncate">{slide.title}</span>
                  </Link>
                </SidebarMenuButton>
                {/* {slide.metrics.length > 0 && (
                  <SidebarMenuSub>
                    {slide.metrics.map((metric) => (
                      <SidebarMenuSubItem key={metric.id}>
                        <SidebarMenuSubButton>
                          <BarChart3 className="h-3 w-3" />
                          <span className="truncate">{metric.name}</span>
                          <span className="ml-auto text-xs text-muted-foreground">
                            {metric.submetrics.length}
                          </span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        onClick={() => onCreateMetric(slide.id)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Plus className="h-3 w-3" />
                        <span>Add Metric</span>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                )} */}
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </ScrollArea>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <span>© 2026 by</span>
          <a
            href="https://github.com/ng-jayson"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-foreground transition-colors"
          >
            <Github className="h-3 w-3" />
            <span>ng-jayson</span>
          </a>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
