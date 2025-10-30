/**
 * XMR (X-bar and Moving Range) Chart Calculations
 * Based on Statistical Process Control principles
 */

// ============================================================================
// LOCKED LIMIT STATUS TRACKING
// ============================================================================

/**
 * Bitwise flags to track which specific limits have been modified
 */
export enum LockedLimitStatus {
  UNLOCKED = 0, // 0000 - No limits locked
  LOCKED = 1, // 0001 - Limits locked (no modifications)
  UNPL_MODIFIED = 2, // 0010 - Upper limit modified
  LNPL_MODIFIED = 4, // 0100 - Lower limit modified
  AVGX_MODIFIED = 8, // 1000 - Average modified
}

/**
 * Check if average X has been modified
 */
export function isAvgXModified(status: LockedLimitStatus): boolean {
  return (
    (status & LockedLimitStatus.AVGX_MODIFIED) ===
    LockedLimitStatus.AVGX_MODIFIED
  );
}

/**
 * Check if upper limit (UNPL) has been modified
 */
export function isUnplModified(status: LockedLimitStatus): boolean {
  return (
    (status & LockedLimitStatus.UNPL_MODIFIED) ===
    LockedLimitStatus.UNPL_MODIFIED
  );
}

/**
 * Check if lower limit (LNPL) has been modified
 */
export function isLnplModified(status: LockedLimitStatus): boolean {
  return (
    (status & LockedLimitStatus.LNPL_MODIFIED) ===
    LockedLimitStatus.LNPL_MODIFIED
  );
}

/**
 * Determine which quartile lines should be displayed based on locked limit modifications
 */
export function shouldUseQuartile(
  status: LockedLimitStatus,
  limits: XMRLimits
): { useUpperQuartile: boolean; useLowerQuartile: boolean } {
  // Helper function to check if limits are symmetric around average
  function isSymmetric(avg: number, unpl: number, lnpl: number): boolean {
    return Math.abs(unpl + lnpl - 2 * avg) < 0.001;
  }

  // If no modifications (only LOCKED flag or UNLOCKED), show both quartiles
  if ((status & ~1) === 0) {
    return { useUpperQuartile: true, useLowerQuartile: true };
  }

  // If both limits modified, or average modified, check symmetry
  if (
    (isLnplModified(status) && isUnplModified(status)) ||
    isAvgXModified(status)
  ) {
    return isSymmetric(limits.avgX, limits.UNPL, limits.LNPL)
      ? { useUpperQuartile: true, useLowerQuartile: true }
      : { useUpperQuartile: false, useLowerQuartile: false };
  }

  // If only UNPL modified, hide upper quartile
  if (isUnplModified(status)) {
    return { useUpperQuartile: false, useLowerQuartile: true };
  }

  // If only LNPL modified, hide lower quartile
  if (isLnplModified(status)) {
    return { useUpperQuartile: true, useLowerQuartile: false };
  }

  // Default: show both
  return { useUpperQuartile: true, useLowerQuartile: true };
}

// ============================================================================
// DATA TYPES
// ============================================================================

export interface DataPoint {
  timestamp: string;
  value: number;
  confidence?: number | null;
}

export interface MovingRangePoint {
  timestamp: string;
  value: number;
  range: number;
}

export interface XMRLimits {
  avgX: number;
  avgMovement: number;
  UNPL: number; // Upper Natural Process Limit
  LNPL: number; // Lower Natural Process Limit
  URL: number; // Upper Range Limit
  lowerQuartile: number;
  upperQuartile: number;
}

/**
 * Enhanced violation types based on Western Electric Rules
 */
export enum ViolationType {
  OUTSIDE_LIMITS = "outside_limits",
  RUNNING_POINTS = "running_points",
  FOUR_NEAR_LIMIT = "four_near_limit",
  TWO_OF_THREE_BEYOND_TWO_SIGMA = "two_of_three_beyond_two_sigma",
  FIFTEEN_WITHIN_ONE_SIGMA = "fifteen_within_one_sigma",
}

/**
 * Detailed violation information
 */
export interface ViolationDetails {
  outsideLimits: number[];
  runningPoints: number[];
  fourNearLimit: number[];
  twoOfThreeBeyondTwoSigma: number[];
  fifteenWithinOneSigma: number[];
}

export interface XMRData {
  dataPoints: MovingRangePoint[];
  limits: XMRLimits;
  violations: ViolationDetails;
}

// Minimum number of data points required for XMR chart calculations
export const MINIMUM_XMR_DATA_POINTS = 6;

// Constants from the original XMR implementation
const NPL_SCALING = 2.66;
const URL_SCALING = 3.268;
const MEDIAN_NPL_SCALING = 3.145;
const MEDIAN_URL_SCALING = 3.865;

// Outlier detection constants
export const OUTLIER_DETECTION = {
  MIN_DATA_POINTS: 6,
  IQR_MULTIPLIER_AGGRESSIVE: 1.0,
  IQR_MULTIPLIER_MODERATE: 1.2,
  IQR_MULTIPLIER_CONSERVATIVE: 1.5,
  ZSCORE_THRESHOLD: 1.8,
  ZSCORE_STRICT_THRESHOLD: 2.2,
  PERCENTILE_THRESHOLD: 0.08,
  MAD_MULTIPLIER: 2.2,
  MAX_OUTLIER_PERCENTAGE: 0.25,
  VARIATION_THRESHOLD: 0.001,
};

// Decimal precision for rounding calculations
export const DECIMAL_PRECISION = 2;

/**
 * Round a number to a specified decimal precision
 * @param n - Number to round
 * @param precision - Number of decimal places (defaults to DECIMAL_PRECISION)
 * @returns Rounded number
 */
export function roundToDecimalPrecision(
  n: number,
  precision: number = DECIMAL_PRECISION
): number {
  const factor = Math.pow(10, precision);
  return Math.round(n * factor) / factor;
}

/**
 * Calculate moving ranges (absolute differences between consecutive points)
 */
export function calculateMovingRanges(data: DataPoint[]): MovingRangePoint[] {
  if (data.length < 2) return [];

  const ranges: MovingRangePoint[] = [];

  for (let i = 1; i < data.length; i++) {
    const range = Math.abs(data[i].value - data[i - 1].value);
    ranges.push({
      timestamp: data[i].timestamp,
      value: data[i].value,
      range: range,
    });
  }

  return ranges;
}

/**
 * Calculate median of an array
 */
function calculateMedian(arr: number[]): number {
  if (arr.length === 0) return 0;

  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/**
 * Calculate XMR control limits and statistics
 */
export function calculateXMRLimits(
  data: DataPoint[],
  useMedian: boolean = false
): XMRLimits {
  if (data.length < 2) {
    return {
      avgX: 0,
      avgMovement: 0,
      UNPL: 0,
      LNPL: 0,
      URL: 0,
      lowerQuartile: 0,
      upperQuartile: 0,
    };
  }

  const values = data.map((d) => d.value);
  const ranges = calculateMovingRanges(data);
  const rangeValues = ranges.map((r) => r.range);

  // Calculate averages
  const avgX = useMedian
    ? calculateMedian(values)
    : values.reduce((sum, val) => sum + val, 0) / values.length;

  const avgMovement =
    rangeValues.length > 0
      ? useMedian
        ? calculateMedian(rangeValues)
        : rangeValues.reduce((sum, val) => sum + val, 0) / rangeValues.length
      : 0;

  // Calculate control limits
  const nplScaling = useMedian ? MEDIAN_NPL_SCALING : NPL_SCALING;
  const urlScaling = useMedian ? MEDIAN_URL_SCALING : URL_SCALING;

  const delta = nplScaling * avgMovement;
  const UNPL = avgX + delta;
  const LNPL = avgX - delta;
  const URL = urlScaling * avgMovement;

  const lowerQuartile = (LNPL + avgX) / 2;
  const upperQuartile = (UNPL + avgX) / 2;

  return {
    avgX: roundToDecimalPrecision(avgX),
    avgMovement: roundToDecimalPrecision(avgMovement),
    UNPL: roundToDecimalPrecision(UNPL),
    LNPL: roundToDecimalPrecision(LNPL),
    URL: roundToDecimalPrecision(URL),
    lowerQuartile: roundToDecimalPrecision(lowerQuartile),
    upperQuartile: roundToDecimalPrecision(upperQuartile),
  };
}

// ============================================================================
// ENHANCED VIOLATION DETECTION (Western Electric Rules)
// ============================================================================

/**
 * Check for points outside control limits (Rule 1)
 * Supports both static limits and dynamic trend limits
 */
function checkOutsideLimits(
  data: MovingRangePoint[],
  limits: XMRLimits,
  trendLimits?: TrendLimits
): number[] {
  const violations: number[] = [];
  data.forEach((point, index) => {
    // Use trend limits if available, otherwise use static limits
    const UNPL = trendLimits ? trendLimits.unpl[index]?.value : limits.UNPL;
    const LNPL = trendLimits ? trendLimits.lnpl[index]?.value : limits.LNPL;

    if (point.value < LNPL || point.value > UNPL) {
      violations.push(index);
    }
  });
  return violations;
}

/**
 * Check for running points - 8 consecutive points on same side of center line (Rule 2)
 * Supports both static average and dynamic trend centre line
 */
function checkRunningPoints(
  data: MovingRangePoint[],
  limits: XMRLimits,
  trendLimits?: TrendLimits
): number[] {
  const violations: number[] = [];
  if (data.length < 8) return violations;

  let consecutiveAbove = 0;
  let consecutiveBelow = 0;

  data.forEach((point, index) => {
    // Use trend centre line if available, otherwise use static average
    const centerLine = trendLimits
      ? trendLimits.centreLine[index]?.value
      : limits.avgX;

    if (point.value > centerLine) {
      consecutiveAbove++;
      consecutiveBelow = 0;
    } else if (point.value < centerLine) {
      consecutiveBelow++;
      consecutiveAbove = 0;
    } else {
      consecutiveAbove = 0;
      consecutiveBelow = 0;
    }

    // Mark as running point if we have 8+ consecutive points
    if (consecutiveAbove >= 8 || consecutiveBelow >= 8) {
      violations.push(index);
    }
  });

  return violations;
}

/**
 * Check for 4 near limit - 3 out of 4 consecutive points in extreme quartiles (Rule 3)
 * Supports both static quartiles and dynamic trend quartiles
 */
function checkFourNearLimit(
  data: MovingRangePoint[],
  limits: XMRLimits,
  trendLimits?: TrendLimits
): number[] {
  const violations: number[] = [];
  if (data.length < 4) return violations;

  // Use sliding window of 4 points
  for (let i = 3; i < data.length; i++) {
    let belowQuartile = 0;
    let aboveQuartile = 0;

    // Check the 4-point window [i-3, i-2, i-1, i]
    for (let j = i - 3; j <= i; j++) {
      // Use trend quartiles if available, otherwise use static quartiles
      const upperQuartile = trendLimits
        ? trendLimits.upperQuartile[j]?.value
        : limits.upperQuartile;
      const lowerQuartile = trendLimits
        ? trendLimits.lowerQuartile[j]?.value
        : limits.lowerQuartile;

      if (data[j].value < lowerQuartile) {
        belowQuartile++;
      } else if (data[j].value > upperQuartile) {
        aboveQuartile++;
      }
    }

    // If 3 or more out of 4 are in extreme quarters, mark all 4 points
    if (belowQuartile >= 3 || aboveQuartile >= 3) {
      for (let j = i - 3; j <= i; j++) {
        if (!violations.includes(j)) {
          violations.push(j);
        }
      }
    }
  }

  return violations;
}

/**
 * Check for 2 out of 3 consecutive points beyond 2-sigma (Rule 4)
 * Supports both static limits and dynamic trend limits
 */
function checkTwoOfThreeBeyondTwoSigma(
  data: MovingRangePoint[],
  limits: XMRLimits,
  trendLimits?: TrendLimits
): number[] {
  const violations: number[] = [];
  if (data.length < 3) return violations;

  // Calculate 2-sigma boundaries (between average and control limits)
  // Control limits are at 2.66 sigma, so 2-sigma is at 2/2.66 of the range
  const twoSigmaRatio = 2.0 / 2.66;

  // Use sliding window of 3 points
  for (let i = 2; i < data.length; i++) {
    let beyondTwoSigma = 0;

    // Check the 3-point window [i-2, i-1, i]
    for (let j = i - 2; j <= i; j++) {
      // Calculate 2-sigma boundaries for each point (static or trend)
      const centerLine = trendLimits
        ? trendLimits.centreLine[j]?.value
        : limits.avgX;
      const UNPL = trendLimits ? trendLimits.unpl[j]?.value : limits.UNPL;
      const LNPL = trendLimits ? trendLimits.lnpl[j]?.value : limits.LNPL;

      const upperTwoSigma = centerLine + (UNPL - centerLine) * twoSigmaRatio;
      const lowerTwoSigma = centerLine - (centerLine - LNPL) * twoSigmaRatio;

      if (data[j].value > upperTwoSigma || data[j].value < lowerTwoSigma) {
        beyondTwoSigma++;
      }
    }

    // If 2 or more out of 3 are beyond 2-sigma, mark all 3 points
    if (beyondTwoSigma >= 2) {
      for (let j = i - 2; j <= i; j++) {
        if (!violations.includes(j)) {
          violations.push(j);
        }
      }
    }
  }

  return violations;
}

/**
 * Check for 15 consecutive points within 1-sigma of center line (Rule 5)
 * Supports both static limits and dynamic trend limits
 */
function checkFifteenWithinOneSigma(
  data: MovingRangePoint[],
  limits: XMRLimits,
  trendLimits?: TrendLimits
): number[] {
  const violations: number[] = [];
  if (data.length < 15) return violations;

  // Calculate 1-sigma boundaries
  const oneSigmaRatio = 1.0 / 2.66;

  let consecutiveWithinOneSigma = 0;

  data.forEach((point, index) => {
    // Calculate 1-sigma boundaries for each point (static or trend)
    const centerLine = trendLimits
      ? trendLimits.centreLine[index]?.value
      : limits.avgX;
    const UNPL = trendLimits ? trendLimits.unpl[index]?.value : limits.UNPL;
    const LNPL = trendLimits ? trendLimits.lnpl[index]?.value : limits.LNPL;

    const upperOneSigma = centerLine + (UNPL - centerLine) * oneSigmaRatio;
    const lowerOneSigma = centerLine - (centerLine - LNPL) * oneSigmaRatio;

    if (point.value >= lowerOneSigma && point.value <= upperOneSigma) {
      consecutiveWithinOneSigma++;
    } else {
      consecutiveWithinOneSigma = 0;
    }

    // Mark as violation if we have 15+ consecutive points within 1-sigma
    if (consecutiveWithinOneSigma >= 15) {
      violations.push(index);
    }
  });

  return violations;
}

/**
 * Detect all violations using enhanced Western Electric rules
 * Supports both static limits and dynamic trend limits
 */
export function detectViolations(
  data: MovingRangePoint[],
  limits: XMRLimits,
  trendLimits?: TrendLimits
): ViolationDetails {
  if (data.length === 0) {
    return {
      outsideLimits: [],
      runningPoints: [],
      fourNearLimit: [],
      twoOfThreeBeyondTwoSigma: [],
      fifteenWithinOneSigma: [],
    };
  }

  return {
    outsideLimits: checkOutsideLimits(data, limits, trendLimits),
    runningPoints: checkRunningPoints(data, limits, trendLimits),
    fourNearLimit: checkFourNearLimit(data, limits, trendLimits),
    twoOfThreeBeyondTwoSigma: checkTwoOfThreeBeyondTwoSigma(
      data,
      limits,
      trendLimits
    ),
    fifteenWithinOneSigma: checkFifteenWithinOneSigma(
      data,
      limits,
      trendLimits
    ),
  };
}

/**
 * Generate complete XMR chart data
 */
export function generateXMRData(
  data: DataPoint[],
  useMedian: boolean = false
): XMRData {
  const ranges = calculateMovingRanges(data);
  const limits = calculateXMRLimits(data, useMedian);
  const violations = detectViolations(ranges, limits);

  return {
    dataPoints: ranges,
    limits,
    violations,
  };
}

/**
 * Check if process is in statistical control
 */
export function isProcessInControl(limits: XMRLimits): boolean {
  // Process is in control if:
  // 1. Average X is between LNPL and UNPL
  // 2. Average Movement is less than or equal to URL
  return (
    limits.avgX >= limits.LNPL &&
    limits.avgX <= limits.UNPL &&
    limits.avgMovement <= limits.URL
  );
}

/**
 * Analyze data distribution to determine IQR multiplier
 */
export function analyzeDataDistribution(values: number[]): {
  coefficientOfVariation: number;
  skewness: number;
  iqrMultiplier: number;
} {
  if (values.length === 0) {
    return {
      coefficientOfVariation: 0,
      skewness: 0,
      iqrMultiplier: OUTLIER_DETECTION.IQR_MULTIPLIER_CONSERVATIVE,
    };
  }

  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance =
    values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
    values.length;
  const stdDev = Math.sqrt(variance);

  // Coefficient of Variation (CV) = stdDev / mean (for mean != 0)
  const coefficientOfVariation = mean !== 0 ? stdDev / Math.abs(mean) : 0;

  // Calculate skewness
  const skewness =
    values.reduce((sum, val) => sum + Math.pow((val - mean) / stdDev, 3), 0) /
    values.length;

  // Determine IQR multiplier based on CV
  let iqrMultiplier: number;
  if (coefficientOfVariation < 0.1) {
    iqrMultiplier = OUTLIER_DETECTION.IQR_MULTIPLIER_AGGRESSIVE;
  } else if (coefficientOfVariation < 0.3) {
    iqrMultiplier = OUTLIER_DETECTION.IQR_MULTIPLIER_MODERATE;
  } else {
    iqrMultiplier = OUTLIER_DETECTION.IQR_MULTIPLIER_CONSERVATIVE;
  }

  return { coefficientOfVariation, skewness, iqrMultiplier };
}

/**
 * Detect outliers using IQR (Interquartile Range) method
 */
export function detectOutliersIQR(values: number[]): number[] {
  if (values.length < OUTLIER_DETECTION.MIN_DATA_POINTS) return [];

  const sorted = [...values].sort((a, b) => a - b);
  const q1Index = Math.floor(sorted.length * 0.25);
  const q3Index = Math.floor(sorted.length * 0.75);
  const q1 = sorted[q1Index];
  const q3 = sorted[q3Index];
  const iqr = q3 - q1;

  // Edge case: IQR = 0 (all middle 50% values are identical)
  if (iqr === 0) {
    // Fallback to percentage difference from median
    const median = calculateMedian(values);
    const outlierIndices: number[] = [];

    values.forEach((value, index) => {
      // Calculate percentage difference from median
      const percentDiff =
        Math.abs(value - median) / Math.max(Math.abs(median), 1);

      // Flag as outlier if percentage difference exceeds threshold and value differs from median
      if (
        percentDiff > OUTLIER_DETECTION.VARIATION_THRESHOLD &&
        value !== median
      ) {
        outlierIndices.push(index);
      }
    });

    return outlierIndices;
  }

  // Normal IQR logic
  // Get adaptive multiplier based on data distribution
  const { iqrMultiplier } = analyzeDataDistribution(values);

  const lowerBound = q1 - iqrMultiplier * iqr;
  const upperBound = q3 + iqrMultiplier * iqr;

  const outlierIndices: number[] = [];
  values.forEach((value, index) => {
    if (value < lowerBound || value > upperBound) {
      outlierIndices.push(index);
    }
  });

  return outlierIndices;
}

/**
 * Detect outliers using Z-Score method
 */
export function detectOutliersZScore(
  values: number[],
  threshold: number = OUTLIER_DETECTION.ZSCORE_THRESHOLD
): number[] {
  if (values.length < OUTLIER_DETECTION.MIN_DATA_POINTS) return [];

  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance =
    values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
    values.length;
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) return [];

  const outlierIndices: number[] = [];
  values.forEach((value, index) => {
    const zScore = Math.abs((value - mean) / stdDev);
    if (zScore > threshold) {
      outlierIndices.push(index);
    }
  });

  return outlierIndices;
}

/**
 * Detect outliers using MAD (Median Absolute Deviation) method
 */
export function detectOutliersMAD(values: number[]): number[] {
  if (values.length < OUTLIER_DETECTION.MIN_DATA_POINTS) return [];

  const median = calculateMedian(values);
  const absoluteDeviations = values.map((val) => Math.abs(val - median));
  const mad = calculateMedian(absoluteDeviations);

  if (mad === 0) return [];

  const outlierIndices: number[] = [];
  values.forEach((value, index) => {
    const modifiedZScore = (0.6745 * (value - median)) / mad;
    if (Math.abs(modifiedZScore) > OUTLIER_DETECTION.MAD_MULTIPLIER) {
      outlierIndices.push(index);
    }
  });

  return outlierIndices;
}

/**
 * Detect outliers using Percentile method
 */
export function detectOutliersPercentile(values: number[]): number[] {
  if (values.length < OUTLIER_DETECTION.MIN_DATA_POINTS) return [];

  const sorted = [...values].sort((a, b) => a - b);
  const lowerIndex = Math.floor(
    sorted.length * OUTLIER_DETECTION.PERCENTILE_THRESHOLD
  );
  const upperIndex = Math.floor(
    sorted.length * (1 - OUTLIER_DETECTION.PERCENTILE_THRESHOLD)
  );

  const lowerThreshold = sorted[lowerIndex];
  const upperThreshold = sorted[upperIndex];

  const outlierIndices: number[] = [];
  values.forEach((value, index) => {
    if (value < lowerThreshold || value > upperThreshold) {
      outlierIndices.push(index);
    }
  });

  return outlierIndices;
}

/**
 * Remove outliers from data using consensus-based approach
 */
export function removeOutliersFromData(data: DataPoint[]): {
  cleanedData: DataPoint[];
  removedOutliers: DataPoint[];
  outlierIndices: number[];
} {
  if (data.length < OUTLIER_DETECTION.MIN_DATA_POINTS) {
    return {
      cleanedData: data,
      removedOutliers: [],
      outlierIndices: [],
    };
  }

  const values = data.map((d) => d.value);

  // Run all detection methods
  const iqrOutliers = new Set(detectOutliersIQR(values));
  const zScoreOutliers = new Set(detectOutliersZScore(values));
  const madOutliers = new Set(detectOutliersMAD(values));
  const percentileOutliers = new Set(detectOutliersPercentile(values));

  // Consensus: flag if detected by at least 2 methods (more robust)
  // This reduces false positives from single-method detection
  const candidateOutliers = new Map<number, number>();
  [iqrOutliers, zScoreOutliers, madOutliers, percentileOutliers].forEach(
    (outlierSet) => {
      outlierSet.forEach((index) => {
        candidateOutliers.set(index, (candidateOutliers.get(index) || 0) + 1);
      });
    }
  );

  // Calculate z-scores to identify extreme outliers
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance =
    values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
    values.length;
  const stdDev = Math.sqrt(variance);

  // Filter candidates: require at least 2 methods to agree, OR 1 method with very high z-score
  const sortedCandidates = Array.from(candidateOutliers.entries())
    .map(([index, methodCount]) => {
      const zScore = stdDev > 0 ? Math.abs((values[index] - mean) / stdDev) : 0;
      return { index, methodCount, zScore };
    })
    .filter(({ methodCount, zScore }) => {
      // Accept if 2+ methods agree, or 1 method with extreme z-score (>3.0)
      return methodCount >= 2 || (methodCount >= 1 && zScore > 3.0);
    })
    .sort((a, b) => {
      // First, prioritize by method count
      if (b.methodCount !== a.methodCount) {
        return b.methodCount - a.methodCount;
      }
      // Then by z-score (more extreme first)
      return b.zScore - a.zScore;
    });

  // Limit to max 25% of data points
  const maxOutliers = Math.floor(
    data.length * OUTLIER_DETECTION.MAX_OUTLIER_PERCENTAGE
  );
  const finalOutlierIndices = sortedCandidates
    .slice(0, maxOutliers)
    .map((c) => c.index)
    .sort((a, b) => a - b);

  // Protect the most recent point unless it's an extreme outlier
  const lastIndex = data.length - 1;
  const lastPointIndex = finalOutlierIndices.indexOf(lastIndex);
  if (lastPointIndex !== -1) {
    const lastPointZScore =
      stdDev > 0 ? Math.abs((values[lastIndex] - mean) / stdDev) : 0;
    if (lastPointZScore < OUTLIER_DETECTION.ZSCORE_STRICT_THRESHOLD) {
      finalOutlierIndices.splice(lastPointIndex, 1);
    }
  }

  // Create cleaned data and removed outliers arrays
  const outlierSet = new Set(finalOutlierIndices);
  const cleanedData: DataPoint[] = [];
  const removedOutliers: DataPoint[] = [];

  data.forEach((point, index) => {
    if (outlierSet.has(index)) {
      removedOutliers.push(point);
    } else {
      cleanedData.push(point);
    }
  });

  return {
    cleanedData,
    removedOutliers,
    outlierIndices: finalOutlierIndices,
  };
}

/**
 * Calculate limits with outlier removal
 */
export function calculateLimitsWithOutlierRemoval(data: DataPoint[]): {
  limits: XMRLimits;
  cleanedData: DataPoint[];
  removedOutliers: DataPoint[];
  outlierIndices: number[];
} {
  if (data.length < OUTLIER_DETECTION.MIN_DATA_POINTS) {
    return {
      limits: calculateXMRLimits(data),
      cleanedData: data,
      removedOutliers: [],
      outlierIndices: [],
    };
  }

  const { cleanedData, removedOutliers, outlierIndices } =
    removeOutliersFromData(data);

  // Calculate limits based on cleaned data
  const limits = calculateXMRLimits(cleanedData);

  return {
    limits,
    cleanedData,
    removedOutliers,
    outlierIndices,
  };
}

/**
 * Determine if auto-lock should be applied
 */
export function shouldAutoLockLimits(dataPoints: DataPoint[]): boolean {
  if (dataPoints.length < OUTLIER_DETECTION.MIN_DATA_POINTS) {
    return false;
  }

  // Check if there's enough variation in the data to warrant outlier detection
  const values = dataPoints.map((d) => d.value);
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance =
    values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
    values.length;
  const stdDev = Math.sqrt(variance);
  const coefficientOfVariation = mean !== 0 ? stdDev / Math.abs(mean) : 0;

  // Only auto-lock if there's sufficient variation (CV > threshold)
  if (coefficientOfVariation < OUTLIER_DETECTION.VARIATION_THRESHOLD) {
    return false;
  }

  // Check if outlier removal would make a difference
  const { outlierIndices } = removeOutliersFromData(dataPoints);

  // Auto-lock if we detected at least one outlier
  return outlierIndices.length > 0;
}

/**
 * TREND ANALYSIS FUNCTIONS
 */

export interface RegressionStats {
  m: number; // slope
  c: number; // intercept
  avgMR: number; // average moving range
}

export interface TrendLimits {
  centreLine: DataPoint[];
  unpl: DataPoint[];
  lnpl: DataPoint[];
  lowerQuartile: DataPoint[];
  upperQuartile: DataPoint[];
  reducedUnpl: DataPoint[];
  reducedLnpl: DataPoint[];
  reducedLowerQuartile: DataPoint[];
  reducedUpperQuartile: DataPoint[];
}

/**
 * Calculate linear regression for trend analysis
 */
export function calculateLinearRegression(
  data: DataPoint[]
): { m: number; c: number } | null {
  if (data.length < 2) {
    return null;
  }

  // Normalize data - use indices as x values
  const normalizedData: { x: number; y: number }[] = data.map((d, i) => ({
    x: i,
    y: d.value,
  }));

  const n = data.length;

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;

  for (let i = 0; i < n; i++) {
    const x = normalizedData[i].x;
    const y = normalizedData[i].y;

    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
  }

  const numerator = n * sumXY - sumX * sumY;
  const denominator = n * sumX2 - sumX * sumX;

  if (denominator === 0) {
    console.error(
      "Denominator is zero; check the data points for possible vertical alignment."
    );
    return null;
  }

  const m = numerator / denominator;
  const c = (sumY - m * sumX) / n;

  return { m, c };
}

/**
 * Calculate regression statistics including moving range
 */
export function calculateRegressionStats(
  data: DataPoint[]
): RegressionStats | null {
  const regressionResult = calculateLinearRegression(data);
  if (!regressionResult) {
    return null;
  }

  const { m, c } = regressionResult;

  // Calculate moving ranges
  const ranges = calculateMovingRanges(data);
  const avgMR =
    ranges.length > 0
      ? ranges.reduce((sum, r) => sum + r.range, 0) / ranges.length
      : 0;

  return {
    m,
    c,
    avgMR,
  };
}

/**
 * Create trend lines based on regression statistics
 * Includes both standard and reduced limits (reduced limits account for trend slope)
 */
export function createTrendLines(
  stats: RegressionStats | null,
  data: DataPoint[]
): TrendLimits {
  const emptyTrendLines: TrendLimits = {
    centreLine: [],
    unpl: [],
    lnpl: [],
    lowerQuartile: [],
    upperQuartile: [],
    reducedUnpl: [],
    reducedLnpl: [],
    reducedLowerQuartile: [],
    reducedUpperQuartile: [],
  };

  if (!stats) return emptyTrendLines;

  const { m, c, avgMR } = stats;
  const centreLine: DataPoint[] = [];
  const unpl: DataPoint[] = [];
  const lnpl: DataPoint[] = [];
  const lowerQuartile: DataPoint[] = [];
  const upperQuartile: DataPoint[] = [];
  const reducedUnpl: DataPoint[] = [];
  const reducedLnpl: DataPoint[] = [];
  const reducedLowerQuartile: DataPoint[] = [];
  const reducedUpperQuartile: DataPoint[] = [];

  data.forEach((d, i) => {
    const centreLineValue = i * m + c;

    // Standard limits (include trend variation)
    const unplValue = centreLineValue + avgMR * NPL_SCALING;
    const lnplValue = centreLineValue - avgMR * NPL_SCALING;

    // Reduced limits (account for trend slope)
    // By subtracting the absolute slope from avgMR, we get tighter limits
    // that represent true process variation without the trend component
    const reducedUnplValue =
      centreLineValue + Math.max(0, avgMR - Math.abs(m)) * NPL_SCALING;
    const reducedLnplValue =
      centreLineValue - Math.max(0, avgMR - Math.abs(m)) * NPL_SCALING;

    // Quartiles for both standard and reduced
    const lowerQuartileValue = (lnplValue + centreLineValue) / 2;
    const upperQuartileValue = (unplValue + centreLineValue) / 2;
    const reducedLowerQuartileValue = (reducedLnplValue + centreLineValue) / 2;
    const reducedUpperQuartileValue = (reducedUnplValue + centreLineValue) / 2;

    centreLine.push({
      timestamp: d.timestamp,
      value: roundToDecimalPrecision(centreLineValue),
    });
    unpl.push({
      timestamp: d.timestamp,
      value: roundToDecimalPrecision(unplValue),
    });
    lnpl.push({
      timestamp: d.timestamp,
      value: roundToDecimalPrecision(lnplValue),
    });
    lowerQuartile.push({
      timestamp: d.timestamp,
      value: roundToDecimalPrecision(lowerQuartileValue),
    });
    upperQuartile.push({
      timestamp: d.timestamp,
      value: roundToDecimalPrecision(upperQuartileValue),
    });
    reducedUnpl.push({
      timestamp: d.timestamp,
      value: roundToDecimalPrecision(reducedUnplValue),
    });
    reducedLnpl.push({
      timestamp: d.timestamp,
      value: roundToDecimalPrecision(reducedLnplValue),
    });
    reducedLowerQuartile.push({
      timestamp: d.timestamp,
      value: roundToDecimalPrecision(reducedLowerQuartileValue),
    });
    reducedUpperQuartile.push({
      timestamp: d.timestamp,
      value: roundToDecimalPrecision(reducedUpperQuartileValue),
    });
  });

  return {
    centreLine,
    unpl,
    lnpl,
    lowerQuartile,
    upperQuartile,
    reducedUnpl,
    reducedLnpl,
    reducedLowerQuartile,
    reducedUpperQuartile,
  };
}

/**
 * DIVIDER / SEGMENTATION FUNCTIONS
 */

export interface DividerLine {
  id: string;
  x: number; // timestamp in milliseconds
}

export interface SegmentStats {
  xLeft: number; // segment start timestamp
  xRight: number; // segment end timestamp
  limits: XMRLimits;
  dataPoints: MovingRangePoint[];
}

/**
 * Check if a divider is a "shadow" divider (boundary dividers)
 */
export function isShadowDivider(divider: DividerLine): boolean {
  return (
    divider.id === "divider-start" ||
    divider.id === "divider-end" ||
    !divider.id
  );
}

/**
 * Sort dividers by x position
 */
export function sortDividers(dividers: DividerLine[]): DividerLine[] {
  return [...dividers].sort((a, b) => a.x - b.x);
}

/**
 * Calculate statistics for each segment between dividers
 */
export function calculateSegmentStats(
  data: MovingRangePoint[],
  dividers: DividerLine[],
  useMedian: boolean = false
): SegmentStats[] {
  if (data.length === 0) return [];

  // Ensure dividers are sorted
  const sortedDividers = sortDividers(dividers);

  // Need at least 2 dividers to create segments
  if (sortedDividers.length < 2) {
    // No segmentation - treat all data as one segment
    const limits = calculateXMRLimits(
      data.map((d) => ({ timestamp: d.timestamp, value: d.value })),
      useMedian
    );
    return [
      {
        xLeft: new Date(data[0].timestamp).getTime(),
        xRight: new Date(data[data.length - 1].timestamp).getTime(),
        limits,
        dataPoints: data,
      },
    ];
  }

  const segments: SegmentStats[] = [];

  // Process each segment between consecutive dividers
  for (let i = 0; i < sortedDividers.length - 1; i++) {
    const xLeft = sortedDividers[i].x;
    const xRight = sortedDividers[i + 1].x;

    // Filter data points within this segment
    const segmentData = data.filter((point) => {
      const timestamp = new Date(point.timestamp).getTime();
      return timestamp >= xLeft && timestamp <= xRight;
    });

    // Skip empty segments
    if (segmentData.length === 0) continue;

    // Calculate limits for this segment
    const limits = calculateXMRLimits(
      segmentData.map((d) => ({ timestamp: d.timestamp, value: d.value })),
      useMedian
    );

    segments.push({
      xLeft,
      xRight,
      limits,
      dataPoints: segmentData,
    });
  }

  return segments;
}

/**
 * Detect violations with segment-aware limits
 * Locked limits and trends only apply to the first segment
 */
export function detectViolationsWithSegments(
  data: MovingRangePoint[],
  segments: SegmentStats[],
  lockedLimits?: XMRLimits | null,
  trendLimits?: TrendLimits | null,
  lockedLimitStatus?: LockedLimitStatus
): ViolationDetails {
  if (data.length === 0 || segments.length === 0) {
    return {
      outsideLimits: [],
      runningPoints: [],
      fourNearLimit: [],
      twoOfThreeBeyondTwoSigma: [],
      fifteenWithinOneSigma: [],
    };
  }

  const allViolations: ViolationDetails = {
    outsideLimits: [],
    runningPoints: [],
    fourNearLimit: [],
    twoOfThreeBeyondTwoSigma: [],
    fifteenWithinOneSigma: [],
  };

  // Process each segment
  segments.forEach((segment, segmentIndex) => {
    const segmentData = segment.dataPoints;
    let limitsToUse = segment.limits;
    let trendLimitsToUse: TrendLimits | undefined = undefined;

    // For first segment, use locked limits or trend limits if available
    if (segmentIndex === 0) {
      if (lockedLimits && lockedLimitStatus === LockedLimitStatus.LOCKED) {
        limitsToUse = lockedLimits;
      } else if (trendLimits) {
        trendLimitsToUse = trendLimits;
      }
    }

    // Detect violations for this segment
    const segmentViolations = detectViolations(
      segmentData,
      limitsToUse,
      trendLimitsToUse
    );

    // Map segment indices to global indices
    segmentData.forEach((point, localIndex) => {
      const globalIndex = data.findIndex(
        (d) =>
          d.timestamp === point.timestamp &&
          Math.abs(d.value - point.value) < 0.001
      );

      if (globalIndex !== -1) {
        if (segmentViolations.outsideLimits.includes(localIndex)) {
          allViolations.outsideLimits.push(globalIndex);
        }
        if (segmentViolations.runningPoints.includes(localIndex)) {
          allViolations.runningPoints.push(globalIndex);
        }
        if (segmentViolations.fourNearLimit.includes(localIndex)) {
          allViolations.fourNearLimit.push(globalIndex);
        }
        if (segmentViolations.twoOfThreeBeyondTwoSigma.includes(localIndex)) {
          allViolations.twoOfThreeBeyondTwoSigma.push(globalIndex);
        }
        if (segmentViolations.fifteenWithinOneSigma.includes(localIndex)) {
          allViolations.fifteenWithinOneSigma.push(globalIndex);
        }
      }
    });
  });

  return allViolations;
}

/**
 * Create boundary dividers for the dataset
 */
export function createBoundaryDividers(data: DataPoint[]): DividerLine[] {
  if (data.length === 0) return [];

  const timestamps = data.map((d) => new Date(d.timestamp).getTime());
  const minTime = Math.min(...timestamps);
  const maxTime = Math.max(...timestamps);

  return [
    { id: "divider-start", x: minTime },
    { id: "divider-end", x: maxTime },
  ];
}

/**
 * Add a new divider at a specific position
 */
export function addDivider(
  existingDividers: DividerLine[],
  position?: number
): DividerLine[] {
  // Get non-shadow dividers
  const realDividers = existingDividers.filter((d) => !isShadowDivider(d));

  // Maximum 3 user dividers allowed
  if (realDividers.length >= 3) {
    return existingDividers;
  }

  // Get boundary dividers
  const boundaries = existingDividers.filter((d) => isShadowDivider(d));
  const minX = Math.min(...boundaries.map((d) => d.x));
  const maxX = Math.max(...boundaries.map((d) => d.x));

  // Calculate position if not provided
  let xPosition: number;
  if (position !== undefined) {
    xPosition = position;
  } else {
    // Place at next quarter position
    const range = maxX - minX;
    const quarterPosition = (realDividers.length + 1) / 4;
    xPosition = minX + range * quarterPosition;
  }

  // Create new divider
  const newDivider: DividerLine = {
    id: `divider-${realDividers.length + 1}`,
    x: xPosition,
  };

  return [...existingDividers, newDivider];
}

/**
 * Remove the most recently added divider
 */
export function removeDivider(dividers: DividerLine[]): DividerLine[] {
  const realDividers = dividers.filter((d) => !isShadowDivider(d));
  if (realDividers.length === 0) return dividers;

  // Remove the last added divider
  const lastDividerId = `divider-${realDividers.length}`;
  return dividers.filter((d) => d.id !== lastDividerId);
}

/**
 * Update divider position
 */
export function updateDividerPosition(
  dividers: DividerLine[],
  dividerId: string,
  newX: number
): DividerLine[] {
  return dividers.map((d) => (d.id === dividerId ? { ...d, x: newX } : d));
}

/**
 * SEASONALITY FUNCTIONS
 */

export type SeasonalityPeriod = "year" | "quarter" | "month" | "week";
export type SeasonalityGrouping = "none" | "week" | "month" | "quarter";

export interface SeasonalData {
  timestamp: string;
  value: number;
  season: number;
}

export interface SeasonalFactors {
  factors: number[];
  period: SeasonalityPeriod;
  grouping: SeasonalityGrouping;
  hasWarning: boolean;
}

/**
 * Determine data periodicity based on intervals
 * Returns the data granularity (how often data points occur)
 */
export function determinePeriodicity(data: DataPoint[]): SeasonalityPeriod {
  if (data.length < 2) return "year";

  // Calculate time deltas between consecutive points (in days)
  const deltas: number[] = [];
  for (let i = 1; i < data.length; i++) {
    const date1 = new Date(data[i - 1].timestamp);
    const date2 = new Date(data[i].timestamp);
    const diffTime = Math.abs(date2.getTime() - date1.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    deltas.push(diffDays);
  }

  // Count frequency of each delta
  const diffCounts: { [key: number]: number } = {};
  deltas.forEach((diff) => {
    diffCounts[diff] = (diffCounts[diff] || 0) + 1;
  });

  // Find most common interval
  const mostCommonDiff = Object.keys(diffCounts).reduce((a, b) =>
    diffCounts[Number(a)] > diffCounts[Number(b)] ? a : b
  );

  const interval = Number(mostCommonDiff);

  // Map intervals to data granularity
  if (interval < 28) {
    return "week";
  } else if (interval < 90) {
    return "month";
  } else if (interval < 365) {
    return "quarter";
  } else {
    return "year";
  }
}

/**
 * Get a map of which periods should be disabled based on data granularity
 * Mirrors main3.ts logic for minimum data granularity requirements
 *
 * Rules (from main3.ts lines 2108-2125):
 * - quarter interval: disable quarter, month, week (allow only year)
 * - month interval: disable month, week (allow quarter, year)
 * - week interval: disable week (allow month, quarter, year)
 * - else (day or finer): enable all
 */
export function getPeriodDisableMap(
  data: DataPoint[]
): Record<SeasonalityPeriod, boolean> {
  const interval = determinePeriodicity(data);

  // Default: all enabled
  const disableMap: Record<SeasonalityPeriod, boolean> = {
    year: false,
    quarter: false,
    month: false,
    week: false,
  };

  // Apply disable rules based on detected interval
  if (interval === "quarter") {
    // Quarterly data: only year allowed
    disableMap.quarter = true;
    disableMap.month = true;
    disableMap.week = true;
  } else if (interval === "month") {
    // Monthly data: quarter and year allowed
    disableMap.month = true;
    disableMap.week = true;
  } else if (interval === "week") {
    // Weekly data: month, quarter, year allowed
    disableMap.week = true;
  }
  // else: all periods enabled (daily or finer data)

  return disableMap;
}

/**
 * Calculate how many complete periods the data spans
 * Returns a fractional number (e.g., 0.5, 1.0, 2.5)
 * Used to warn when < 1 period (will flatten) or = 1 period (will be flat)
 */
export function getPeriodCoverage(
  data: DataPoint[],
  period: SeasonalityPeriod
): number {
  if (data.length < 2) return 0;

  const firstDate = new Date(data[0].timestamp);
  const lastDate = new Date(data[data.length - 1].timestamp);

  // Calculate time difference in the appropriate unit
  const diffTime = lastDate.getTime() - firstDate.getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);

  // Convert to period units
  switch (period) {
    case "week":
      return diffDays / 7;
    case "month":
      // Approximate: 30.44 days per month on average
      return diffDays / 30.44;
    case "quarter":
      // Approximate: 91.31 days per quarter on average
      return diffDays / 91.31;
    case "year":
      // 365.25 days per year on average (accounting for leap years)
      return diffDays / 365.25;
    default:
      return 0;
  }
}

/**
 * Periodize data based on period
 * This creates a 2D array where each sub-array represents one period (year/quarter/etc)
 * and contains all data points within that period in chronological order
 */
function periodiseData(
  data: DataPoint[],
  period: SeasonalityPeriod = "year"
): DataPoint[][] {
  if (data.length === 0) return [];

  // Group data by period and sub-period within each period
  const groupedData: Map<string, Map<number, DataPoint>> = new Map();

  data.forEach((point) => {
    const date = new Date(point.timestamp);
    let periodKey: string;
    let subPeriodIndex: number;

    switch (period) {
      case "year":
        periodKey = date.getFullYear().toString();
        // For yearly data, use day of year as sub-period
        const startOfYear = new Date(date.getFullYear(), 0, 1);
        subPeriodIndex = Math.floor(
          (date.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)
        );
        break;
      case "quarter":
        const quarter = Math.floor(date.getMonth() / 3) + 1;
        periodKey = `${date.getFullYear()}-Q${quarter}`;
        // For quarterly data, use day of quarter
        const quarterStart = new Date(date.getFullYear(), (quarter - 1) * 3, 1);
        subPeriodIndex = Math.floor(
          (date.getTime() - quarterStart.getTime()) / (1000 * 60 * 60 * 24)
        );
        break;
      case "month":
        periodKey = `${date.getFullYear()}-${(date.getMonth() + 1)
          .toString()
          .padStart(2, "0")}`;
        // For monthly data, use day of month
        subPeriodIndex = date.getDate() - 1;
        break;
      case "week":
      default:
        // Calculate week number
        const onejan = new Date(date.getFullYear(), 0, 1);
        const weekNum = Math.ceil(
          ((date.getTime() - onejan.getTime()) / 86400000 +
            onejan.getDay() +
            1) /
            7
        );
        periodKey = `${date.getFullYear()}-W${weekNum
          .toString()
          .padStart(2, "0")}`;
        // For weekly data, use day of week (0-6)
        subPeriodIndex = date.getDay();
        break;
    }

    if (!groupedData.has(periodKey)) {
      groupedData.set(periodKey, new Map());
    }
    groupedData.get(periodKey)!.set(subPeriodIndex, point);
  });

  // Convert to array format, maintaining chronological order
  const periodisedData: DataPoint[][] = [];
  const sortedPeriods = Array.from(groupedData.keys()).sort();

  sortedPeriods.forEach((periodKey) => {
    const periodData = groupedData.get(periodKey)!;
    const sortedIndices = Array.from(periodData.keys()).sort((a, b) => a - b);
    const periodArray = sortedIndices.map((idx) => periodData.get(idx)!);
    periodisedData.push(periodArray);
  });

  return periodisedData;
}

/**
 * Helper function to get aggregation strategy based on grouping
 */
function getAggregationStrategy(
  grouping: SeasonalityGrouping
): (values: number[]) => number {
  return grouping === "none"
    ? (values: number[]) =>
        values.reduce((sum, v) => sum + v, 0) / values.length // Average
    : (values: number[]) => values.reduce((sum, v) => sum + v, 0); // Sum
}

/**
 * Periodize data with grouping support
 * Groups data within periods before calculating factors
 */
function periodiseDataGrouped(
  data: DataPoint[],
  period: SeasonalityPeriod,
  grouping: SeasonalityGrouping
): DataPoint[][] {
  if (data.length === 0) return [];
  if (grouping === "none") return periodiseData(data, period);

  // Group data into sub-periods and aggregate
  const periodGroups: { [key: string]: DataPoint[] } = {};

  data.forEach((point) => {
    const date = new Date(point.timestamp);
    let periodKey: string;
    let groupKey: string;

    // Determine period (e.g., year)
    switch (period) {
      case "year":
        periodKey = date.getFullYear().toString();
        break;
      case "quarter":
        periodKey = `${date.getFullYear()}-Q${
          Math.floor(date.getMonth() / 3) + 1
        }`;
        break;
      default:
        periodKey = date.getFullYear().toString();
    }

    // Determine grouping within period (e.g., month)
    switch (grouping) {
      case "month":
        groupKey = `${periodKey}-${(date.getMonth() + 1)
          .toString()
          .padStart(2, "0")}`;
        break;
      case "week":
        const onejan = new Date(date.getFullYear(), 0, 1);
        const weekNum = Math.ceil(
          ((date.getTime() - onejan.getTime()) / 86400000 +
            onejan.getDay() +
            1) /
            7
        );
        groupKey = `${periodKey}-W${weekNum.toString().padStart(2, "0")}`;
        break;
      case "quarter":
        groupKey = `${periodKey}-Q${Math.floor(date.getMonth() / 3) + 1}`;
        break;
      default:
        groupKey = periodKey;
    }

    if (!periodGroups[groupKey]) {
      periodGroups[groupKey] = [];
    }
    periodGroups[groupKey].push(point);
  });

  // Aggregate groups
  const aggregatedGroups: { [key: string]: DataPoint } = {};
  Object.entries(periodGroups).forEach(([key, points]) => {
    const sum = points.reduce((acc, p) => acc + p.value, 0);
    aggregatedGroups[key] = {
      timestamp: points[0].timestamp,
      value: Math.round(sum * 100) / 100,
    };
  });

  // Convert to periodised array format
  const periodKeys = new Set(
    Object.keys(aggregatedGroups).map((k) => k.split("-")[0])
  );

  const periodisedData: DataPoint[][] = [];
  periodKeys.forEach((periodKey) => {
    const periodData = Object.entries(aggregatedGroups)
      .filter(([key]) => key.startsWith(periodKey))
      .map(([_, point]) => point);

    if (periodData.length > 0) {
      periodisedData.push(periodData);
    }
  });

  return periodisedData;
}

/**
 * Calculate seasonal factors from data with optional grouping
 */
export function calculateSeasonalFactors(
  data: DataPoint[],
  period: SeasonalityPeriod = "year",
  grouping: SeasonalityGrouping = "none"
): { factors: number[]; hasWarning: boolean } {
  if (data.length === 0) {
    return { factors: [], hasWarning: false };
  }

  // Use grouped or standard periodization
  const periodisedData =
    grouping !== "none"
      ? periodiseDataGrouped(data, period, grouping)
      : periodiseData(data, period);

  if (periodisedData.length === 0) {
    return { factors: [], hasWarning: false };
  }

  // Check if all periods have the same length
  const hasWarning = !periodisedData.every(
    (p) => p.length === periodisedData[0].length
  );

  // Calculate the number of sub-periods (seasons)
  const subPeriodCount = Math.max(...periodisedData.map((p) => p.length));

  // Get aggregation strategy based on grouping
  const aggregate = getAggregationStrategy(grouping);

  // Calculate sub-period aggregates
  const subPeriodAggregates: number[] = [];
  for (let i = 0; i < subPeriodCount; i++) {
    const validValues = periodisedData
      .map((p) => p[i])
      .filter((v) => v !== undefined && v !== null)
      .map((d) => d.value);

    if (validValues.length === 0) {
      // No valid data for this sub-period - will result in NaN factor
      subPeriodAggregates.push(NaN);
    } else {
      subPeriodAggregates.push(aggregate(validValues));
    }
  }

  // Calculate overall average based on grouping mode (matches main3.ts lines 535-539)
  const overallAvg =
    grouping !== "none"
      ? // Grouped: use subPeriodAggregates (including NaN for missing)
        subPeriodAggregates
          .filter((v) => !isNaN(v))
          .reduce((sum, val) => sum + val, 0) /
        subPeriodAggregates.filter((v) => !isNaN(v)).length
      : // Non-grouped: use all original data values
        data
          .filter((d) => d.value != null)
          .reduce((sum, d) => sum + d.value, 0) /
        data.filter((d) => d.value != null).length;

  // Calculate seasonal factors (matches main3.ts line 541-543)
  const seasonalFactors = subPeriodAggregates.map((v) =>
    isNaN(v) || overallAvg === 0
      ? 1.0 // Default to 1.0 for missing data (main3.ts uses isNaN check)
      : roundToDecimalPrecision(v / overallAvg, 4)
  );

  return { factors: seasonalFactors, hasWarning };
}

/**
 * Apply seasonal factors to data (deseasonalize)
 */
export function applySeasonalFactors(
  data: DataPoint[],
  seasonalFactors: number[],
  period: SeasonalityPeriod = "year",
  grouping: SeasonalityGrouping = "none"
): DataPoint[] {
  if (data.length === 0 || seasonalFactors.length === 0) {
    return data;
  }

  const deseasonalizedData: DataPoint[] = [];

  // Build a map of date to seasonal factor
  const dateSfMap: { [key: string]: number } = {};

  if (grouping === "none") {
    // Original behavior: use periodiseData for ungrouped data
    const periodisedData = periodiseData(data, period);

    periodisedData.forEach((periodData) => {
      periodData.forEach((point, i) => {
        if (i < seasonalFactors.length) {
          dateSfMap[point.timestamp] = seasonalFactors[i];
        }
      });
    });
  } else {
    // Grouped behavior: map each point to its group within the period
    data.forEach((point) => {
      const date = new Date(point.timestamp);
      let factorIndex: number;

      // Determine which factor to use based on grouping
      switch (grouping) {
        case "month":
          // Map to month of year (0-11)
          factorIndex = date.getMonth();
          break;
        case "week":
          // Map to week of year
          const onejan = new Date(date.getFullYear(), 0, 1);
          const weekNum = Math.ceil(
            ((date.getTime() - onejan.getTime()) / 86400000 +
              onejan.getDay() +
              1) /
              7
          );
          factorIndex = weekNum - 1; // 0-indexed
          break;
        case "quarter":
          // Map to quarter of year (0-3)
          factorIndex = Math.floor(date.getMonth() / 3);
          break;
        default:
          factorIndex = 0;
      }

      // Assign factor if within range
      if (factorIndex >= 0 && factorIndex < seasonalFactors.length) {
        dateSfMap[point.timestamp] = seasonalFactors[factorIndex];
      }
    });
  }

  // Apply seasonal factors
  data.forEach((point) => {
    const sf = dateSfMap[point.timestamp];
    if (sf !== undefined && sf !== 0) {
      deseasonalizedData.push({
        timestamp: point.timestamp,
        value: roundToDecimalPrecision(point.value / sf),
        confidence: point.confidence,
      });
    } else {
      deseasonalizedData.push({ ...point });
    }
  });

  return deseasonalizedData;
}

/**
 * Prepare seasonal data for display in table
 */
export function prepareSeasonalDataForTable(
  data: DataPoint[],
  period: SeasonalityPeriod = "year"
): SeasonalData[] {
  if (data.length === 0) return [];

  const periodisedData = periodiseData(data, period);
  const seasonalData: SeasonalData[] = [];

  periodisedData.forEach((periodData, periodIdx) => {
    periodData.forEach((point, seasonIdx) => {
      seasonalData.push({
        timestamp: point.timestamp,
        value: point.value,
        season: seasonIdx + 1,
      });
    });
  });

  return seasonalData;
}
