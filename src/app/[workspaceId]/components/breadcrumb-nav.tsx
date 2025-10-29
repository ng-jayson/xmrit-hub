"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import type { SlideWithMetrics } from "@/types/db/slide";
import type { Workspace } from "@/types/db/workspace";

interface BreadcrumbNavProps {
  workspace: Workspace;
  slides: SlideWithMetrics[];
}

export function BreadcrumbNav({ workspace, slides }: BreadcrumbNavProps) {
  const pathname = usePathname();

  // Parse the current path to determine breadcrumb items
  const pathSegments = pathname.split("/").filter(Boolean);

  // Base breadcrumb items - start with non-clickable "Workspace"
  const breadcrumbItems = [
    {
      label: "Workspace",
      href: null, // null means not clickable
      isClickable: false,
    },
    {
      label: workspace.name,
      href: `/${workspace.id}`,
      isClickable: true,
    },
  ];

  // Add slide-specific breadcrumb if we're on a slide page
  if (pathSegments.length >= 3 && pathSegments[1] === "slide") {
    const slideId = pathSegments[2];
    const slide = slides.find((s) => s.id === slideId);

    if (slide) {
      breadcrumbItems.push({
        label: slide.title,
        href: `/${workspace.id}/slide/${slideId}`,
        isClickable: true,
      });
    }
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {breadcrumbItems.map((item, index) => (
          <React.Fragment key={`${item.label}-${index}`}>
            <BreadcrumbItem>
              {index === breadcrumbItems.length - 1 ? (
                <BreadcrumbPage>{item.label}</BreadcrumbPage>
              ) : item.isClickable && item.href ? (
                <BreadcrumbLink asChild>
                  <Link href={item.href}>{item.label}</Link>
                </BreadcrumbLink>
              ) : (
                <span className="text-muted-foreground">{item.label}</span>
              )}
            </BreadcrumbItem>
            {index < breadcrumbItems.length - 1 && <BreadcrumbSeparator />}
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
