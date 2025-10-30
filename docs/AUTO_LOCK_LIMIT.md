# Auto Lock Limit (Detecting Outliers)

## Overview

Auto Lock Limit is an intelligent feature that automatically detects outliers in your data and recalculates control limits with those outliers excluded. This helps distinguish between **special cause variation** (outliers) and **common cause variation** (normal process variation), resulting in more accurate and meaningful control limits.

## Purpose

Traditional XMR charts calculate control limits using all data points. However, when outliers are present due to one-time events or special causes, they can artificially widen the control limits, making the chart less sensitive to detecting real process changes.

Auto Lock Limit solves this by:

1. **Detecting outliers** using multiple statistical methods
2. **Recalculating limits** without the detected outliers
3. **Automatically locking** these limits for a more accurate view of normal process behavior

## How It Works

### Automatic Triggering

Auto Lock Limit runs **once** when a chart first loads, if:

1. ✅ Sufficient data points available (≥ 10 points)
2. ✅ No trend analysis active
3. ✅ No seasonality adjustments active
4. ✅ Limits not already manually locked
5. ✅ Data has sufficient variation (Coefficient of Variation > 0.05)
6. ✅ At least one outlier detected

### Consensus-Based Detection

Rather than relying on a single method, Auto Lock uses a **consensus approach** with multiple detection algorithms:

#### 1. IQR (Interquartile Range) Method

The most robust method, resistant to extreme values:

```
Q1 = 25th percentile
Q3 = 75th percentile
IQR = Q3 - Q1

Lower Bound = Q1 - (multiplier × IQR)
Upper Bound = Q3 + (multiplier × IQR)
```

**Adaptive Multiplier**: The IQR multiplier adapts based on data characteristics:

- **High variability** (CV > 0.5): multiplier = 1.5 (more sensitive)
- **Moderate variability** (0.3 < CV ≤ 0.5): multiplier = 2.0 (balanced)
- **Low variability** (CV ≤ 0.3): multiplier = 2.5 (less sensitive)
- **Highly skewed data** (skewness > 1): multiplier increased by 0.5

Where CV = Coefficient of Variation = (Standard Deviation / Mean)

#### 2. Z-Score Method

Identifies points that are unusually far from the mean:

```
Z-Score = (value - mean) / standard deviation

Outlier if |Z-Score| > threshold (default: 2.5)
```

**Strict Threshold**: For the most recent data point, a stricter threshold of 3.0 is used to avoid flagging it as an outlier unless it's extremely anomalous.

#### 3. MAD (Median Absolute Deviation) Method

More robust to outliers than standard deviation:

```
Median = 50th percentile
MAD = median(|values - median|)

Modified Z-Score = 0.6745 × (value - median) / MAD

Outlier if |Modified Z-Score| > 3.5
```

#### 4. Percentile Method

Flags extreme values at the tails of the distribution:

```
Lower Bound = 1st percentile
Upper Bound = 99th percentile

Outlier if value < Lower Bound or value > Upper Bound
```

### Consensus Algorithm

A data point is flagged as an outlier if:

```
(Detected by ≥ 2 methods) OR (Detected by ≥ 1 method AND Z-Score > 3.0)
```

This approach reduces false positives while ensuring extreme outliers are caught.

### Additional Safeguards

1. **Maximum Outlier Limit**: No more than 25% of data points can be flagged as outliers
2. **Recent Point Protection**: The most recent data point is protected unless it has an extreme Z-Score (> 3.0)
3. **Minimum Data Requirement**: Requires at least 10 data points for reliable detection
4. **Variation Threshold**: Only activates if Coefficient of Variation > 0.05 (5%)

## Implementation Flow

```typescript
// 1. Check if auto-lock should be applied
const shouldAutoLock = shouldAutoLockLimits(rawDataPoints);

if (shouldAutoLock) {
  // 2. Detect outliers and calculate new limits
  const result = calculateLimitsWithOutlierRemoval(rawDataPoints);

  // 3. Automatically lock the limits
  setLockedLimits(result.limits);
  setIsLimitsLocked(true);
  setAutoLocked(true);

  // 4. Store outlier information
  setOutlierIndices(result.outlierIndices);
  setOriginalAutoOutliers(result.outlierIndices);
}
```

## Visual Indicators

When Auto Lock is active:

### 1. Lock Status Badge

```
🔒 Auto-Locked (X outliers excluded)
```

Displayed prominently on the submetric card with the count of excluded outliers.

### 2. Chart Annotations

- **Excluded points**: Shown as translucent dots on the chart
- **Tooltip indication**: Hovering over excluded points shows "Excluded from limits"
- **Control limits**: Displayed as solid lines (indicating locked status)

### 3. Lock Dialog

Opening the Lock Limits dialog shows:

- Table of all data points with exclusion status
- Outliers marked with visual indicator
- Option to restore auto-detected outliers
- Current calculated limits without outliers

## User Interactions

### Viewing Auto-Locked Limits

Click the lock icon on the submetric card to open the Lock Limits dialog and see:

- Which points were automatically excluded
- The recalculated limit values
- Comparison with original limits (if calculated without exclusions)

### Modifying Auto-Locked Limits

Users can:

1. **Keep auto-lock as-is**: Simply close the dialog
2. **Manually adjust limits**: Edit limit values and re-lock (converts to manual lock)
3. **Include/exclude points**: Toggle exclusion of specific data points
4. **Unlock limits**: Return to dynamic limits that include all points
5. **Reset to auto-lock**: If modified, restore original auto-detected configuration

### Disabling Auto-Lock

Auto-lock can be disabled by:

- Clicking "Unlock Limits" in the Lock Limits dialog
- Activating trend analysis (incompatible with locked limits)
- Activating seasonality adjustments (incompatible with locked limits)

## Detection Algorithm Details

### Data Distribution Analysis

Before detecting outliers, the system analyzes the data distribution:

```typescript
export function analyzeDataDistribution(values: number[]): {
  coefficientOfVariation: number;
  skewness: number;
  iqrMultiplier: number;
} {
  // Calculate basic statistics
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance =
    values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
    values.length;
  const stdDev = Math.sqrt(variance);

  // Coefficient of Variation (normalized variability)
  const coefficientOfVariation = mean !== 0 ? stdDev / Math.abs(mean) : 0;

  // Skewness (asymmetry of distribution)
  const skewness = calculateSkewness(values, mean, stdDev);

  // Adaptive IQR multiplier based on CV and skewness
  let iqrMultiplier = 2.0; // default

  if (coefficientOfVariation > 0.5) {
    iqrMultiplier = 1.5; // More sensitive for high variability
  } else if (coefficientOfVariation <= 0.3) {
    iqrMultiplier = 2.5; // Less sensitive for low variability
  }

  // Adjust for skewness
  if (Math.abs(skewness) > 1.0) {
    iqrMultiplier += 0.5; // Less aggressive for skewed distributions
  }

  return { coefficientOfVariation, skewness, iqrMultiplier };
}
```

### IQR Edge Case: Zero IQR

When IQR = 0 (middle 50% of values are identical):

```typescript
if (iqr === 0) {
  // Fallback to percentage difference from median
  const median = calculateMedian(values);

  values.forEach((value, index) => {
    const percentDiff =
      Math.abs(value - median) / Math.max(Math.abs(median), 1);

    // Flag if > 5% difference from median
    if (percentDiff > 0.05 && value !== median) {
      outlierIndices.push(index);
    }
  });
}
```

### Consensus Scoring

Each data point receives a "detection score":

```typescript
const candidateOutliers = new Map<number, number>();

// Each method votes
[iqrOutliers, zScoreOutliers, madOutliers, percentileOutliers].forEach(
  (outlierSet) => {
    outlierSet.forEach((index) => {
      candidateOutliers.set(index, (candidateOutliers.get(index) || 0) + 1);
    });
  }
);

// Filter: require 2+ votes OR 1 vote with extreme z-score
const finalOutliers = Array.from(candidateOutliers.entries()).filter(
  ([index, methodCount]) => {
    const zScore = Math.abs((values[index] - mean) / stdDev);
    return methodCount >= 2 || (methodCount >= 1 && zScore > 3.0);
  }
);
```

## Benefits

### 1. More Accurate Control Limits

By excluding special causes (outliers), the control limits better represent the natural process variation, making the chart more sensitive to detecting real changes.

**Example:**

- **Before auto-lock**: LNPL = 50, UNPL = 150 (wide due to outliers)
- **After auto-lock**: LNPL = 70, UNPL = 130 (tighter, more useful)

### 2. Automatic and Consistent

No manual intervention required. The system consistently applies the same rigorous statistical methods to all metrics.

### 3. Reduced False Negatives

With tighter limits, the chart is more likely to detect when the process has actually changed, reducing the risk of missing important signals.

### 4. Transparency

All detected outliers are clearly marked and can be reviewed. Users can see exactly which points were excluded and why.

### 5. Reversible

Auto-lock is completely reversible. Users can unlock limits at any time to see the original calculation with all points included.

## Limitations and Considerations

### 1. Minimum Data Requirement

Requires at least 10 data points. With fewer points, outlier detection is unreliable.

### 2. Not Suitable for All Scenarios

Auto-lock should not be used when:

- Outliers are valid and represent the process (e.g., seasonal spikes)
- Data has a trend (use trend analysis instead)
- Process intentionally varies widely (use seasonality adjustments)

### 3. Single-Pass Detection

Auto-lock runs once on initial load. If new data arrives later that would change outlier detection, auto-lock does not re-run automatically. User can unlock and let it re-evaluate.

### 4. May Hide Important Information

If all "outliers" are actually valid process behavior, excluding them could hide reality. Always verify that excluded points truly represent special causes.

### 5. Incompatible with Trend/Seasonality

Cannot use auto-lock simultaneously with trend lines or seasonality adjustments. These features address different patterns in data.

## Configuration Constants

```typescript
export const OUTLIER_DETECTION = {
  MIN_DATA_POINTS: 10, // Minimum points for detection
  MAX_OUTLIER_PERCENTAGE: 0.25, // Max 25% can be outliers
  ZSCORE_THRESHOLD: 2.5, // Z-score threshold for outlier
  ZSCORE_STRICT_THRESHOLD: 3.0, // Stricter threshold for recent point
  MAD_THRESHOLD: 3.5, // MAD modified z-score threshold
  PERCENTILE_THRESHOLD: [0.01, 0.99], // 1st and 99th percentile
  VARIATION_THRESHOLD: 0.05, // Min 5% CV to attempt detection
};
```

These constants can be adjusted based on your domain and tolerance for false positives/negatives.

## Use Cases

### 1. One-Time Events

A server crash caused an anomalous spike in error rate. Auto-lock excludes this point, allowing you to see normal error rate variation.

### 2. Data Entry Errors

A typo in manual data entry (e.g., 10000 instead of 100). Auto-lock detects and excludes it, preventing distorted limits.

### 3. Special Promotions

During Black Friday, sales spiked significantly. Auto-lock can exclude this period to establish limits for normal sales patterns.

### 4. Equipment Failures

A machine breakdown caused a production dip. Excluding this outlier shows the typical production capability when equipment is functioning.

### 5. Initial Ramp-Up

When a new process is starting, initial data points may be unstable. Auto-lock can help focus on steady-state behavior.

## Best Practices

### 1. Review Detected Outliers

Always check which points were flagged as outliers. Ensure they truly represent special causes, not normal process behavior.

### 2. Document Special Causes

For excluded outliers, document the reason (e.g., "Equipment maintenance on 2024-01-15"). This provides context for future analysis.

### 3. Don't Overuse

Not every metric needs auto-lock. Only use it when outliers are genuinely distorting your view of the process.

### 4. Combine with Root Cause Analysis

When outliers are detected, investigate why they occurred. The goal is to prevent recurrence, not just exclude them statistically.

### 5. Periodic Review

Revisit auto-locked limits periodically. If the process has changed, you may need to recalculate limits with more recent data.

## Comparison: Auto Lock vs Manual Lock

| Aspect                | Auto Lock Limit               | Manual Lock Limit           |
| --------------------- | ----------------------------- | --------------------------- |
| **Trigger**           | Automatic on load             | User-initiated              |
| **Outlier Detection** | Algorithmic (4 methods)       | User judgment               |
| **Limit Calculation** | Automatic (excludes outliers) | User can modify values      |
| **Flexibility**       | Fixed algorithm               | Fully customizable          |
| **Use Case**          | Clear statistical outliers    | Domain-specific adjustments |
| **Reversibility**     | Can unlock anytime            | Can unlock anytime          |
| **Transparency**      | Shows detected outliers       | Shows user exclusions       |

## Troubleshooting

### "No outliers detected but I see obvious outliers"

Possible reasons:

- Data variation is too low (CV < 5%)
- "Outliers" are not statistically extreme enough
- Consensus requirement not met (only 1 method flagged them)

**Solution**: Use manual lock and exclude points yourself.

### "Too many points flagged as outliers"

The algorithm is capped at 25% of points. If more than 25% seem like outliers:

- Process may have multiple modes or regimes
- Consider segmenting data by time period
- May need trend or seasonality analysis instead

### "Auto-lock not triggering"

Check prerequisites:

- At least 10 data points?
- Coefficient of Variation > 5%?
- Not already manually locked?
- Trend/seasonality not active?
- Are there actual outliers? (Run `shouldAutoLockLimits()` manually)

### "Recent point incorrectly excluded"

The recent point has extra protection (Z-Score > 3.0 required). If it's still excluded, it's extremely anomalous. Consider if it's valid data.

## Related Documentation

- [Lock Limit](./lock-limit.md) - Manual limit locking and customization
- [Controller Logic](./controller-logic-traffic-light.md) - How locked limits affect process control status
- [Trend Lines](./trend-lines.md) - Alternative approach for data with trends

## References

- Outlier Detection Methods: Iglewicz & Hoaglin, "Volume 16: How to Detect and Handle Outliers"
- Statistical Process Control: Wheeler, "Understanding Variation"
- XMRit User Manual: https://xmrit.com/manual/
