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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  DataPoint,
  SeasonalityPeriod,
  SeasonalityGrouping,
} from "@/lib/xmr-calculations";
import {
  calculateSeasonalFactors,
  prepareSeasonalDataForTable,
  getPeriodDisableMap,
  getPeriodCoverage,
} from "@/lib/xmr-calculations";

/**
 * Generate colors for seasons (similar to main3.ts using chroma.scale)
 * Creates a gradient from white to light blue in light mode
 * and from dark gray to dark blue in dark mode
 */
function generateSeasonColors(
  numSeasons: number,
  isDarkMode: boolean
): string[] {
  if (numSeasons === 0) return [];
  if (numSeasons === 1) {
    return [isDarkMode ? "rgb(30, 30, 30)" : "rgb(255, 255, 255)"];
  }

  const colors: string[] = [];

  if (isDarkMode) {
    // Dark mode: gradient from dark gray to dark blue
    const startColor = { r: 30, g: 30, b: 30 }; // very dark gray
    const endColor = { r: 30, g: 58, b: 138 }; // dark blue-900

    for (let i = 0; i < numSeasons; i++) {
      const t = i / (numSeasons - 1); // 0 to 1
      const r = Math.round(startColor.r + (endColor.r - startColor.r) * t);
      const g = Math.round(startColor.g + (endColor.g - startColor.g) * t);
      const b = Math.round(startColor.b + (endColor.b - startColor.b) * t);
      colors.push(`rgb(${r}, ${g}, ${b})`);
    }
  } else {
    // Light mode: gradient from white to light blue
    const startColor = { r: 255, g: 255, b: 255 }; // white
    const endColor = { r: 191, g: 219, b: 254 }; // #bfdbfe (blue-200)

    for (let i = 0; i < numSeasons; i++) {
      const t = i / (numSeasons - 1); // 0 to 1
      const r = Math.round(startColor.r + (endColor.r - startColor.r) * t);
      const g = Math.round(startColor.g + (endColor.g - startColor.g) * t);
      const b = Math.round(startColor.b + (endColor.b - startColor.b) * t);
      colors.push(`rgb(${r}, ${g}, ${b})`);
    }
  }

  return colors;
}

interface SubmetricSeasonalityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dataPoints: DataPoint[];
  onApplySeasonality: (
    period: SeasonalityPeriod,
    factors: number[],
    grouping: SeasonalityGrouping
  ) => void;
  initialPeriod?: SeasonalityPeriod;
  initialFactors?: number[];
  initialGrouping?: SeasonalityGrouping;
}

export function SubmetricSeasonalityDialog({
  open,
  onOpenChange,
  dataPoints,
  onApplySeasonality,
  initialPeriod = "year",
  initialFactors = [],
  initialGrouping = "none",
}: SubmetricSeasonalityDialogProps) {
  // Initialize with provided values or defaults
  const [period, setPeriod] = useState<SeasonalityPeriod>(initialPeriod);
  const [grouping, setGrouping] =
    useState<SeasonalityGrouping>(initialGrouping);
  const [editedDataPoints, setEditedDataPoints] =
    useState<DataPoint[]>(dataPoints);
  const [seasonalFactors, setSeasonalFactors] =
    useState<number[]>(initialFactors);

  // Compute period disable map and coverage from edited data
  const periodDisableMap = useMemo(
    () => getPeriodDisableMap(editedDataPoints),
    [editedDataPoints]
  );
  const periodCoverage = useMemo(
    () => getPeriodCoverage(editedDataPoints, period),
    [editedDataPoints, period]
  );

  // Sync with parent state when provided initial values change
  useEffect(() => {
    if (initialPeriod && initialPeriod !== period) {
      setPeriod(initialPeriod);
    }
  }, [initialPeriod]);

  useEffect(() => {
    if (initialGrouping && initialGrouping !== grouping) {
      setGrouping(initialGrouping);
    }
  }, [initialGrouping]);

  useEffect(() => {
    if (initialFactors.length > 0 && initialFactors !== seasonalFactors) {
      setSeasonalFactors(initialFactors);
    }
  }, [initialFactors]);

  // Initialize state when dialog opens (preserve editedDataPoints if dialog was closed and reopened)
  useEffect(() => {
    if (open) {
      // Only reset editedDataPoints if they're empty or if dataPoints changed significantly
      if (
        editedDataPoints.length === 0 ||
        editedDataPoints.length !== dataPoints.length
      ) {
        setEditedDataPoints(dataPoints);
      }
      // Recalculate factors if we don't have initial factors or if edited data changed
      if (initialFactors.length === 0) {
        const { factors } = calculateSeasonalFactors(
          editedDataPoints.length > 0 ? editedDataPoints : dataPoints,
          period,
          grouping
        );
        setSeasonalFactors(factors);
      }
    }
  }, [open]);

  // Prepare seasonal data for table
  const seasonalData = useMemo(() => {
    return prepareSeasonalDataForTable(editedDataPoints, period);
  }, [editedDataPoints, period]);

  // Detect dark mode
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Check if dark mode is enabled
    const checkDarkMode = () => {
      const isDark = document.documentElement.classList.contains("dark");
      setIsDarkMode(isDark);
    };

    checkDarkMode();

    // Watch for theme changes
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  // Generate colors for seasons
  const seasonColors = useMemo(() => {
    const maxSeason = Math.max(...seasonalData.map((d) => d.season), 0);
    return generateSeasonColors(maxSeason, isDarkMode);
  }, [seasonalData, isDarkMode]);

  // Check period coverage for warnings
  const hasLessThanOnePeriod = useMemo(
    () => periodCoverage < 1,
    [periodCoverage]
  );
  const hasExactlyOnePeriod = useMemo(
    () => periodCoverage >= 1 && periodCoverage < 1.1,
    [periodCoverage]
  );

  // Check if seasonal factors calculation has warnings (uneven period lengths)
  const hasSeasonalFactorWarning = useMemo(() => {
    const { hasWarning } = calculateSeasonalFactors(
      editedDataPoints,
      period,
      grouping
    );
    return hasWarning && grouping !== "none";
  }, [editedDataPoints, period, grouping]);

  // Reset to original data and recalculate factors
  const handleResetToOriginal = useCallback(() => {
    setEditedDataPoints(dataPoints);
    const { factors } = calculateSeasonalFactors(dataPoints, period, grouping);
    setSeasonalFactors(factors);
  }, [dataPoints, period, grouping]);

  // Recalculate seasonal factors from edited data
  const handleRecalculateFactors = useCallback(() => {
    const { factors } = calculateSeasonalFactors(
      editedDataPoints,
      period,
      grouping
    );
    setSeasonalFactors(factors);
  }, [editedDataPoints, period, grouping]);

  // Handle value change in seasonal data table
  const handleValueChange = useCallback(
    (index: number, newValue: string) => {
      const numValue = parseFloat(newValue);
      if (!isNaN(numValue)) {
        const seasonalDataItem = seasonalData[index];
        setEditedDataPoints((prevPoints) => {
          const newDataPoints = [...prevPoints];
          const originalIndex = prevPoints.findIndex(
            (p) => p.timestamp === seasonalDataItem.timestamp
          );
          if (originalIndex !== -1) {
            newDataPoints[originalIndex] = {
              ...newDataPoints[originalIndex],
              value: numValue,
            };
          }
          return newDataPoints;
        });
      }
    },
    [seasonalData]
  );

  // Handle seasonal factor change
  const handleFactorChange = useCallback((index: number, newValue: string) => {
    const numValue = parseFloat(newValue);
    if (!isNaN(numValue)) {
      setSeasonalFactors((prevFactors) => {
        const newFactors = [...prevFactors];
        newFactors[index] = numValue;
        return newFactors;
      });
    }
  }, []);

  // Handle period change and recalculate factors
  const handlePeriodChange = (newPeriod: SeasonalityPeriod) => {
    setPeriod(newPeriod);
    // Recalculate seasonal factors when period changes
    const { factors } = calculateSeasonalFactors(
      editedDataPoints,
      newPeriod,
      grouping
    );
    setSeasonalFactors(factors);
  };

  // Handle grouping change and recalculate factors
  const handleGroupingChange = (newGrouping: SeasonalityGrouping) => {
    setGrouping(newGrouping);
    // Recalculate seasonal factors when grouping changes
    const { factors } = calculateSeasonalFactors(
      editedDataPoints,
      period,
      newGrouping
    );
    setSeasonalFactors(factors);
  };

  // Handle applying seasonality (recalculate before applying)
  const handleApplySeasonality = () => {
    // Recalculate factors from current edited data before applying
    const { factors } = calculateSeasonalFactors(
      editedDataPoints,
      period,
      grouping
    );

    if (factors.length === 0) {
      alert("No seasonal factors calculated. Please check your data.");
      return;
    }

    onApplySeasonality(period, factors, grouping);
    onOpenChange(false);
  };

  // Get period label
  const getPeriodLabel = (p: SeasonalityPeriod): string => {
    const labels: Record<SeasonalityPeriod, string> = {
      year: "Annual",
      quarter: "Quarterly",
      month: "Monthly",
      week: "Weekly",
    };
    return labels[p];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[50vw] max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between pr-8">
            <DialogTitle className="text-2xl font-bold">
              Seasonality
            </DialogTitle>
            <Button onClick={handleApplySeasonality} size="sm" className="h-9">
              Deseasonalise
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col gap-4 pr-2">
          {/* Description */}
          <p className="text-sm text-muted-foreground">
            Use this to remove recurring patterns or fluctuations in data at
            regular intervals (e.g., monthly or yearly) to reveal underlying
            trends or residual variations.
          </p>
          <p className="text-sm text-muted-foreground">
            Modify your seasonal data or set the seasonal factors directly
            below. In case of conflict, the latter wins.
          </p>

          {/* Warning for less than one period */}
          {hasLessThanOnePeriod && (
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <p className="text-sm text-red-800 dark:text-red-200">
                Data spans less than one{" "}
                {period === "year"
                  ? "year"
                  : period === "quarter"
                  ? "quarter"
                  : period === "month"
                  ? "month"
                  : "week"}
                . De-seasonalising will flatten the data to a line.
              </p>
            </div>
          )}

          {/* Warning for exactly one period */}
          {hasExactlyOnePeriod && !hasLessThanOnePeriod && (
            <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                Data spans exactly one{" "}
                {period === "year"
                  ? "year"
                  : period === "quarter"
                  ? "quarter"
                  : period === "month"
                  ? "month"
                  : "week"}
                . The result will be flat after de-seasonalising.
              </p>
            </div>
          )}

          {/* Warning for grouped seasonality with uneven periods */}
          {hasSeasonalFactorWarning && (
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <p className="text-sm text-red-800 dark:text-red-200">
                Grouping when you don't have the same number of periods will
                make some sub-periods artificially higher.
              </p>
            </div>
          )}

          {/* Period and Grouping selectors */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Period:</h3>
              <Select value={period} onValueChange={handlePeriodChange}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="year" disabled={periodDisableMap.year}>
                    Annual
                  </SelectItem>
                  <SelectItem
                    value="quarter"
                    disabled={periodDisableMap.quarter}
                  >
                    Quarterly
                  </SelectItem>
                  <SelectItem value="month" disabled={periodDisableMap.month}>
                    Monthly
                  </SelectItem>
                  <SelectItem value="week" disabled={periodDisableMap.week}>
                    Weekly
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* <div className="space-y-2">
              <h3 className="font-semibold text-sm">Grouping:</h3>
              <Select value={grouping} onValueChange={handleGroupingChange}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="week">Weekly</SelectItem>
                  <SelectItem value="month">Monthly</SelectItem>
                  <SelectItem value="quarter">Quarterly</SelectItem>
                </SelectContent>
              </Select>
            </div> */}
          </div>

          {/* Two-column layout for tables */}
          <div className="grid grid-cols-2 gap-4 min-h-0">
            {/* Seasonal Data */}
            <div className="flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-sm">Seasonal Data:</h3>
                <Button
                  variant="link"
                  size="sm"
                  onClick={handleResetToOriginal}
                  className="h-auto p-0 text-blue-600 hover:text-blue-700"
                >
                  Reset to Original
                </Button>
              </div>

              <ScrollArea className="h-[500px] border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[35%]">Date</TableHead>
                      <TableHead className="w-[40%] text-right">
                        Value
                      </TableHead>
                      <TableHead className="w-[25%] text-center">
                        Season
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {seasonalData.map((item, index) => {
                      const seasonColor =
                        seasonColors[item.season - 1] || "transparent";
                      return (
                        <TableRow
                          key={index}
                          style={{
                            backgroundColor: seasonColor,
                            color: isDarkMode
                              ? "rgb(229, 231, 235)"
                              : "rgb(17, 24, 39)",
                          }}
                        >
                          <TableCell className="font-mono text-xs py-2">
                            {item.timestamp}
                          </TableCell>
                          <TableCell className="text-right py-2">
                            <Input
                              type="number"
                              value={item.value}
                              onChange={(e) =>
                                handleValueChange(index, e.target.value)
                              }
                              className="h-7 text-xs text-right w-full min-w-[100px]"
                              step="any"
                            />
                          </TableCell>
                          <TableCell className="text-center py-2 text-sm font-semibold">
                            {item.season}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>

            {/* Seasonal Factors */}
            <div className="flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-sm">Seasons:</h3>
                <Button
                  variant="link"
                  size="sm"
                  onClick={handleRecalculateFactors}
                  className="h-auto p-0 text-blue-600 hover:text-blue-700"
                >
                  Recalculate seasonal factors
                </Button>
              </div>

              <ScrollArea className="h-[500px] border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[25%] text-center">
                        Season
                      </TableHead>
                      <TableHead className="w-[75%]">
                        Seasonal Factors
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {seasonalFactors.map((factor, index) => {
                      const seasonColor = seasonColors[index] || "transparent";
                      return (
                        <TableRow
                          key={index}
                          style={{
                            backgroundColor: seasonColor,
                            color: isDarkMode
                              ? "rgb(229, 231, 235)"
                              : "rgb(17, 24, 39)",
                          }}
                        >
                          <TableCell className="text-center py-2 font-semibold">
                            {index + 1}
                          </TableCell>
                          <TableCell className="py-2">
                            <Input
                              type="number"
                              value={factor}
                              onChange={(e) =>
                                handleFactorChange(index, e.target.value)
                              }
                              className="h-7 text-xs w-full min-w-[120px]"
                              step="any"
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
