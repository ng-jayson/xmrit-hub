"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { DataPoint } from "@/lib/xmr-calculations";
import { calculateRegressionStats } from "@/lib/xmr-calculations";

interface SubmetricTrendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dataPoints: DataPoint[];
  onApplyTrend: (gradient: number, intercept: number) => void;
}

export function SubmetricTrendDialog({
  open,
  onOpenChange,
  dataPoints,
  onApplyTrend,
}: SubmetricTrendDialogProps) {
  // Calculate initial regression stats
  const initialStats = useMemo(() => {
    return calculateRegressionStats(dataPoints);
  }, [dataPoints]);

  // State for edited data points
  const [editedDataPoints, setEditedDataPoints] =
    useState<DataPoint[]>(dataPoints);

  // State for manually entered equation values
  const [gradient, setGradient] = useState<string>(
    initialStats?.m.toFixed(8) || "0"
  );
  const [intercept, setIntercept] = useState<string>(
    initialStats?.c.toFixed(6) || "0"
  );

  // Reset all state when dialog opens
  useEffect(() => {
    if (open) {
      setEditedDataPoints(dataPoints);
      const stats = calculateRegressionStats(dataPoints);
      if (stats) {
        setGradient(stats.m.toFixed(8));
        setIntercept(stats.c.toFixed(6));
      }
    }
  }, [open, dataPoints]);

  // Reset to original data (without recalculating)
  const handleResetToOriginal = useCallback(() => {
    setEditedDataPoints(dataPoints);
    const stats = calculateRegressionStats(dataPoints);
    if (stats) {
      setGradient(stats.m.toFixed(8));
      setIntercept(stats.c.toFixed(6));
    }
  }, [dataPoints]);

  // Handle value change in table
  const handleValueChange = useCallback((index: number, newValue: string) => {
    const numValue = parseFloat(newValue);
    if (!isNaN(numValue)) {
      setEditedDataPoints((prevPoints) => {
        const newDataPoints = [...prevPoints];
        newDataPoints[index] = { ...newDataPoints[index], value: numValue };
        return newDataPoints;
      });
    }
  }, []);

  // Handle applying trend limits (recalculate before applying)
  const handleApplyTrend = () => {
    // Recalculate from current edited data before applying
    const stats = calculateRegressionStats(editedDataPoints);
    const m = stats ? stats.m : parseFloat(gradient);
    const c = stats ? stats.c : parseFloat(intercept);

    if (isNaN(m) || isNaN(c)) {
      alert("Please enter valid numbers for gradient and intercept");
      return;
    }

    onApplyTrend(m, c);
    onOpenChange(false);
  };

  // Parse values for display
  const parsedGradient = parseFloat(gradient);
  const parsedIntercept = parseFloat(intercept);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[50vw] max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between pr-8">
            <DialogTitle className="text-2xl font-bold">Trends</DialogTitle>
            <Button onClick={handleApplyTrend} size="sm" className="h-9">
              Trend Limits
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col gap-4 pr-2">
          {/* Description */}
          <p className="text-sm text-muted-foreground">
            Use this to generate trended limit lines from a line of best fit.
          </p>
          <p className="text-sm text-muted-foreground">
            Edit data points below and click "Recalculate Equation", or manually
            enter the gradient and intercept. Manual values take precedence.
          </p>

          {/* Average line equation */}
          <div className="border rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-sm">Average line equation:</h3>
            <div className="flex items-center gap-3">
              <span className="text-sm">y =</span>
              <Input
                type="text"
                value={gradient}
                onChange={(e) => setGradient(e.target.value)}
                className="w-32 h-9 text-sm"
                placeholder="-34.132867"
              />
              <span className="text-sm">x +</span>
              <Input
                type="text"
                value={intercept}
                onChange={(e) => setIntercept(e.target.value)}
                className="w-40 h-9 text-sm"
                placeholder="940.397436"
              />
            </div>
          </div>

          {/* Linear Regression Data */}
          <div className="flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-sm">Linear Regression Data:</h3>
              <div className="flex gap-3">
                <Button
                  variant="link"
                  size="sm"
                  onClick={handleResetToOriginal}
                  className="h-auto p-0 text-blue-600 hover:text-blue-700"
                >
                  Reset to Original
                </Button>
              </div>
            </div>

            <ScrollArea className="h-[400px] border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[45%]">Date</TableHead>
                    <TableHead className="w-[55%] text-right">Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {editedDataPoints.map((point, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono text-sm">
                        {point.timestamp}
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          value={point.value}
                          onChange={(e) =>
                            handleValueChange(index, e.target.value)
                          }
                          className="h-8 text-sm text-right w-32 min-w-[80px]"
                          step="any"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Empty rows for visual consistency */}
                  {editedDataPoints.length < 15 &&
                    Array.from({ length: 15 - editedDataPoints.length }).map(
                      (_, i) => (
                        <TableRow key={`empty-${i}`}>
                          <TableCell className="h-10"></TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                      )
                    )}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
