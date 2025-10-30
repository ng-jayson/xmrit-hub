# Trend Lines and Setting the Trend Line

## Overview

Trend Lines provide a way to analyze and visualize linear trends in your data within the XMR chart framework. When your process has a consistent upward or downward trend, traditional static control limits can be misleading. Trend lines create **dynamic control limits** that adjust along with the trend, allowing you to distinguish between expected trend-based variation and true process changes.

## Purpose

Traditional XMR charts assume a stable process with no trend. When a trend is present:

- Static limits become less meaningful
- Points may appear as violations when they're simply following the trend
- Process changes can be masked by the trend

Trend lines solve this by:
1. **Modeling the trend** using linear regression
2. **Creating dynamic limits** that move with the trend
3. **Adjusting violation detection** to account for the trend
4. **Revealing true process variation** independent of the trend

## When to Use Trend Lines

✅ **Use trend analysis when:**
- Data shows consistent upward or downward movement
- Process is in ramp-up or ramp-down phase
- Growth or decline is expected and normal
- Want to detect variation around the trend

❌ **Don't use trend analysis when:**
- Data is stable with no consistent direction
- Trend is due to seasonality (use seasonality adjustment instead)
- Trend is caused by outliers (use auto-lock/lock limits instead)
- Trend is nonlinear (consider data transformation or segmentation)

## How Trend Lines Work

### 1. Linear Regression

The system fits a linear regression line through your data:

```
Y = m × X + c

Where:
- Y = predicted value
- X = data point index (0, 1, 2, ...)
- m = slope (gradient/rate of change)
- c = intercept (starting value)
```

**Example**:
- If m = 2.5, the value increases by 2.5 units per time period
- If m = -1.2, the value decreases by 1.2 units per time period

### 2. Moving Range Calculation

The average moving range (avgMR) is calculated from the differences between consecutive points:

```
Movement[i] = |Value[i] - Value[i-1]|
avgMR = average of all movements
```

This represents the typical step-by-step variation in your process.

### 3. Dynamic Control Limits

For each data point, control limits are calculated relative to the trend line:

```
Centre Line = m × i + c
UNPL = Centre Line + (avgMR × 2.66)
LNPL = Centre Line - (avgMR × 2.66)
```

Where 2.66 is the natural process limit constant for XMR charts.

### 4. Standard vs Reduced Limits

Two sets of trend limits are provided:

**Standard Limits**: Include trend slope in variation calculation
```
UNPL = Trend + (avgMR × 2.66)
LNPL = Trend - (avgMR × 2.66)
```

**Reduced Limits**: Subtract trend slope from variation (tighter)
```
Reduced UNPL = Trend + (max(0, avgMR - |m|) × 2.66)
Reduced LNPL = Trend - (max(0, avgMR - |m|) × 2.66)
```

**Use case**:
- Standard limits: Default, includes all variation
- Reduced limits: When you want to see variation that's independent of the trend itself

## Setting Trend Lines

### Automatic Trend Detection

If your submetric label includes keywords like "trend", "uptrend", or "downtrend", the system can automatically apply trend analysis:

**Example labels**:
- "Sales - uptrend"
- "Cost Reduction - downtrend"
- "Revenue (trend)"

When detected:
1. Trend is automatically calculated on page load
2. Dynamic limits are applied
3. Chart updates to show trend line and limits

### Manual Trend Application

#### Step 1: Open Trend Dialog

Click the "Trend" button (📈) on the submetric card. This opens the Trend Analysis dialog.

#### Step 2: Review Calculated Trend

The dialog displays:
- **Gradient (m)**: Rate of change per time period
- **Intercept (c)**: Starting value at point 0
- **Average Movement**: Typical variation between points
- **Trend Line Preview**: Visual representation of the trend

**Interpretation**:
- Positive gradient: Upward trend
- Negative gradient: Downward trend
- Larger absolute gradient: Steeper trend

#### Step 3: (Optional) Adjust Trend Parameters

You can manually edit the gradient and intercept:

```
Gradient (m): [____]
Intercept (c): [____]
```

**Why adjust manually?**
- Apply a target trend rate instead of calculated
- Smooth out short-term fluctuations
- Align with business projections

#### Step 4: Apply Trend

Click "Apply Trend" to activate. The chart updates to show:
- Green dashed trend line (centre)
- Dynamic UNPL and LNPL moving with the trend
- Quartile lines if applicable
- Optional reduced limits toggle

### Removing Trend

To remove trend analysis:
1. Open Trend Dialog
2. Click "Remove Trend" button
3. Chart reverts to static limits calculated from all data

## Trend Line Visualization

### On the Chart

**Trend Centre Line**:
- Green dashed line (```#10b981```)
- Thicker than regular limits (3px)
- Labeled "Trend Centre" in tooltip

**Trend Limits (Standard)**:
- Gray solid lines (```#94a3b8```)
- UNPL: Upper trend limit
- LNPL: Lower trend limit
- Adjust dynamically at each point

**Trend Quartiles**:
- Lighter gray dashed lines (```#9ca3af```)
- Upper Quartile: Between centre and UNPL
- Lower Quartile: Between centre and LNPL
- Help gauge severity of deviations

**Reduced Limits (Optional)**:
- Maroon dashed lines (```#9f1239```)
- Tighter than standard limits
- Toggle on/off with "Show Reduced Limits" checkbox

**Data Points**:
- Plotted as usual
- Violations detected relative to trend limits
- Points outside trend limits highlighted in red/orange

### In the UI

**Trend Active Badge**:
```
📈 Trend Active (m=2.5)
```

Shows gradient value to indicate trend direction and magnitude.

**Trend Button**:
- Highlighted when trend is active
- Click to open dialog and modify/remove trend

## Violation Detection with Trends

When trend analysis is active, violation detection uses the **trend limits** instead of static limits:

### Western Electric Rules (Adapted for Trends)

1. **Outside Limits**: Point beyond trend UNPL or LNPL
2. **Running Points**: 8+ consecutive points above or below trend centre
3. **Four Near Limit**: 4 out of 5 points beyond trend quartiles
4. **Two of Three Beyond 2σ**: 2 out of 3 consecutive points beyond trend quartiles
5. **Fifteen Within 1σ**: 15+ consecutive points very close to trend centre

These rules are calculated point-by-point using the dynamic trend limits.

### Traffic Light Status with Trends

The traffic light (process control status) evaluates based on **baseline limits**, not trend limits:
- Trend lines show expected trajectory
- Traffic light shows overall stability
- A process with trend can still be "in control" if variation is within bounds

## Use Cases

### 1. Business Growth Tracking

**Scenario**: Your company is experiencing consistent 5% monthly growth in user signups.

**Application**:
1. Apply trend to signups metric
2. Dynamic limits adjust upward each month
3. Violations indicate growth faster or slower than expected
4. Can compare actual growth to target growth (by setting manual gradient)

### 2. Cost Reduction Initiative

**Scenario**: You're implementing process improvements to reduce manufacturing costs over 6 months.

**Application**:
1. Apply downward trend to cost metric
2. Monitor if cost reductions are on track
3. Violations above trend indicate reduction stalled
4. Violations below trend indicate ahead of target

### 3. Product Ramp-Up

**Scenario**: New product line is ramping up production over first 3 months.

**Application**:
1. Apply upward trend to production volume
2. Expect steady increase as line reaches capacity
3. Detect if ramp-up is slower than expected (below trend)
4. Identify if variation around trend is normal or problematic

### 4. Seasonal Business with Trend

**Scenario**: E-commerce business has year-over-year growth plus seasonal patterns.

**Application**:
1. Apply seasonality adjustments to remove seasonal component (see Seasonality docs)
2. Apply trend to seasonally-adjusted data
3. Trend captures long-term growth
4. Violations indicate deviation from growth trajectory

### 5. Performance Improvement Projects

**Scenario**: Tracking response time improvements after infrastructure upgrade.

**Application**:
1. Apply downward trend to response time
2. Gradient represents expected improvement rate
3. Monitor if improvements are sustained
4. Detect if response time regresses (points above trend)

## Combining with Other Features

### Trend + Seasonality

Can be used together:
1. First apply seasonality to remove recurring patterns
2. Then apply trend to the seasonally-adjusted data
3. Captures both long-term trend and seasonal cycles

### Trend + Lock Limits

**Incompatible**: Trend analysis and locked limits cannot be used simultaneously.
- Trend creates dynamic limits
- Lock fixes limits at static values
- Activating trend will unlock limits
- Activating lock will disable trend

**Workflow**:
- Use trend during trend phase
- Once process stabilizes, remove trend and lock limits at new stable level

### Trend + Outliers

Outliers can significantly affect trend calculation. Best practice:
1. Identify and exclude major outliers first (manually)
2. Calculate trend on cleaned data
3. Re-include outliers if needed to see how they deviate from trend

## Advanced: Manual Trend Adjustment

### Setting Target Gradient

If you have a business target (e.g., "grow 10 units per week"):

1. Open Trend Dialog
2. Calculate target gradient: `m = 10`
3. Manually set gradient to 10
4. Adjust intercept to current baseline
5. Apply trend
6. Monitor if actual performance matches target

### Adjusting for Short-Term Fluctuations

If calculated trend is noisy due to short-term ups and downs:

1. Calculate trend over longer baseline period
2. Smooth gradient by averaging multiple calculations
3. Manually set smoother gradient value
4. Provides more stable reference trend

### Projecting Future Expectations

Trend line extends through all data points, showing:
- Expected value at each point if trend continues
- Basis for forecasting next period (though XMR is not primarily a forecasting tool)

## Implementation Details

### Regression Calculation

```typescript
export function calculateLinearRegression(data: DataPoint[]): { m: number; c: number } | null {
  if (data.length < 2) return null;

  const n = data.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

  for (let i = 0; i < n; i++) {
    const x = i; // Use index as X
    const y = data[i].value;

    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
  }

  const numerator = n * sumXY - sumX * sumY;
  const denominator = n * sumX2 - sumX * sumX;

  if (denominator === 0) return null;

  const m = numerator / denominator;
  const c = (sumY - m * sumX) / n;

  return { m, c };
}
```

### Trend Lines Generation

```typescript
export function createTrendLines(stats: RegressionStats, data: DataPoint[]): TrendLimits {
  const { m, c, avgMR } = stats;
  const trendLines: TrendLimits = {
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

  data.forEach((d, i) => {
    const centreValue = i * m + c;

    // Standard limits
    const unplValue = centreValue + avgMR * 2.66;
    const lnplValue = centreValue - avgMR * 2.66;

    // Reduced limits (account for trend slope)
    const reducedUnplValue = centreValue + Math.max(0, avgMR - Math.abs(m)) * 2.66;
    const reducedLnplValue = centreValue - Math.max(0, avgMR - Math.abs(m)) * 2.66;

    // Quartiles
    const upperQuartileValue = (unplValue + centreValue) / 2;
    const lowerQuartileValue = (lnplValue + centreValue) / 2;

    trendLines.centreLine.push({ timestamp: d.timestamp, value: centreValue });
    trendLines.unpl.push({ timestamp: d.timestamp, value: unplValue });
    trendLines.lnpl.push({ timestamp: d.timestamp, value: lnplValue });
    // ... etc for all lines
  });

  return trendLines;
}
```

### State Management

```typescript
// Trend state
const [trendActive, setTrendActive] = useState(false);
const [trendGradient, setTrendGradient] = useState<number>(0);
const [trendIntercept, setTrendIntercept] = useState<number>(0);
const [showReducedTrendLimits, setShowReducedTrendLimits] = useState(false);

// Calculate trend lines
const trendLines = useMemo<TrendLimits | null>(() => {
  if (!trendActive || processedDataPoints.length < 2) {
    return null;
  }

  const stats: RegressionStats = {
    m: trendGradient,
    c: trendIntercept,
    avgMR: baseXmrData.limits.avgMovement,
  };

  return createTrendLines(stats, processedDataPoints);
}, [trendActive, trendGradient, trendIntercept, processedDataPoints, baseXmrData.limits.avgMovement]);
```

## Best Practices

### 1. Verify Trend is Linear

Before applying trend:
- Visually inspect the data
- Ensure trend is reasonably linear, not curved
- If trend is nonlinear, consider segmenting data by phase

### 2. Use Sufficient Data

Trend requires at least 10-15 points for reliable calculation:
- More data = more accurate trend estimate
- Short-term fluctuations have less influence with more points

### 3. Understand Trend Source

Ask why the trend exists:
- Is it expected and desirable (growth, improvement)?
- Is it a problem (decline, degradation)?
- Is it temporary (ramp-up) or permanent (new baseline)?

### 4. Monitor Gradient Changes

If the gradient changes significantly:
- Indicates trend rate has changed
- May need to recalculate trend for new period
- Could signal process shift requiring investigation

### 5. Document Trend Decisions

Record:
- Why trend was applied
- What the gradient represents (business meaning)
- Any manual adjustments made to gradient/intercept
- Expected duration of trend

### 6. Plan for Trend End

Eventually, most trends stabilize:
- Monitor for when trend plateaus
- Remove trend analysis when no longer applicable
- Lock limits at new stable baseline

### 7. Combine with Domain Knowledge

Don't rely solely on calculated trend:
- Compare with business targets and projections
- Validate trend makes sense in your context
- Adjust manually if calculated trend seems off

## Troubleshooting

### "Trend line doesn't fit my data well"

Possible reasons:
- Data is not actually linear (curved, stepped, cyclic)
- Outliers are skewing the regression
- Trend rate has changed over time (need segmentation)

**Solutions**:
- Exclude outliers before calculating trend
- Segment data and apply trend to recent period only
- Consider if seasonality or other patterns are present

### "Trend button is disabled"

Requirements for trend analysis:
- At least 2 data points (recommended 10+)
- Not currently showing insufficient data message

### "Reduced limits are the same as standard limits"

This occurs when:
- `avgMR ≈ |m|` (average movement equals trend slope)
- `avgMR < |m|` (movement smaller than slope)

Interpretation: Most variation is due to the trend itself; little variation around trend.

### "All points are violations after applying trend"

Possible causes:
- Trend gradient or intercept is incorrect
- Data doesn't actually have a consistent trend
- Recent process shift not captured by trend line

**Solutions**:
- Recalculate trend using recent data only
- Manually adjust gradient to better fit
- Check if data should be segmented into phases

### "Trend and lock limits both show as active"

This shouldn't happen - they're mutually exclusive. If you see this, it's a UI bug. Try:
- Refresh the page
- Explicitly remove one feature
- Check browser console for errors

## Related Documentation

- [Lock Limit](./LOCK_LIMIT.md) - Incompatible with trend, but useful after trend stabilizes
- [Auto Lock Limit](./AUTO_LOCK_LIMIT.md) - Can be used to clean data before applying trend
- [Controller Logic](./CONTROLLER_TRAFFIC_LIGHT.md) - How traffic light evaluates processes with trends
- [Seasonality](./DESEASONALISATION.md) - Can be combined with trends for data with both patterns

## References

- Linear Regression: Montgomery, "Introduction to Linear Regression Analysis"
- Control Charts with Trends: Wheeler, "Making Sense of Data"
- XMRit User Manual: https://xmrit.com/manual/
- Statistical Process Control: Woodall & Montgomery, "Research Issues and Ideas in SPC"

