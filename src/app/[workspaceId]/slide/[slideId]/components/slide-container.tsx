"use client";

import { useEffect, useRef, useCallback, useMemo } from "react";
import { SubmetricLineChart } from "./submetric-card";
import type { MetricWithSubmetrics } from "@/types/db/metric";
import { Button } from "@/components/ui/button";
import { ChevronUp, ChevronDown } from "lucide-react";

interface SlideContainerProps {
  metrics: MetricWithSubmetrics[];
}

export function SlideContainer({ metrics }: SlideContainerProps) {
  const chartRefs = useRef<(HTMLDivElement | null)[]>([]);
  const navigationRef = useRef<HTMLDivElement>(null);
  // Use ref to track current index for instant navigation without re-renders
  const currentIndexRef = useRef<number>(0);

  // Flatten all submetrics into a single array for easier navigation
  const allCharts = useMemo(() => {
    return metrics.flatMap((metric) =>
      metric.submetrics.map((submetric) => ({
        metricId: metric.id,
        metricName: metric.name,
        submetric,
      }))
    );
  }, [metrics]);

  const totalCharts = allCharts.length;

  // Smooth scroll to the focused chart - INSTANT, no delay, no re-renders
  const scrollToChart = useCallback((index: number) => {
    const chartElement = chartRefs.current[index];
    if (chartElement) {
      // Immediate scroll - no callbacks, no async, no delays
      chartElement.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

      // Add a subtle gray animation effect
      chartElement.classList.add(
        "ring-2",
        "ring-muted-foreground/30",
        "ring-offset-2",
        "ring-offset-background"
      );
      setTimeout(() => {
        chartElement.classList.remove(
          "ring-2",
          "ring-muted-foreground/30",
          "ring-offset-2",
          "ring-offset-background"
        );
      }, 1000);
    }
  }, []);

  // Navigate to previous chart - INSTANT, NO RE-RENDERS
  const navigatePrevious = useCallback(() => {
    const currentIndex = currentIndexRef.current;
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      currentIndexRef.current = newIndex;
      // Scroll happens IMMEDIATELY - no state updates, no re-renders
      scrollToChart(newIndex);
    }
  }, [scrollToChart]);

  // Navigate to next chart - INSTANT, NO RE-RENDERS
  const navigateNext = useCallback(() => {
    const currentIndex = currentIndexRef.current;
    if (currentIndex < totalCharts - 1) {
      const newIndex = currentIndex + 1;
      currentIndexRef.current = newIndex;
      // Scroll happens IMMEDIATELY - no state updates, no re-renders
      scrollToChart(newIndex);
    }
  }, [scrollToChart, totalCharts]);

  // Auto-track which chart is in view using Intersection Observer
  useEffect(() => {
    if (chartRefs.current.length === 0) return;

    const observerOptions = {
      root: null, // viewport
      rootMargin: "-40% 0px -40% 0px", // Middle 20% of viewport
      threshold: 0,
    };

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      // Find the most visible chart in the center of the viewport
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const element = entry.target as HTMLDivElement;
          const index = chartRefs.current.indexOf(element);
          if (index !== -1) {
            // Update current index WITHOUT triggering re-render
            currentIndexRef.current = index;
          }
        }
      });
    };

    const observer = new IntersectionObserver(
      observerCallback,
      observerOptions
    );

    // Observe all chart elements
    chartRefs.current.forEach((chartElement) => {
      if (chartElement) {
        observer.observe(chartElement);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, [allCharts.length]); // Re-run when number of charts changes

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in an input field
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.key === "ArrowUp" || e.key === "k" || e.key === "K") {
        e.preventDefault();
        navigatePrevious();
      } else if (e.key === "ArrowDown" || e.key === "j" || e.key === "J") {
        e.preventDefault();
        navigateNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigatePrevious, navigateNext]);

  if (metrics.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-muted-foreground">
          No metrics found
        </h3>
        <p className="text-sm text-muted-foreground mt-2">
          This slide doesn't have any metrics yet.
        </p>
      </div>
    );
  }

  if (totalCharts === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <div className="max-w-md mx-auto">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-xl font-semibold mb-2">No submetrics found</h3>
          <p className="text-sm">
            These metrics don't have any submetrics configured yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Floating Navigation Controls */}
      {totalCharts > 1 && (
        <div
          ref={navigationRef}
          className="fixed right-8 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-2 opacity-40 hover:opacity-100 transition-opacity duration-300"
        >
          <Button
            onClick={navigatePrevious}
            size="icon"
            variant="ghost"
            className="h-12 w-12 rounded-full bg-background/80 backdrop-blur-sm border border-border/50 hover:border-border hover:bg-background/90 transition-all shadow-2xl"
            title="Previous chart (↑ or K)"
          >
            <ChevronUp className="h-5 w-5" />
          </Button>

          <Button
            onClick={navigateNext}
            size="icon"
            variant="ghost"
            className="h-12 w-12 rounded-full bg-background/80 backdrop-blur-sm border border-border/50 hover:border-border hover:bg-background/90 transition-all shadow-2xl"
            title="Next chart (↓ or J)"
          >
            <ChevronDown className="h-5 w-5" />
          </Button>
        </div>
      )}

      {/* Charts Grid */}
      <div className="space-y-12">
        {metrics.map((metric) => (
          <div key={metric.id} className="space-y-8">
            <div className="border-b-2 border-border pb-6">
              <h2 className="text-3xl font-bold text-foreground">
                {metric.name}
              </h2>
              {metric.description && (
                <p className="text-muted-foreground mt-3 text-lg leading-relaxed">
                  {metric.description}
                </p>
              )}
            </div>

            {metric.submetrics.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <div className="max-w-md mx-auto">
                  <div className="text-6xl mb-4">📊</div>
                  <h3 className="text-xl font-semibold mb-2">
                    No submetrics found
                  </h3>
                  <p className="text-sm">
                    This metric doesn't have any submetrics configured yet.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid gap-8 grid-cols-1">
                {metric.submetrics.map((submetric) => {
                  // Find the global index for this chart
                  const chartIndex = allCharts.findIndex(
                    (c) => c.submetric.id === submetric.id
                  );
                  return (
                    <div
                      key={submetric.id}
                      ref={(el) => {
                        chartRefs.current[chartIndex] = el;
                      }}
                      className="transition-all duration-300 rounded-lg relative"
                    >
                      <SubmetricLineChart submetric={submetric} />
                      {totalCharts > 1 && (
                        <div className="absolute bottom-4 right-4 bg-background/80 backdrop-blur-sm border border-border/50 rounded-full px-3 py-1.5 text-xs font-semibold opacity-60">
                          <span className="text-foreground">
                            {chartIndex + 1}
                          </span>
                          <span className="text-muted-foreground">
                            {" "}
                            / {totalCharts}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
