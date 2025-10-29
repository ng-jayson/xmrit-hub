"use client";

import {
  BarChart3,
  Edit,
  FolderOpen,
  MoreVertical,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import type { SlideWithMetrics } from "@/types/db/slide";
import type { Workspace } from "@/types/db/workspace";

interface SlideTableProps {
  currentWorkspace: Workspace;
  slides: SlideWithMetrics[];
  onCreateSlide: () => void;
  onEditSlide: (slide: SlideWithMetrics) => void;
  onDeleteSlide: (slideId: string) => void;
  isLoading?: boolean;
}

export function SlideTable({
  currentWorkspace,
  slides,
  onCreateSlide,
  onEditSlide,
  onDeleteSlide,
  isLoading = false,
}: SlideTableProps) {
  const handleRowClick = (slideId: string) => {
    window.open(`/${currentWorkspace.id}/slide/${slideId}`, "_blank");
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-5 w-96" />
          </div>
        </div>

        <Card className="!py-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent !px-4">
                <TableHead className="w-[40%]">Name</TableHead>
                <TableHead className="w-[35%]">Details</TableHead>
                <TableHead className="w-[20%]">Location</TableHead>
                <TableHead className="w-[5%]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-5 w-5 rounded" />
                      <Skeleton className="h-5 w-48" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-4 rounded" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-8 rounded" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{currentWorkspace.name}</h1>
          {currentWorkspace.description && (
            <p className="text-muted-foreground mt-2">
              {currentWorkspace.description}
            </p>
          )}
        </div>
        {/* <Button onClick={onCreateSlide} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          New Slide
        </Button> */}
      </div>

      {slides.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">
              No slides yet
            </h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Create your first slide to start building your metrics dashboard.
            </p>
            {/* <Button onClick={onCreateSlide} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create First Slide
            </Button> */}
          </CardContent>
        </Card>
      ) : (
        <Card className="!py-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent !px-4">
                <TableHead className="w-[40%]">Name</TableHead>
                <TableHead className="w-[35%]">Details</TableHead>
                <TableHead className="w-[20%]">Location</TableHead>
                <TableHead className="w-[5%]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {slides.map((slide) => {
                const totalSubmetrics = slide.metrics.reduce(
                  (sum, metric) => sum + metric.submetrics.length,
                  0
                );

                return (
                  <TableRow
                    key={slide.id}
                    className="cursor-pointer"
                    onClick={() => handleRowClick(slide.id)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0">
                          <BarChart3 className="h-5 w-5 text-yellow-500" />
                        </div>
                        <span className="font-normal">{slide.title}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>
                          {slide.metrics.length} metric
                          {slide.metrics.length !== 1 ? "s" : ""}
                        </span>
                        <span>•</span>
                        <span>
                          {totalSubmetrics} submetric
                          {totalSubmetrics !== 1 ? "s" : ""}
                        </span>
                        {slide.slideDate && (
                          <>
                            <span>•</span>
                            <span>
                              {new Date(slide.slideDate).toLocaleDateString(
                                "en-US",
                                {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                }
                              )}
                            </span>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <FolderOpen className="h-4 w-4" />
                        <span>{currentWorkspace.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditSlide(slide);
                            }}
                            disabled
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteSlide(slide.id);
                            }}
                            className="text-destructive focus:text-destructive"
                            disabled
                          >
                            <Trash2 className="mr-2 h-4 w-4 text-destructive" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
