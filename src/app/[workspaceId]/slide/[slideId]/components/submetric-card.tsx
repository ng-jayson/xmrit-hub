"use client";

import { useMemo, useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, LockOpen, TrendingUp, X } from "lucide-react";
import type { Submetric } from "@/types/db/submetric";
import {
  generateXMRData,
  isProcessInControl,
  detectViolations,
  MINIMUM_XMR_DATA_POINTS,
  shouldAutoLockLimits,
  calculateLimitsWithOutlierRemoval,
  applySeasonalFactors,
  calculateRegressionStats,
  calculateSeasonalFactors,
  determinePeriodicity,
  createTrendLines,
  type DataPoint,
  type XMRLimits,
  type SeasonalityPeriod,
  type SeasonalityGrouping,
  type TrendLimits,
} from "@/lib/xmr-calculations";
import { SubmetricLockLimitsDialog } from "./submetric-lock-limits-dialog";
import { SubmetricTrendDialog } from "./submetric-trend-dialog";
import { SubmetricSeasonalityDialog } from "./submetric-seasonality-dialog";
import { SubmetricXChart } from "./submetric-x-chart";
import { SubmetricMRChart } from "./submetric-mr-chart";

interface SubmetricLineChartProps {
  submetric: Submetric;
}

// Helper function to parse timestamps in various formats
const parseTimestamp = (timestamp: string): Date => {
  // Check if timestamp is in YYYYMM format (e.g., "202301", "202412")
  if (/^\d{6}$/.test(timestamp)) {
    const year = timestamp.substring(0, 4);
    const month = timestamp.substring(4, 6);
    // Create date string in YYYY-MM-DD format (use first day of month)
    return new Date(`${year}-${month}-01`);
  }

  // Check if timestamp is in YYYYMMDD format (e.g., "20230115")
  if (/^\d{8}$/.test(timestamp)) {
    const year = timestamp.substring(0, 4);
    const month = timestamp.substring(4, 6);
    const day = timestamp.substring(6, 8);
    return new Date(`${year}-${month}-${day}`);
  }

  // Otherwise, use standard Date constructor for ISO strings and other formats
  return new Date(timestamp);
};

export function SubmetricLineChart({ submetric }: SubmetricLineChartProps) {
  const { theme, resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  // Check if label indicates trend or seasonality
  const labelHasTrend = useMemo(
    () => /\(Trend\)/i.test(submetric.label),
    [submetric.label]
  );
  const labelHasSeasonality = useMemo(
    () => /\(Seasonality\)/i.test(submetric.label),
    [submetric.label]
  );

  // Lock limits state
  const [isLockLimitsDialogOpen, setIsLockLimitsDialogOpen] = useState(false);
  const [lockedLimits, setLockedLimits] = useState<XMRLimits | null>(null);
  const [isLimitsLocked, setIsLimitsLocked] = useState(false);
  const [autoLocked, setAutoLocked] = useState(false);
  const [autoLockAttempted, setAutoLockAttempted] = useState(false); // Track if auto-lock has been attempted
  const [hasEverBeenManuallyModified, setHasEverBeenManuallyModified] =
    useState(false); // Track if chart has ever been manually modified
  const [outlierIndices, setOutlierIndices] = useState<number[]>([]); // Auto-detected outliers
  const [originalAutoOutliers, setOriginalAutoOutliers] = useState<number[]>(
    []
  ); // Store original auto-detected outliers
  const [manuallyExcludedIndices, setManuallyExcludedIndices] = useState<
    number[]
  >([]); // Manually excluded points
  const [autoSuggestedLimits, setAutoSuggestedLimits] =
    useState<XMRLimits | null>(null);

  // Trend state
  const [isTrendDialogOpen, setIsTrendDialogOpen] = useState(false);
  const [trendActive, setTrendActive] = useState(false);
  const [trendGradient, setTrendGradient] = useState<number>(0);
  const [trendIntercept, setTrendIntercept] = useState<number>(0);
  const [showReducedTrendLimits, setShowReducedTrendLimits] = useState(false);
  const [storedTrendLines, setStoredTrendLines] = useState<TrendLimits | null>(
    null
  );

  // Seasonality state
  const [isSeasonalityDialogOpen, setIsSeasonalityDialogOpen] = useState(false);
  const [seasonalityActive, setSeasonalityActive] = useState(false);
  const [seasonalityPeriod, setSeasonalityPeriod] =
    useState<SeasonalityPeriod>("year");
  const [seasonalityGrouping, setSeasonalityGrouping] =
    useState<SeasonalityGrouping>("none");
  const [seasonalFactors, setSeasonalFactors] = useState<number[]>([]);

  // Track if auto-apply has been done
  const [autoAppliedTrend, setAutoAppliedTrend] = useState(false);
  const [autoAppliedSeasonality, setAutoAppliedSeasonality] = useState(false);

  // Memoize raw data points transformation with deduplication
  const rawDataPoints = useMemo<DataPoint[]>(() => {
    const points =
      submetric.dataPoints?.map((point) => ({
        timestamp: point.timestamp,
        value: Number(point.value),
        confidence: point.confidence ?? undefined,
      })) || [];

    // Filter out invalid data points and sort by timestamp
    const validPoints = points.filter((point) => {
      const date = parseTimestamp(point.timestamp);
      const isValidDate = !isNaN(date.getTime());
      const isValidValue = !isNaN(point.value) && isFinite(point.value);
      return isValidDate && isValidValue;
    });

    validPoints.sort(
      (a, b) =>
        parseTimestamp(a.timestamp).getTime() -
        parseTimestamp(b.timestamp).getTime()
    );

    // Deduplicate points with same timestamp
    // Strategy: Keep the point with highest confidence, or last occurrence if no confidence
    const deduplicated = new Map<string, DataPoint>();

    for (const point of validPoints) {
      const timestampKey = parseTimestamp(point.timestamp).toISOString();
      const existing = deduplicated.get(timestampKey);

      if (!existing) {
        // First occurrence, add it
        deduplicated.set(timestampKey, point);
      } else {
        // Duplicate found - keep the one with higher confidence
        const existingConfidence = existing.confidence ?? null;
        const pointConfidence = point.confidence ?? null;

        // If both have confidence, compare them
        if (existingConfidence !== null && pointConfidence !== null) {
          if (pointConfidence > existingConfidence) {
            deduplicated.set(timestampKey, point);
          }
        } else if (pointConfidence !== null) {
          // New point has confidence but existing doesn't, prefer new one
          deduplicated.set(timestampKey, point);
        }
        // Otherwise keep existing (it either has confidence or both don't have confidence)
      }
    }

    return Array.from(deduplicated.values());
  }, [submetric.dataPoints]);

  // Auto-apply trend based on label
  useEffect(() => {
    if (
      labelHasTrend &&
      !autoAppliedTrend &&
      !trendActive &&
      rawDataPoints.length >= 2
    ) {
      const stats = calculateRegressionStats(rawDataPoints);
      if (stats) {
        // Calculate EVERYTHING upfront before setting state
        // This prevents race conditions and ensures consistent data

        // First, get base XMR data to get avgMovement
        const baseData = generateXMRData(rawDataPoints);

        // Calculate trend lines with the stats and avgMovement
        const calculatedTrendLines = createTrendLines(
          {
            m: stats.m,
            c: stats.c,
            avgMR: baseData.limits.avgMovement,
          },
          rawDataPoints
        );

        // Now set all state atomically
        setTrendGradient(stats.m);
        setTrendIntercept(stats.c);
        setStoredTrendLines(calculatedTrendLines);
        setTrendActive(true);
        setAutoAppliedTrend(true);
        setIsLimitsLocked(false);
        setLockedLimits(null);
      }
    }
  }, [labelHasTrend, autoAppliedTrend, trendActive, rawDataPoints]);

  // Auto-apply seasonality based on label
  useEffect(() => {
    if (
      labelHasSeasonality &&
      !autoAppliedSeasonality &&
      !seasonalityActive &&
      rawDataPoints.length >= MINIMUM_XMR_DATA_POINTS
    ) {
      const detectedPeriod = determinePeriodicity(rawDataPoints);
      const { factors } = calculateSeasonalFactors(
        rawDataPoints,
        detectedPeriod,
        "none" // No grouping for auto-apply
      );

      if (factors.length > 0) {
        setSeasonalityPeriod(detectedPeriod);
        setSeasonalFactors(factors);
        setSeasonalityActive(true);
        setAutoAppliedSeasonality(true);
        // Clear lock limits if active (seasonality changes the data)
        setIsLimitsLocked(false);
        setLockedLimits(null);
      }
    }
  }, [
    labelHasSeasonality,
    autoAppliedSeasonality,
    seasonalityActive,
    rawDataPoints,
  ]);

  // Auto-lock effect - automatically locks limits when outliers are detected
  // Only runs ONCE on initial load when: no trend/seasonality active, sufficient data, and not manually locked
  // Will NOT re-trigger when removing trend/seasonality - only on initial load or explicit reset
  useEffect(() => {
    if (
      !autoLockAttempted &&
      !trendActive &&
      !seasonalityActive &&
      !labelHasTrend &&
      !labelHasSeasonality &&
      !isLimitsLocked && // Don't override manual locks
      rawDataPoints.length >= MINIMUM_XMR_DATA_POINTS
    ) {
      const shouldAutoLock = shouldAutoLockLimits(rawDataPoints);
      if (shouldAutoLock) {
        const result = calculateLimitsWithOutlierRemoval(rawDataPoints);
        // Automatically lock with detected outliers excluded
        setLockedLimits(result.limits);
        setIsLimitsLocked(true);
        setAutoSuggestedLimits(result.limits);
        setOutlierIndices(result.outlierIndices);
        setOriginalAutoOutliers(result.outlierIndices); // Store original auto-detected outliers
        setAutoLocked(true);
        setAutoLockAttempted(true);
      } else {
        // Mark as attempted even if no outliers found to prevent repeated checks
        setAutoLockAttempted(true);
      }
    }
  }, [
    rawDataPoints,
    autoLockAttempted,
    trendActive,
    seasonalityActive,
    labelHasTrend,
    labelHasSeasonality,
    isLimitsLocked,
  ]);

  // Process data based on active filters (trend/seasonality)
  const processedDataPoints = useMemo<DataPoint[]>(() => {
    let processed = rawDataPoints;

    // Apply seasonality if active
    if (seasonalityActive && seasonalFactors.length > 0) {
      processed = applySeasonalFactors(
        processed,
        seasonalFactors,
        seasonalityPeriod,
        seasonalityGrouping
      );
    }

    return processed;
  }, [
    rawDataPoints,
    seasonalityActive,
    seasonalFactors,
    seasonalityPeriod,
    seasonalityGrouping,
  ]);

  // Generate base XMR data first (needed for avgMovement in trend calculations)
  const baseXmrData = useMemo(() => {
    return generateXMRData(processedDataPoints);
  }, [processedDataPoints]);

  // Calculate trend lines when trend is active (needs avgMovement from baseXmrData)
  const trendLines = useMemo<TrendLimits | null>(() => {
    if (!trendActive || processedDataPoints.length < 2) {
      return null;
    }

    // If we have stored trend lines (from auto-apply), use those
    // This ensures consistency during initial render
    if (storedTrendLines) {
      return storedTrendLines;
    }

    // Otherwise, calculate trend lines (for manual apply)
    const stats = {
      m: trendGradient,
      c: trendIntercept,
      avgMR: baseXmrData.limits.avgMovement,
    };

    return createTrendLines(stats, processedDataPoints);
  }, [
    trendActive,
    trendGradient,
    trendIntercept,
    processedDataPoints,
    baseXmrData.limits.avgMovement,
    storedTrendLines,
  ]);

  // Memoize XMR data generation with trend/locked limits support
  const xmrData = useMemo(() => {
    // If trend is active, use trend limits and recalculate violations relative to trend
    if (trendActive && trendLines) {
      // Recalculate violations relative to trend lines
      const updatedViolations = detectViolations(
        baseXmrData.dataPoints,
        baseXmrData.limits,
        trendLines
      );

      return {
        ...baseXmrData,
        violations: updatedViolations,
      };
    }

    // If limits are locked, use locked limits and recalculate violations
    if (isLimitsLocked && lockedLimits) {
      // Recalculate violations based on locked limits
      const updatedViolations = detectViolations(
        baseXmrData.dataPoints,
        lockedLimits
      );

      return {
        ...baseXmrData,
        limits: lockedLimits,
        violations: updatedViolations,
      };
    }

    return baseXmrData;
  }, [baseXmrData, isLimitsLocked, lockedLimits, trendActive, trendLines]);

  // Calculate unified effective limits based on active state
  // This is used for consistent traffic light calculations
  const effectiveLimits = useMemo(() => {
    if (trendActive && trendLines) {
      // For trend, use the limits at the last point
      const lastIndex = xmrData.dataPoints.length - 1;
      return {
        avgX: trendLines.centreLine[lastIndex]?.value ?? xmrData.limits.avgX,
        UNPL: trendLines.unpl[lastIndex]?.value ?? xmrData.limits.UNPL,
        LNPL: trendLines.lnpl[lastIndex]?.value ?? xmrData.limits.LNPL,
        avgMovement: xmrData.limits.avgMovement,
        URL: xmrData.limits.URL,
        lowerQuartile:
          trendLines.lowerQuartile[lastIndex]?.value ??
          xmrData.limits.lowerQuartile,
        upperQuartile:
          trendLines.upperQuartile[lastIndex]?.value ??
          xmrData.limits.upperQuartile,
      };
    } else if (isLimitsLocked && lockedLimits) {
      // Use locked limits
      return lockedLimits;
    } else {
      // Use default calculated limits
      return xmrData.limits;
    }
  }, [
    trendActive,
    trendLines,
    isLimitsLocked,
    lockedLimits,
    xmrData.limits,
    xmrData.dataPoints.length,
  ]);

  // Memoize process control status
  const processInControl = useMemo(
    () => isProcessInControl(xmrData.limits),
    [xmrData.limits]
  );

  // Memoize chart data transformation
  const chartData = useMemo(() => {
    // Check if data spans multiple years
    const dates = xmrData.dataPoints.map((point) =>
      parseTimestamp(point.timestamp)
    );
    const years = new Set(dates.map((date) => date.getFullYear()));
    const spansMultipleYears = years.size > 1;

    return xmrData.dataPoints.map((point, index) => {
      const date = parseTimestamp(point.timestamp);

      // Enhanced violation detection
      const isViolation = xmrData.violations.outsideLimits.includes(index);
      const isRunningPoint = xmrData.violations.runningPoints.includes(index);
      const isFourNearLimit = xmrData.violations.fourNearLimit.includes(index);
      const isTwoOfThreeBeyondTwoSigma =
        xmrData.violations.twoOfThreeBeyondTwoSigma.includes(index);
      const isFifteenWithinOneSigma =
        xmrData.violations.fifteenWithinOneSigma.includes(index);

      // Check if range exceeds URL (for MR chart)
      const isRangeViolation = point.range > xmrData.limits.URL;

      // Determine highest priority violation (for tooltip and hover display)
      // Priority: Rule 1 > Rule 4 > Rule 3 > Rule 2 > Rule 5
      let highestPriorityViolation: string | null = null;
      if (isViolation) {
        highestPriorityViolation = "rule1"; // Outside Control Limits
      } else if (isTwoOfThreeBeyondTwoSigma) {
        highestPriorityViolation = "rule4"; // 2 of 3 Beyond 2σ
      } else if (isFourNearLimit) {
        highestPriorityViolation = "rule3"; // 4 Near Limit Pattern
      } else if (isRunningPoint) {
        highestPriorityViolation = "rule2"; // Running Point Pattern
      } else if (isFifteenWithinOneSigma) {
        highestPriorityViolation = "rule5"; // Low Variation
      }

      // Format timestamp with or without year depending on whether data spans multiple years
      const timestampFormat = spansMultipleYears
        ? date.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "2-digit",
          })
        : date.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
          });

      return {
        timestamp: timestampFormat,
        fullTimestamp: date.toLocaleDateString("en-CA"), // yyyy-mm-dd format
        value: Number(point.value.toFixed(2)),
        range: Number(point.range.toFixed(2)),
        confidence: rawDataPoints[index + 1]?.confidence, // +1 because moving range starts from second point
        fullDate: date,
        isViolation,
        isRunningPoint,
        isFourNearLimit,
        isTwoOfThreeBeyondTwoSigma,
        isFifteenWithinOneSigma,
        isRangeViolation,
        highestPriorityViolation, // Add the highest priority violation
      };
    });
  }, [
    xmrData.dataPoints,
    xmrData.violations,
    xmrData.limits.URL,
    rawDataPoints,
  ]);

  const hasData = chartData.length >= MINIMUM_XMR_DATA_POINTS;

  // Memoize control indicator color based on statistical analysis
  const controlIndicatorColor = useMemo(() => {
    if (chartData.length < 3) return "green"; // Need minimum data for statistical analysis

    const lastPoint = chartData[chartData.length - 1];
    const lastIndex = chartData.length - 1;

    // Use unified effective limits (accounts for trend, locked, or default state)
    const {
      avgX: effectiveAvgX,
      UNPL: effectiveUNPL,
      LNPL: effectiveLNPL,
      avgMovement,
    } = effectiveLimits;

    // Look at last 5 points for trend analysis (or all available if less than 5)
    const lookbackWindow = Math.min(5, chartData.length);
    const recentPoints = chartData.slice(-lookbackWindow);
    const recentValues = recentPoints.map((p) => p.value);

    // Determine metric direction: uptrend (higher is better) or downtrend (lower is better)
    const isUptrendMetric = submetric.trend === "uptrend";
    const isDowntrendMetric = submetric.trend === "downtrend";

    // --- Statistical Calculations ---

    // 1. Calculate standard deviation of recent points
    const recentMean =
      recentValues.reduce((sum, val) => sum + val, 0) / recentValues.length;
    const variance =
      recentValues.reduce(
        (sum, val) => sum + Math.pow(val - recentMean, 2),
        0
      ) / recentValues.length;
    const stdDev = Math.sqrt(variance);

    // 2. Trend detection: Check if points are consistently moving in one direction
    let increasingCount = 0;
    let decreasingCount = 0;
    for (let i = 1; i < recentPoints.length; i++) {
      if (recentPoints[i].value > recentPoints[i - 1].value) increasingCount++;
      else if (recentPoints[i].value < recentPoints[i - 1].value)
        decreasingCount++;
    }
    const hasConsistentTrend =
      increasingCount >= recentPoints.length - 1 ||
      decreasingCount >= recentPoints.length - 1;
    const isIncreasingTrend = increasingCount >= recentPoints.length - 1;
    const isDecreasingTrend = decreasingCount >= recentPoints.length - 1;

    // 3. Calculate rate of change (slope) of recent points using linear regression
    const xValues = recentPoints.map((_, i) => i);
    const sumX = xValues.reduce((sum, x) => sum + x, 0);
    const sumY = recentValues.reduce((sum, y) => sum + y, 0);
    const sumXY = xValues.reduce((sum, x, i) => sum + x * recentValues[i], 0);
    const sumX2 = xValues.reduce((sum, x) => sum + x * x, 0);
    const n = recentPoints.length;
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

    // 4. Distance to control limits (normalized position: 0 = LNPL, 1 = UNPL, 0.5 = center)
    // Use effective limits (trend-aware if trend is active)
    const controlRange = effectiveUNPL - effectiveLNPL;
    const normalizedPosition = (lastPoint.value - effectiveLNPL) / controlRange;

    // --- IMPROVED VARIANCE DETECTION ---
    // 5A. Compare last point to EXPECTED BASELINE (considering active state: trend/locked/default)
    const baselineWindow = Math.min(4, chartData.length - 1); // Previous 3-4 points (not including last)
    const baselineIndices = Array.from(
      { length: baselineWindow },
      (_, i) => chartData.length - baselineWindow - 1 + i
    );

    // Calculate expected baseline based on effective limits
    // For trend, use trend line values; otherwise use static average
    const expectedBaseline =
      trendActive && trendLines
        ? baselineIndices.reduce((sum, idx) => {
            return sum + (trendLines.centreLine[idx]?.value ?? effectiveAvgX);
          }, 0) / baselineWindow
        : effectiveAvgX;

    // Get actual baseline from data for comparison
    const baselinePoints = chartData.slice(-baselineWindow - 1, -1); // Exclude last point
    const baselineValues = baselinePoints.map((p) => p.value);
    const actualBaseline =
      baselineValues.length > 0
        ? baselineValues.reduce((sum, val) => sum + val, 0) /
          baselineValues.length
        : recentMean;

    // Use expected baseline for state-aware calculations
    const baselineMean = expectedBaseline;

    // 5B. Calculate baseline standard deviation
    const baselineVariance =
      baselineValues.length > 1
        ? baselineValues.reduce(
            (sum, val) => sum + Math.pow(val - baselineMean, 2),
            0
          ) / baselineValues.length
        : variance;
    const baselineStdDev = Math.sqrt(baselineVariance);

    // 5C. Deviation of last point from recent baseline
    const deviationFromBaseline = lastPoint.value - baselineMean;
    const normalizedDeviation =
      baselineStdDev > 0
        ? Math.abs(deviationFromBaseline) / baselineStdDev
        : Math.abs(deviationFromBaseline) / avgMovement;

    // 5D. Calculate variance as deviation from baseline normalized by average movement
    const varianceFromBaseline = Math.abs(deviationFromBaseline) / avgMovement;

    // 5E. Change from immediate previous point (for backward compatibility)
    const lastChange =
      lastPoint.value - recentPoints[recentPoints.length - 2].value;
    const normalizedChange = Math.abs(lastChange) / avgMovement;

    // 5F. Detect acceleration: compare last change to average of recent changes
    const recentChanges: number[] = [];
    for (let i = 1; i < recentPoints.length - 1; i++) {
      recentChanges.push(
        Math.abs(recentPoints[i].value - recentPoints[i - 1].value)
      );
    }
    const avgRecentChange =
      recentChanges.length > 0
        ? recentChanges.reduce((sum, c) => sum + c, 0) / recentChanges.length
        : avgMovement;
    const changeAcceleration = Math.abs(lastChange) / avgRecentChange;

    // 6. Determine if movement is favorable based on metric trend
    const isIncreasingValue = lastChange > 0;
    const isDecreasingValue = lastChange < 0;
    const isIncreasingFromBaseline = deviationFromBaseline > 0;
    const isDecreasingFromBaseline = deviationFromBaseline < 0;

    const isFavorableMovement =
      (isUptrendMetric && isIncreasingValue) ||
      (isDowntrendMetric && isDecreasingValue);
    const isUnfavorableMovement =
      (isUptrendMetric && isDecreasingValue) ||
      (isDowntrendMetric && isIncreasingValue);

    const isFavorableFromBaseline =
      (isUptrendMetric && isIncreasingFromBaseline) ||
      (isDowntrendMetric && isDecreasingFromBaseline);
    const isUnfavorableFromBaseline =
      (isUptrendMetric && isDecreasingFromBaseline) ||
      (isDowntrendMetric && isIncreasingFromBaseline);

    // --- Decision Logic (incorporating trend direction) ---

    // Check for critical violations (Rule 1 and Rule 4)
    const hasCriticalViolation =
      lastPoint.isViolation || lastPoint.isTwoOfThreeBeyondTwoSigma;

    // Check for pattern violations (Rule 2 and Rule 3)
    const hasPatternViolation =
      lastPoint.isRunningPoint || lastPoint.isFourNearLimit;

    // Check for low variation (Rule 5)
    const hasLowVariation = lastPoint.isFifteenWithinOneSigma;

    // RED: True out-of-control situations (sudden, unexpected violations)
    if (hasCriticalViolation) {
      // Check if this is a sudden spike or part of a gradual trend
      const isSuddenSpike = !hasConsistentTrend && normalizedChange > 2.5;
      const isIsolatedViolation =
        recentPoints.length >= 3 &&
        recentPoints
          .slice(0, -1)
          .every((p) => !p.isViolation && !p.isTwoOfThreeBeyondTwoSigma);

      // Unfavorable violations are more critical
      if (isUnfavorableMovement && (isSuddenSpike || isIsolatedViolation)) {
        return "red"; // Critical: moving in wrong direction AND outside limits
      }

      // Favorable violations might be part of improvement trend
      if (isFavorableMovement && hasConsistentTrend) {
        return "yellow"; // Process improving but needs limit recalibration
      }

      // Default: sudden unexpected violation
      if (isSuddenSpike || isIsolatedViolation) {
        return "red";
      }

      // Otherwise, it's part of a trend, treat as yellow (possible new process range)
      return "yellow";
    }

    // YELLOW: Warning conditions (within limits but concerning)
    const warningConditions = [
      // Western Electric Pattern Violations
      // 1. Pattern violations (Rule 2 and Rule 3) - always concerning
      hasPatternViolation,

      // Statistical Warning Conditions
      // 2. Significant unfavorable spike/drop: Change is > 2x average movement in wrong direction
      normalizedChange > 2.0 && isUnfavorableMovement,

      // 3. Large favorable movement (might indicate instability even if good direction)
      normalizedChange > 3.0 && isFavorableMovement,

      // 4. Unfavorable trend with significant slope
      isUnfavorableMovement &&
        hasConsistentTrend &&
        Math.abs(slope) > avgMovement * 0.5,

      // 5. Approaching unfavorable limit
      (isUptrendMetric && normalizedPosition < 0.15) || // Uptrend metric near lower limit
        (isDowntrendMetric && normalizedPosition > 0.85), // Downtrend metric near upper limit

      // 6. Near either limit with no clear trend direction
      !isUptrendMetric &&
        !isDowntrendMetric &&
        (normalizedPosition > 0.85 || normalizedPosition < 0.15),

      // 7. High variability: Recent standard deviation is > 1.5x average movement
      stdDev > avgMovement * 1.5,

      // 8. Accelerating unfavorable change
      isUnfavorableMovement &&
        normalizedChange > 1.5 &&
        normalizedChange > stdDev * 1.5,

      // 9. Significant deviation from recent baseline (last point is outlier)
      normalizedDeviation > 2.0 && // More than 2 standard deviations from baseline
        isUnfavorableFromBaseline,

      // 10. Large variance from baseline average (even without clear trend)
      varianceFromBaseline > 2.5 && isUnfavorableFromBaseline,

      // 11. Accelerating change rate (change is accelerating compared to recent pattern)
      changeAcceleration > 2.0 && isUnfavorableMovement,

      // 12. Sudden baseline shift detection
      varianceFromBaseline > 2.0 &&
        normalizedDeviation > 1.5 &&
        isUnfavorableFromBaseline,
    ];

    // Trigger yellow if ANY warning condition is met
    if (warningConditions.some((condition) => condition)) {
      return "yellow";
    }

    // GREEN with bonus indicator: Process is very stable (Rule 5)
    // Note: Low variation is generally good, just informational
    // hasLowVariation is tracked but doesn't affect the color

    // GREEN: Normal, in-control situation
    return "green";
  }, [
    chartData,
    effectiveLimits,
    xmrData.violations,
    submetric.trend,
    trendActive,
    trendLines,
  ]);

  // Memoize Y-axis domain calculation
  const yAxisDomain = useMemo(() => {
    if (chartData.length === 0) return [0, 100];

    const values = chartData.map((d) => d.value);
    const dataMin = Math.min(...values);
    const dataMax = Math.max(...values);

    // Include control limits in the domain calculation
    const minBound = Math.min(dataMin, xmrData.limits.LNPL);
    const maxBound = Math.max(dataMax, xmrData.limits.UNPL);
    const fullRange = maxBound - minBound;

    // Use 15% padding of the full range (including control limits)
    const padding = fullRange * 0.15;

    return [minBound - padding, maxBound + padding];
  }, [chartData, xmrData.limits]);

  // Handlers
  const handleLockLimits = (
    limits: XMRLimits,
    isManuallyModified: boolean,
    excludedIndices: number[]
  ) => {
    setLockedLimits(limits);
    setIsLimitsLocked(true);

    // If user made any changes in the dialog (data edits, exclusions, or manual limit changes),
    // mark it as manual lock
    if (isManuallyModified) {
      setAutoLocked(false);
      setHasEverBeenManuallyModified(true);
      setManuallyExcludedIndices(excludedIndices); // Store manually excluded indices
      setOutlierIndices([]); // Clear auto-detected outlier indices
    } else if (hasEverBeenManuallyModified) {
      // Even if no changes this time, preserve manual state if ever modified
      setAutoLocked(false);
      setManuallyExcludedIndices(excludedIndices);
    } else if (autoLocked) {
      // Was already auto-locked, preserve auto-lock state (user just re-opened and confirmed)
      setAutoLocked(true);
      setManuallyExcludedIndices([]);
    } else {
      // User manually opened dialog and locked (not from auto-lock) → manual lock
      setAutoLocked(false);
      setHasEverBeenManuallyModified(true);
      setManuallyExcludedIndices(excludedIndices);
    }

    setAutoSuggestedLimits(null); // Clear auto-suggestions after locking
  };

  const handleUnlockLimits = () => {
    setIsLimitsLocked(false);
    setLockedLimits(null);
    setAutoSuggestedLimits(null);
    setOutlierIndices([]);
    setManuallyExcludedIndices([]);
    setAutoLocked(false); // Reset auto-locked state when unlocking
    // Don't reset autoLockAttempted - once unlocked, chart uses default calculated limits
    // To restore auto-lock, user must explicitly click "Reset to Auto Lock Limit"
  };

  const handleResetToAutoLock = () => {
    // Reset to original auto-lock state
    const result = calculateLimitsWithOutlierRemoval(rawDataPoints);
    setLockedLimits(result.limits);
    setIsLimitsLocked(true);
    setAutoSuggestedLimits(result.limits);
    setOutlierIndices(result.outlierIndices);
    setOriginalAutoOutliers(result.outlierIndices);
    setManuallyExcludedIndices([]);
    setAutoLocked(true);
    setHasEverBeenManuallyModified(false);
    setAutoLockAttempted(true);
  };

  const handleApplyTrend = (gradient: number, intercept: number) => {
    setTrendGradient(gradient);
    setTrendIntercept(intercept);
    setTrendActive(true);
    setStoredTrendLines(null); // Clear stored lines to force recalculation

    // Clear incompatible states when applying trend
    setIsLimitsLocked(false);
    setLockedLimits(null);
    setAutoLocked(false);
    setAutoSuggestedLimits(null);
  };

  const handleRemoveTrend = () => {
    setTrendActive(false);
    setTrendGradient(0);
    setTrendIntercept(0);
    setStoredTrendLines(null); // Clear stored trend lines

    // Don't reset autoLockAttempted - auto-lock should only trigger on initial load
    // or when explicitly requested via "Reset to Auto Lock Limit"
  };

  const handleApplySeasonality = (
    period: SeasonalityPeriod,
    factors: number[],
    grouping: SeasonalityGrouping
  ) => {
    setSeasonalityPeriod(period);
    setSeasonalityGrouping(grouping);
    setSeasonalFactors(factors);
    setSeasonalityActive(true);
    setStoredTrendLines(null); // Clear stored lines as data changes

    // Clear incompatible states when applying seasonality
    setIsLimitsLocked(false);
    setLockedLimits(null);
    setAutoLocked(false);
    setAutoSuggestedLimits(null);
  };

  const handleRemoveSeasonality = () => {
    setSeasonalityActive(false);
    setSeasonalFactors([]);
    setStoredTrendLines(null); // Clear stored lines as data changes

    // Don't reset autoLockAttempted - auto-lock should only trigger on initial load
    // or when explicitly requested via "Reset to Auto Lock Limit"
  };

  return (
    <Card className="w-full gap-0">
      <CardHeader className="pb-0">
        {/* Chart Toolbar */}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {submetric.trend && (
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                {submetric.trend === "uptrend" && (
                  <span className="text-sm">↑</span>
                )}
                {submetric.trend === "downtrend" && (
                  <span className="text-sm">↓</span>
                )}
                <span>{submetric.trend.toUpperCase()}</span>
              </span>
            )}
          </div>
          {hasData && (
            <div className="flex items-center gap-2">
              {/* Removal buttons beside the action buttons */}
              {isLimitsLocked && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleUnlockLimits}
                  className="gap-2 text-amber-600 hover:bg-amber-50 hover:text-amber-700 dark:hover:bg-amber-950"
                >
                  <LockOpen className="h-4 w-4" />
                  Unlock Limits
                </Button>
              )}
              {trendActive && (
                <>
                  {/* <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setShowReducedTrendLimits(!showReducedTrendLimits)
                    }
                    className={`gap-2 ${
                      showReducedTrendLimits
                        ? "bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-950 dark:hover:bg-blue-900"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                    {showReducedTrendLimits
                      ? "Reduced Limits On"
                      : "Reduced Limits"}
                  </Button> */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveTrend}
                    className="gap-2 text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950"
                  >
                    <X className="h-4 w-4" />
                    Remove Trend
                  </Button>
                </>
              )}
              {seasonalityActive && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveSeasonality}
                  className="gap-2 text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950"
                >
                  <X className="h-4 w-4" />
                  Remove Deseasonalisation
                </Button>
              )}

              {/* Separator between removal and action buttons */}
              {(isLimitsLocked || trendActive || seasonalityActive) && (
                <div className="h-6 w-px bg-border mx-1" />
              )}

              {/* Action buttons */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsLockLimitsDialogOpen(true)}
                disabled={trendActive}
                className={`gap-2 ${
                  isLimitsLocked
                    ? "bg-green-50 text-green-600 border-green-600 hover:bg-green-100 dark:bg-green-950 dark:hover:bg-green-900"
                    : ""
                }`}
              >
                <Lock className="h-4 w-4" />
                {isLimitsLocked
                  ? autoLocked
                    ? `Auto-Locked${
                        outlierIndices.length > 0
                          ? ` (${outlierIndices.length} outlier${
                              outlierIndices.length !== 1 ? "s" : ""
                            })`
                          : ""
                      }`
                    : "Limits Locked"
                  : "Lock Limits"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsTrendDialogOpen(true)}
                disabled={isLimitsLocked || seasonalityActive}
                className={`gap-2 ${
                  trendActive
                    ? "bg-green-50 text-green-600 border-green-600 hover:bg-green-100 dark:bg-green-950 dark:hover:bg-green-900"
                    : ""
                }`}
              >
                <TrendingUp className="h-4 w-4" />
                {trendActive ? "Trend Active" : "Trend Limits"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsSeasonalityDialogOpen(true)}
                disabled={trendActive}
                className={`gap-2 ${
                  seasonalityActive
                    ? "bg-green-50 text-green-600 border-green-600 hover:bg-green-100 dark:bg-green-950 dark:hover:bg-green-900"
                    : ""
                }`}
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
                {seasonalityActive ? "Deseasonalised" : "Deseasonalise"}
              </Button>
            </div>
          )}
        </div>

        {/* Title and Status Row */}
        <div className="flex items-start justify-between mt-2">
          <div className="flex-1">
            <div className="flex items-center gap-3  max-w-[64vw]">
              {submetric.category && (
                <span className="px-4 py-2 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-md text-sm font-bold uppercase tracking-wide whitespace-nowrap flex-shrink-0">
                  {submetric.category}
                </span>
              )}
              <CardTitle className="text-2xl font-bold overflow-hidden text-ellipsis whitespace-nowrap min-w-0">
                {submetric.label.split("-")[1].trim()}
              </CardTitle>
            </div>

            {submetric.unit && (
              <div className="text-sm text-muted-foreground mt-2">
                Unit: <span className="font-semibold">{submetric.unit}</span>
              </div>
            )}
          </div>
          {hasData && (
            <div className="flex flex-col items-end gap-2">
              {/* Traffic Light Control Indicator */}
              <div
                className={`w-8 h-8 rounded-full shadow-lg ring-4 ${
                  controlIndicatorColor === "red"
                    ? "bg-red-500 ring-red-200 dark:ring-red-900"
                    : controlIndicatorColor === "yellow"
                    ? "bg-yellow-500 ring-yellow-200 dark:ring-yellow-900"
                    : "bg-green-500 ring-green-200 dark:ring-green-900"
                }`}
                title={
                  controlIndicatorColor === "red"
                    ? "Out of Control - Sudden violation detected"
                    : controlIndicatorColor === "yellow"
                    ? "Watch Zone - Trending or significant change"
                    : "In Control - Stable"
                }
              />
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {hasData ? (
          <div
            className="grid grid-cols-1 lg:grid-cols-2"
            key={`chart-${trendActive}-${!!trendLines}-${isLimitsLocked}-${seasonalityActive}`}
          >
            {/* X Chart */}
            <SubmetricXChart
              chartData={chartData}
              xmrLimits={xmrData.limits}
              submetric={submetric}
              yAxisDomain={yAxisDomain}
              isDark={isDark}
              isLimitsLocked={isLimitsLocked}
              trendActive={trendActive}
              trendLines={trendLines}
              showReducedTrendLimits={showReducedTrendLimits}
            />

            {/* MR Chart */}
            <SubmetricMRChart
              chartData={chartData}
              xmrLimits={xmrData.limits}
              submetric={submetric}
              isDark={isDark}
              isLimitsLocked={isLimitsLocked}
            />
          </div>
        ) : (
          <div className="h-[500px] flex items-center justify-center text-muted-foreground">
            <div className="text-center max-w-md">
              <div className="text-8xl mb-6">📈</div>
              <h3 className="text-2xl font-semibold mb-3 text-foreground">
                No XmR Chart Data Available
              </h3>
              <p className="text-lg leading-relaxed">
                At least {MINIMUM_XMR_DATA_POINTS} data points are required for
                XMR chart analysis.
              </p>
            </div>
          </div>
        )}
      </CardContent>

      {/* Lock Limits Dialog */}
      <SubmetricLockLimitsDialog
        open={isLockLimitsDialogOpen}
        onOpenChange={setIsLockLimitsDialogOpen}
        dataPoints={rawDataPoints}
        currentLimits={autoSuggestedLimits || xmrData.limits}
        onLockLimits={handleLockLimits}
        submetricName={submetric.label.split("-")[1].trim()}
        outlierIndices={
          hasEverBeenManuallyModified ? manuallyExcludedIndices : outlierIndices
        }
        isCurrentLimitsManuallyLocked={hasEverBeenManuallyModified}
        autoDetectedOutliers={originalAutoOutliers}
        onResetToAutoLock={handleResetToAutoLock}
        isAutoLocked={autoLocked}
      />

      {/* Trend Dialog */}
      <SubmetricTrendDialog
        open={isTrendDialogOpen}
        onOpenChange={setIsTrendDialogOpen}
        dataPoints={rawDataPoints}
        onApplyTrend={handleApplyTrend}
      />

      {/* Seasonality Dialog */}
      <SubmetricSeasonalityDialog
        open={isSeasonalityDialogOpen}
        onOpenChange={setIsSeasonalityDialogOpen}
        dataPoints={rawDataPoints}
        onApplySeasonality={handleApplySeasonality}
        initialPeriod={seasonalityPeriod}
        initialFactors={seasonalFactors}
        initialGrouping={seasonalityGrouping}
      />
    </Card>
  );
}
