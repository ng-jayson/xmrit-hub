"use client";

import { useState, useMemo, useEffect, memo, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2 } from "lucide-react";
import {
  type XMRLimits,
  type DataPoint,
  generateXMRData,
  detectViolations,
  calculateXMRLimits,
} from "@/lib/xmr-calculations";

interface SubmetricLockLimitsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dataPoints: DataPoint[];
  currentLimits: XMRLimits;
  onLockLimits: (limits: XMRLimits) => void;
  submetricName: string;
  outlierIndices?: number[];
}

// Memoized table row component to prevent unnecessary re-renders
const DataPointRow = memo(
  ({
    point,
    index,
    timestamp,
    onEditValue,
    onExclude,
    canExclude,
    isExcluded,
  }: {
    point: DataPoint;
    index: number;
    timestamp: string;
    onEditValue: (index: number, value: string) => void;
    onExclude: (index: number) => void;
    canExclude: boolean;
    isExcluded: boolean;
  }) => {
    return (
      <TableRow className={isExcluded ? "bg-gray-100 dark:bg-gray-800/50" : ""}>
        <TableCell className={isExcluded ? "text-muted-foreground" : ""}>
          {timestamp}
        </TableCell>
        <TableCell className="text-right p-1">
          <Input
            type="number"
            step="0.01"
            value={isExcluded ? "" : point.value}
            onChange={(e) => onEditValue(index, e.target.value)}
            className="text-right h-8 w-32 ml-auto"
            placeholder={isExcluded ? "Excluded" : undefined}
            disabled={isExcluded}
          />
        </TableCell>
        <TableCell className="p-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onExclude(index)}
            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
            disabled={!canExclude}
            title={
              !canExclude
                ? "Cannot exclude - minimum 3 data points required"
                : isExcluded
                ? "Include row"
                : "Exclude row"
            }
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </TableCell>
      </TableRow>
    );
  }
);

DataPointRow.displayName = "DataPointRow";

export function SubmetricLockLimitsDialog({
  open,
  onOpenChange,
  dataPoints,
  currentLimits,
  onLockLimits,
  submetricName,
  outlierIndices = [],
}: SubmetricLockLimitsDialogProps) {
  // State for editable data points (never actually removed, just marked as excluded)
  const [editedDataPoints, setEditedDataPoints] =
    useState<DataPoint[]>(dataPoints);

  // State for median mode toggles
  const [useMedian, setUseMedian] = useState(false);

  // State for indices to exclude from calculations (from auto-detection + user exclusions)
  const [excludedIndices, setExcludedIndices] =
    useState<number[]>(outlierIndices);

  // Reset edited data points, median toggle, and excluded indices when dialog opens
  useEffect(() => {
    if (open) {
      setEditedDataPoints(dataPoints);
      setUseMedian(false);
      setExcludedIndices(outlierIndices);
    }
  }, [dataPoints, open, outlierIndices]);

  // Helper function to calculate XMR data from current state
  const calculateXMRFromCurrentState = useCallback(() => {
    if (editedDataPoints.length === 0) {
      return {
        limits: currentLimits,
        dataPoints: [],
      };
    }
    // Filter out excluded indices for limit calculation
    const filteredDataPoints = editedDataPoints.filter(
      (_, index) => !excludedIndices.includes(index)
    );

    // Use filtered data points if we have enough, otherwise use all
    const dataForCalculation =
      filteredDataPoints.length >= 3 ? filteredDataPoints : editedDataPoints;

    const xmrData = generateXMRData(dataForCalculation, useMedian);
    return {
      limits: xmrData.limits,
      dataPoints: xmrData.dataPoints,
    };
  }, [editedDataPoints, currentLimits, useMedian, excludedIndices]);

  // State for input values (lazy initialization to avoid repeated toString calls)
  const [avgX, setAvgX] = useState<string>(() => currentLimits.avgX.toString());
  const [unpl, setUnpl] = useState<string>(() => currentLimits.UNPL.toString());
  const [lnpl, setLnpl] = useState<string>(() => currentLimits.LNPL.toString());
  const [avgMovement, setAvgMovement] = useState<string>(() =>
    currentLimits.avgMovement.toString()
  );
  const [url, setUrl] = useState<string>(() => currentLimits.URL.toString());

  // Track which fields have been modified
  const [isModified, setIsModified] = useState({
    avgX: false,
    unpl: false,
    lnpl: false,
    avgMovement: false,
    url: false,
  });

  // Reset inputs and modification state when dialog opens
  useEffect(() => {
    if (open) {
      setAvgX(currentLimits.avgX.toFixed(2));
      setUnpl(currentLimits.UNPL.toFixed(2));
      setLnpl(currentLimits.LNPL.toFixed(2));
      setAvgMovement(currentLimits.avgMovement.toFixed(2));
      setUrl(currentLimits.URL.toFixed(2));
      setIsModified({
        avgX: false,
        unpl: false,
        lnpl: false,
        avgMovement: false,
        url: false,
      });
    }
  }, [open, currentLimits]);

  // Reset data points to original (clears all exclusions)
  const handleResetToOriginal = useCallback(() => {
    setEditedDataPoints(dataPoints);
    setExcludedIndices([]); // Clear all exclusions to show all original values
  }, [dataPoints]);

  // Handle data point value edit
  const handleEditValue = useCallback((index: number, newValue: string) => {
    const parsed = parseFloat(newValue);
    if (!isNaN(parsed)) {
      setEditedDataPoints((prevPoints) => {
        const newDataPoints = [...prevPoints];
        newDataPoints[index] = { ...newDataPoints[index], value: parsed };
        return newDataPoints;
      });

      // Remove from excluded indices if user edits an excluded value
      setExcludedIndices((prevIndices) =>
        prevIndices.filter((i) => i !== index)
      );
    }
  }, []);

  // Handle data point exclusion/inclusion (toggle)
  const handleExcludeRow = useCallback((index: number) => {
    setExcludedIndices((prevIndices) => {
      if (prevIndices.includes(index)) {
        // Already excluded, so include it back
        return prevIndices.filter((i) => i !== index);
      } else {
        // Not excluded, so exclude it
        return [...prevIndices, index];
      }
    });
  }, []);

  // Validate and apply lock limits (recalculate before applying)
  const handleLockLimits = () => {
    // Recalculate limits from current edited data
    const xmrData = calculateXMRFromCurrentState();
    const recalculatedLimits = xmrData.limits;

    const parsedAvgX = parseFloat(avgX) || recalculatedLimits.avgX;
    const parsedUnpl = parseFloat(unpl) || recalculatedLimits.UNPL;
    const parsedLnpl = parseFloat(lnpl) || recalculatedLimits.LNPL;
    const parsedAvgMovement =
      parseFloat(avgMovement) || recalculatedLimits.avgMovement;
    const parsedUrl = parseFloat(url) || recalculatedLimits.URL;

    // Validate limits
    if (parsedAvgX < parsedLnpl || parsedAvgX > parsedUnpl) {
      alert(
        "Please ensure that the following limits are satisfied:\n" +
          "1. Average X is between Lower Natural Process Limit (LNPL) and Upper Natural Process Limit (UNPL)"
      );
      return;
    }

    if (parsedAvgMovement > parsedUrl) {
      alert(
        "Please ensure that the following limits are satisfied:\n" +
          "2. Average Movement is less than or equal to Upper Range Limit (URL)"
      );
      return;
    }

    // Calculate quartiles
    const lowerQuartile = (parsedAvgX + parsedLnpl) / 2;
    const upperQuartile = (parsedAvgX + parsedUnpl) / 2;

    onLockLimits({
      avgX: Math.round(parsedAvgX * 100) / 100,
      UNPL: Math.round(parsedUnpl * 100) / 100,
      LNPL: Math.round(parsedLnpl * 100) / 100,
      avgMovement: Math.round(parsedAvgMovement * 100) / 100,
      URL: Math.round(parsedUrl * 100) / 100,
      lowerQuartile: Math.round(lowerQuartile * 100) / 100,
      upperQuartile: Math.round(upperQuartile * 100) / 100,
    });

    onOpenChange(false);
  };

  // Format timestamp for display
  const formatTimestamp = (timestamp: string): string => {
    try {
      // Handle YYYYMMDD format
      if (/^\d{8}$/.test(timestamp)) {
        const year = timestamp.substring(0, 4);
        const month = timestamp.substring(4, 6);
        const day = timestamp.substring(6, 8);
        return `${year}-${month}-${day}`;
      }
      // Handle YYYYMM format
      if (/^\d{6}$/.test(timestamp)) {
        const year = timestamp.substring(0, 4);
        const month = timestamp.substring(4, 6);
        return `${year}-${month}-01`;
      }
      // Otherwise return as is
      return timestamp;
    } catch {
      return timestamp;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[50vw] max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between pr-8">
            <DialogTitle className="text-2xl font-bold">
              Lock Limits - {submetricName}
            </DialogTitle>
            <Button onClick={handleLockLimits} size="sm" className="h-9">
              Lock Limits
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col gap-4 pr-2">
          {/* Description */}
          <p className="text-sm text-muted-foreground">
            Edit or remove data points below and click "Recalculate Limits", or
            manually enter limit values. Manual values take precedence.
          </p>

          {/* Limit Inputs */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Avg X</label>
              <Input
                type="number"
                step="0.01"
                value={avgX}
                onChange={(e) => {
                  setAvgX(e.target.value);
                  setIsModified((prev) => ({ ...prev, avgX: true }));
                }}
                placeholder={currentLimits.avgX.toString()}
                className={isModified.avgX ? "border-red-500" : ""}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Upper X Limit (UNPL)
              </label>
              <Input
                type="number"
                step="0.01"
                value={unpl}
                onChange={(e) => {
                  setUnpl(e.target.value);
                  setIsModified((prev) => ({ ...prev, unpl: true }));
                }}
                placeholder={currentLimits.UNPL.toString()}
                className={isModified.unpl ? "border-red-500" : ""}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Lower X Limit (LNPL)
              </label>
              <Input
                type="number"
                step="0.01"
                value={lnpl}
                onChange={(e) => {
                  setLnpl(e.target.value);
                  setIsModified((prev) => ({ ...prev, lnpl: true }));
                }}
                placeholder={currentLimits.LNPL.toString()}
                className={isModified.lnpl ? "border-red-500" : ""}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Avg Movement</label>
              <Input
                type="number"
                step="0.01"
                value={avgMovement}
                onChange={(e) => {
                  setAvgMovement(e.target.value);
                  setIsModified((prev) => ({ ...prev, avgMovement: true }));
                }}
                placeholder={currentLimits.avgMovement.toString()}
                className={isModified.avgMovement ? "border-red-500" : ""}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Upper Movement Limit (URL)
              </label>
              <Input
                type="number"
                step="0.01"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setIsModified((prev) => ({ ...prev, url: true }));
                }}
                placeholder={currentLimits.URL.toString()}
                className={isModified.url ? "border-red-500" : ""}
              />
            </div>
          </div>

          {/* Locked Limits Basis Data Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">
                  Locked Limits Basis:
                </span>
                <span className="text-xs text-muted-foreground">
                  ({editedDataPoints.length - excludedIndices.length} data
                  points
                  {excludedIndices.length > 0 && (
                    <span className="text-muted-foreground">
                      {" "}
                      + {excludedIndices.length} excluded
                    </span>
                  )}
                  )
                </span>
              </div>
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

            <ScrollArea className="h-[300px] rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {editedDataPoints.map((point, index) => {
                    const isExcluded = excludedIndices.includes(index);
                    const nonExcludedCount =
                      editedDataPoints.length - excludedIndices.length;
                    const canExclude = isExcluded || nonExcludedCount > 3;

                    return (
                      <DataPointRow
                        key={`${point.timestamp}-${index}`}
                        point={point}
                        index={index}
                        timestamp={formatTimestamp(point.timestamp)}
                        onEditValue={handleEditValue}
                        onExclude={handleExcludeRow}
                        canExclude={canExclude}
                        isExcluded={isExcluded}
                      />
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
