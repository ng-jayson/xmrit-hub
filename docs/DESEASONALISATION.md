# Seasonality Adjustments (Deseasonalisation)

## Overview

Seasonality Adjustments (also known as deseasonalisation) is a statistical technique that removes recurring periodic patterns from your data, allowing you to see the underlying trend and variation without seasonal distortion. This feature helps distinguish between **seasonal variation** (expected periodic changes) and **true process changes** (unexpected shifts or improvements).

## Purpose

Many business processes exhibit predictable seasonal patterns:

- Weekly cycles (weekday vs weekend)
- Monthly patterns (end-of-month spikes)
- Quarterly fluctuations (fiscal periods)
- Annual seasonality (holiday seasons, weather effects)

When these patterns are present, traditional XMR charts can be misleading:

- **Seasonal peaks and dips** may appear as violations
- **True process changes** can be hidden by seasonal noise
- **Control limits** become artificially wide to accommodate seasonal swings

Seasonality adjustments solve this by:

1. **Identifying seasonal patterns** across multiple periods
2. **Calculating seasonal factors** for each point in the cycle
3. **Adjusting data** to remove seasonal effects
4. **Creating meaningful control limits** based on deseasonalized data

## When to Use Seasonality Adjustments

✅ **Use seasonality adjustments when:**

- Data shows recurring patterns at regular intervals
- Peaks and dips occur predictably (same time each week/month/quarter/year)
- You have at least 2-3 complete periods of data
- You want to detect changes independent of seasonal effects
- Seasonal patterns are stable across periods

❌ **Don't use seasonality adjustments when:**

- Data has no recurring patterns (use standard XMR instead)
- You have less than 1 complete period of data
- Patterns are irregular or changing over time
- One-time events or outliers (use auto-lock/lock limits instead)
- Data has a trend (apply trend analysis first, then seasonality if needed)

## How Seasonality Adjustments Work

### 1. Period Selection

First, select the seasonality period that matches your data's recurring pattern:

| Period        | Description          | Example Use Cases                               |
| ------------- | -------------------- | ----------------------------------------------- |
| **Weekly**    | 7-day cycle          | Weekday vs weekend patterns                     |
| **Monthly**   | Calendar month cycle | End-of-month effects, monthly billing cycles    |
| **Quarterly** | 3-month cycle        | Fiscal quarters, seasonal business patterns     |
| **Annual**    | 12-month cycle       | Holiday seasons, weather effects, yearly trends |

**Important**: The period you select should match your data's natural granularity:

- **Daily data**: Can use any period (weekly, monthly, quarterly, annual)
- **Weekly data**: Use monthly, quarterly, or annual (not weekly)
- **Monthly data**: Use quarterly or annual (not weekly or monthly)
- **Quarterly data**: Use annual only (not weekly, monthly, or quarterly)

### 2. Data Periodisation

The system organizes your data into periods (cycles):

```
Period 1: Points 1-7 (Week 1)
Period 2: Points 8-14 (Week 2)
Period 3: Points 15-21 (Week 3)
...
```

Each position within the period (e.g., "Monday", "Day 1 of month") is tracked across all periods.

### 3. Seasonal Factor Calculation

For each position in the period, calculate the seasonal factor:

```
Seasonal Factor[position] = Average of all values at that position / Overall Average

Example (Weekly, position = Monday):
- Period 1 Monday: 100
- Period 2 Monday: 110
- Period 3 Monday: 105
- Average for Mondays: 105
- Overall Average: 95
- Monday Seasonal Factor: 105 / 95 = 1.105 (10.5% above average)
```

This factor represents how much higher or lower that position typically is compared to the overall average.

### 4. Deseasonalisation

Apply the seasonal factors to adjust the original data:

```
Deseasonalized Value = Original Value / Seasonal Factor

Example:
- Monday value: 110
- Monday seasonal factor: 1.105
- Deseasonalized value: 110 / 1.105 = 99.5
```

If Mondays are typically 10.5% higher, dividing by 1.105 removes that seasonal effect.

### 5. XMR Analysis on Deseasonalized Data

Calculate XMR control limits using the deseasonalized values:

- Average X: Mean of deseasonalized data
- Moving ranges: Differences between consecutive deseasonalized points
- Control limits: Calculated from deseasonalized data

These limits now represent variation **independent of seasonal effects**.

## Using the Seasonality Feature

### Step 1: Open Seasonality Dialog

Click the "Seasonality" button (📅) on the submetric card to open the Seasonality Adjustments dialog.

### Step 2: Select Period

Choose the seasonality period from the dropdown:

```
○ Weekly (7 days)
○ Monthly (~30 days)
○ Quarterly (~90 days)
○ Annual (~365 days)
```

**Note**: Some periods may be disabled if your data interval doesn't support them. Hover over disabled options to see why.

### Step 3: Review Warnings (if any)

The system may show warnings about data coverage:

**Insufficient Data Warning** (< 1 complete period):

```
⚠️ Insufficient Data Coverage
Your data spans less than one complete [period] (X% of a period).
When you deseasonalize, every point will become the same value (the average),
resulting in a flat line.
```

**Limited Data Warning** (≈ 1 period):

```
⚠️ Limited Data Coverage
Your data spans approximately one complete [period].
The deseasonalized result will be relatively flat because there's only
one season to compare against itself. For meaningful seasonal patterns,
data spanning multiple periods is recommended.
```

These warnings are **informational only** - you can still proceed, but be aware of the limitations.

### Step 4: Preview Deseasonalized Data

The dialog shows:

- **Table of seasonal factors** by period position
- **Preview chart** comparing original vs deseasonalized data
- **Statistics**: Original vs deseasonalized averages and variation

Review to ensure the adjustment makes sense for your data.

### Step 5: Apply Seasonality

Click "**Apply Seasonality**" to activate. The chart updates to show:

- Deseasonalized data points
- Control limits calculated from deseasonalized data
- "Seasonality Active" badge indicating the period
- Updated violation detection based on deseasonalized limits

### Removing Seasonality

To remove seasonality adjustments:

1. Open Seasonality Dialog
2. Click "Remove Seasonality" button
3. Chart reverts to original data with standard control limits

## Visual Indicators

### On the Chart

**Deseasonalized Data Points**:

- Plotted using adjusted values
- Seasonal peaks and dips are flattened
- Underlying variation becomes more visible

**Seasonally-Adjusted Control Limits**:

- Calculated from deseasonalized data
- Typically tighter than original limits (less seasonal noise)
- Displayed as standard XMR limit lines

**Tooltip Information**:

- Shows both original and deseasonalized values
- Displays seasonal factor for that point
- Indicates any violations relative to deseasonalized limits

### On the Submetric Card

**Seasonality Active Badge**:

```
📅 Seasonality: Quarterly
```

Shows which period is currently applied.

**Seasonality Button**:

- Highlighted when seasonality is active
- Click to open dialog and modify/remove seasonality

## Data Coverage Requirements

For reliable seasonal adjustments, you need sufficient data coverage:

| Coverage       | Description  | Recommendation                                                      |
| -------------- | ------------ | ------------------------------------------------------------------- |
| **< 1 period** | Insufficient | Results will be flat (all points = average). Warning shown.         |
| **1 period**   | Minimal      | Results will be relatively flat. Limited usefulness. Warning shown. |
| **2 periods**  | Adequate     | Can detect basic patterns. Minimum for meaningful analysis.         |
| **3+ periods** | Good         | Reliable seasonal factors. Recommended for production use.          |
| **5+ periods** | Excellent    | Robust seasonal patterns. Best for critical metrics.                |

### Coverage Examples

**Weekly Seasonality:**

- 1 period: 7 days of daily data
- 3 periods: 21 days of daily data
- 5 periods: 35 days (5 weeks) of daily data

**Annual Seasonality:**

- 1 period: 12 months of monthly data
- 3 periods: 36 months (3 years) of monthly data
- 5 periods: 60 months (5 years) of monthly data

## Period Selection Logic

The system automatically disables periods that don't match your data interval:

### Daily Data (points < 6 days apart)

- ✅ Weekly: Enabled
- ✅ Monthly: Enabled
- ✅ Quarterly: Enabled
- ✅ Annual: Enabled

### Weekly Data (points 6-8 days apart)

- ❌ Weekly: Disabled (data is already weekly)
- ✅ Monthly: Enabled
- ✅ Quarterly: Enabled
- ✅ Annual: Enabled

### Monthly Data (points 28-35 days apart)

- ❌ Weekly: Disabled (too coarse)
- ❌ Monthly: Disabled (data is already monthly)
- ✅ Quarterly: Enabled
- ✅ Annual: Enabled

### Quarterly Data (points 80-100 days apart)

- ❌ Weekly: Disabled (too coarse)
- ❌ Monthly: Disabled (too coarse)
- ❌ Quarterly: Disabled (data is already quarterly)
- ✅ Annual: Enabled only

**Rationale**: You need multiple data points per period position to calculate reliable seasonal factors. If your data is already at the period level (e.g., monthly data for monthly seasonality), there's only one point per position, making deseasonalisation meaningless.

## Use Cases

### 1. Retail Sales (Weekly Pattern)

**Scenario**: Online store has higher sales on weekends than weekdays.

**Application**:

1. Apply weekly seasonality to daily sales data
2. Removes weekend spike effect
3. Control limits based on day-of-week adjusted data
4. Can detect true changes (promotions, issues) separate from weekly pattern

**Before Seasonality**: Wide limits to accommodate weekend spikes, many false violations on weekdays

**After Seasonality**: Tighter limits, clear visibility of unusual changes

### 2. Support Tickets (Monthly Pattern)

**Scenario**: Customer support tickets spike at end of each month due to billing.

**Application**:

1. Apply monthly seasonality to daily ticket data
2. Removes end-of-month spike pattern
3. Detect if ticket volume is genuinely increasing vs just following pattern
4. Identify days that are unusual even accounting for monthly cycle

### 3. E-commerce Traffic (Annual Pattern)

**Scenario**: Website traffic spikes during holiday season (November-December).

**Application**:

1. Apply annual seasonality to daily traffic data (requires 2-3 years)
2. Removes holiday season effect
3. Compare year-over-year growth independent of seasonal spikes
4. Detect if traffic is growing, declining, or stable outside of holidays

### 4. Manufacturing Output (Quarterly Pattern)

**Scenario**: Production varies by fiscal quarter due to scheduled maintenance and demand.

**Application**:

1. Apply quarterly seasonality to weekly output data
2. Removes quarter-specific patterns
3. Detect genuine efficiency changes vs expected quarterly variation
4. Identify weeks that are outliers even for that quarter

### 5. Financial Metrics (Multiple Patterns)

**Scenario**: SaaS revenue has both monthly billing cycles and annual renewal seasonality.

**Application**:

1. First apply monthly seasonality to remove billing cycle effects
2. Then apply annual seasonality to remaining data (if needed)
3. See true revenue growth independent of both patterns
4. Note: Current implementation supports one period at a time; for multiple patterns, apply sequentially

## Combining with Other Features

### Seasonality + Trend Lines

Can be used together in sequence:

1. First apply seasonality to remove periodic patterns
2. Then apply trend analysis to the deseasonalized data
3. Captures both seasonal cycles and long-term trends
4. Trend limits adjust for expected growth, seasonality adjusts for recurring patterns

### Seasonality + Lock Limits

**Incompatible**: Seasonality and locked limits cannot be used simultaneously.

- Seasonality transforms the data, requiring recalculated limits
- Lock fixes limits at static values
- Activating seasonality will unlock limits
- Activating lock will disable seasonality

**Workflow**:

- Use seasonality to understand seasonal patterns
- Once patterns are stable, could manually lock limits on deseasonalized data (advanced use case)

### Seasonality + Auto Lock Limits

**Incompatible**: Seasonality and auto-lock cannot be used simultaneously.

- Auto-lock runs on original data to detect outliers
- Seasonality transforms data, changing what constitutes an outlier
- Best practice: Use one or the other, not both

**Decision criteria**:

- **Use auto-lock**: If you have outliers but no seasonal pattern
- **Use seasonality**: If you have seasonal pattern with few outliers
- **Sequence**: If both needed, remove outliers manually first, then apply seasonality

## Advanced Features

### Seasonal Factor Interpretation

Seasonal factors indicate how much each position deviates from average:

| Factor                      | Interpretation     | Example                               |
| --------------------------- | ------------------ | ------------------------------------- |
| **1.0**                     | Exactly average    | No seasonal effect at this position   |
| **> 1.0**                   | Above average      | Factor of 1.2 = 20% above average     |
| **< 1.0**                   | Below average      | Factor of 0.8 = 20% below average     |
| **Very different from 1.0** | Strong seasonality | Factor of 1.5 or 0.5 = strong pattern |

**Consistency check**: If all factors are close to 1.0 (between 0.95 and 1.05), your data may not have significant seasonality.

### Handling Incomplete Periods

If your data doesn't contain complete periods:

- Seasonal factors are calculated from available data at each position
- Positions with fewer observations are less reliable
- The system warns you but allows you to proceed
- Consider whether partial-period analysis is meaningful for your use case

### Edge Cases

**Zero or Constant Values**:

- If all values at a position are zero or constant, seasonal factor may be undefined
- System uses fallback factor of 1.0 (no adjustment)
- May indicate data quality issues

**Extreme Outliers**:

- Outliers can distort seasonal factors
- Consider removing outliers before applying seasonality
- Or apply seasonality first, then outliers in deseasonalized data will be clearer

**Changing Seasonal Patterns**:

- If seasonal patterns are evolving over time, factors from old data may not apply to new data
- Periodically re-evaluate and recalculate seasonality with recent data

## Implementation Details

### Periodisation Algorithm

```typescript
export function periodiseData(
  data: DataPoint[],
  period: SeasonalityPeriod
): DataPoint[][] {
  const periodLength = getPeriodLength(period); // 7, 30, 90, or 365
  const periods: DataPoint[][] = [];

  for (let i = 0; i < data.length; i += periodLength) {
    const periodData = data.slice(i, i + periodLength);
    if (periodData.length > 0) {
      periods.push(periodData);
    }
  }

  return periods;
}
```

### Seasonal Factor Calculation

```typescript
export function calculateSeasonalFactors(periods: DataPoint[][]): number[] {
  if (periods.length === 0) return [];

  const periodLength = periods[0].length;
  const factors: number[] = [];

  // Calculate overall average
  const allValues = periods.flat().map((p) => p.value);
  const overallAvg =
    allValues.reduce((sum, v) => sum + v, 0) / allValues.length;

  // Calculate factor for each position in period
  for (let pos = 0; pos < periodLength; pos++) {
    const valuesAtPosition = periods
      .filter((period) => period[pos] !== undefined)
      .map((period) => period[pos].value);

    if (valuesAtPosition.length === 0) {
      factors.push(1.0); // No data at this position
      continue;
    }

    const avgAtPosition =
      valuesAtPosition.reduce((sum, v) => sum + v, 0) / valuesAtPosition.length;
    const factor = overallAvg !== 0 ? avgAtPosition / overallAvg : 1.0;

    factors.push(factor);
  }

  return factors;
}
```

### Applying Seasonal Adjustment

```typescript
export function applySeasonalFactors(
  data: DataPoint[],
  factors: number[]
): DataPoint[] {
  return data.map((point, index) => {
    const positionInPeriod = index % factors.length;
    const factor = factors[positionInPeriod];

    return {
      ...point,
      value: factor !== 0 ? point.value / factor : point.value,
      // Store original for reference
      originalValue: point.value,
      seasonalFactor: factor,
    };
  });
}
```

### Period Coverage Calculation

```typescript
export function getPeriodCoverage(
  data: DataPoint[],
  period: SeasonalityPeriod
): number {
  if (data.length === 0) return 0;

  const firstDate = new Date(data[0].timestamp);
  const lastDate = new Date(data[data.length - 1].timestamp);
  const spanDays =
    (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24);

  const periodDays = {
    week: 7,
    month: 30,
    quarter: 90,
    year: 365,
  }[period];

  return spanDays / periodDays;
}
```

### State Management

```typescript
// Seasonality state
const [seasonalityActive, setSeasonalityActive] = useState(false);
const [seasonalityPeriod, setSeasonalityPeriod] =
  useState<SeasonalityPeriod | null>(null);
const [seasonalFactors, setSeasonalFactors] = useState<number[]>([]);

// Calculate deseasonalized data
const deseasonalizedData = useMemo(() => {
  if (!seasonalityActive || seasonalFactors.length === 0) {
    return rawDataPoints;
  }

  return applySeasonalFactors(rawDataPoints, seasonalFactors);
}, [seasonalityActive, seasonalFactors, rawDataPoints]);

// Use deseasonalized data for XMR calculations
const xmrData = useMemo(() => {
  return calculateXMRLimits(deseasonalizedData);
}, [deseasonalizedData]);
```

## Best Practices

### 1. Verify Seasonal Patterns Exist

Before applying seasonality:

- Visually inspect your data for recurring patterns
- Check if peaks/dips occur at predictable intervals
- Consider if the pattern is stable across time periods
- If no clear pattern exists, seasonality won't help (and may harm)

### 2. Use Sufficient Data

Recommendations by period:

- **Weekly**: Minimum 3 weeks (21 days), prefer 8-12 weeks
- **Monthly**: Minimum 2 months (60 days), prefer 6-12 months
- **Quarterly**: Minimum 2 quarters (6 months), prefer 2-3 years
- **Annual**: Minimum 2 years, prefer 3-5 years

### 3. Check Seasonal Factor Reasonableness

Review the calculated factors:

- Do they align with your domain knowledge?
- Are there positions with extreme factors (> 2.0 or < 0.5)?
- Extreme factors may indicate outliers or data quality issues
- Consider investigating and possibly excluding problem periods

### 4. Monitor for Changing Patterns

Seasonal patterns can evolve:

- Business changes (new product launches, market shifts)
- External factors (economic conditions, regulations)
- Customer behavior changes

Periodically recalculate seasonality with recent data to ensure factors are current.

### 5. Document Seasonality Decisions

Record:

- Which period you selected and why
- Date range of data used to calculate factors
- Any observations about the seasonal pattern
- Business rationale for expecting seasonality

### 6. Combine with Trend Analysis Carefully

When both trend and seasonality exist:

1. Apply seasonality first to remove periodic patterns
2. Then apply trend to the deseasonalized data
3. Order matters: seasonality then trend, not the reverse

### 7. Educate Stakeholders

When sharing deseasonalized charts:

- Explain that data has been adjusted
- Clarify what "deseasonalized" means
- Note that original data still matters for absolute values
- Deseasonalized data shows underlying patterns, not actual values

## Troubleshooting

### "Period options are disabled"

**Cause**: Your data interval doesn't match the period granularity.

**Example**: Monthly data cannot use weekly seasonality (too coarse).

**Solution**:

- Check your data interval (daily, weekly, monthly, quarterly)
- Select a period that is larger than your data interval
- Daily data supports all periods; weekly data supports monthly+; etc.

### "Warning: Insufficient data coverage"

**Cause**: Data spans less than one complete period.

**Impact**: Deseasonalized data will be flat (all points become the average).

**Solutions**:

- Collect more data to span at least 2-3 periods
- Choose a shorter period if possible (e.g., weekly instead of annual)
- Wait until more data accumulates before applying seasonality
- You can proceed anyway for testing, but results won't be meaningful

### "Deseasonalized data is still showing violations"

**Possible reasons**:

- True process changes exist beyond seasonal effects (good - seasonality is working!)
- Seasonal factors don't fully capture the pattern (may need different period)
- Data has outliers that should be addressed separately
- Seasonal pattern is changing over time (recalculate with recent data)

### "Seasonal factors are all close to 1.0"

**Interpretation**: Your data doesn't have significant seasonality at the selected period.

**Solutions**:

- Try a different period (e.g., monthly instead of weekly)
- Check if seasonality exists at all in your data
- Remove seasonality since it's not providing value
- Consider if other features (trend, outlier removal) are more appropriate

### "Results are very different from expected"

**Possible causes**:

- Data quality issues (missing data, incorrect values)
- Outliers distorting seasonal factors
- Insufficient data for reliable calculation
- Selected wrong period for your data's pattern

**Solutions**:

- Review raw data for quality issues
- Identify and handle outliers before applying seasonality
- Increase data coverage before relying on results
- Re-evaluate which period matches your business cycle

### "Seasonality and lock both active"

**Issue**: These features are incompatible and shouldn't both be active.

**Solution**:

- This shouldn't happen (UI prevents it)
- If you see this, it's a bug - refresh the page
- Explicitly remove one feature
- Check browser console for errors

## Related Documentation

- [Trend Lines](./TREND_LINES.md) - Can be combined with seasonality for trend + seasonal patterns
- [Lock Limit](./LOCK_LIMIT.md) - Incompatible with seasonality (mutually exclusive)
- [Auto Lock Limit](./AUTO_LOCK_LIMIT.md) - Incompatible with seasonality (mutually exclusive)
- [Controller Logic](./CONTROLLER_TRAFFIC_LIGHT.md) - How traffic light evaluates seasonally-adjusted data

## References

- **Time Series Decomposition**: Cleveland et al., "STL: A Seasonal-Trend Decomposition Procedure Based on Loess"
- **Seasonal Adjustment Methods**: U.S. Census Bureau, "X-13ARIMA-SEATS Reference Manual"
- **Statistical Process Control**: Wheeler, "Understanding Variation: The Key to Managing Chaos"
- **Business Forecasting**: Hyndman & Athanasopoulos, "Forecasting: Principles and Practice"
- **XMRit User Manual**: https://xmrit.com/manual/

## Appendix: Period Length Reference

| Period        | Typical Days | Use For                 | Data Interval Required               |
| ------------- | ------------ | ----------------------- | ------------------------------------ |
| **Weekly**    | 7            | Day-of-week patterns    | Daily                                |
| **Monthly**   | ~30          | Within-month cycles     | Daily or Weekly                      |
| **Quarterly** | ~90          | Fiscal quarter patterns | Daily, Weekly, or Monthly            |
| **Annual**    | ~365         | Yearly seasonality      | Daily, Weekly, Monthly, or Quarterly |

## Appendix: Common Seasonal Patterns by Industry

### Retail

- **Weekly**: Weekend sales spikes
- **Annual**: Holiday seasons (Black Friday, Christmas, etc.)

### SaaS/Tech

- **Monthly**: Billing cycle effects, end-of-month signups
- **Quarterly**: Fiscal quarter-end renewals, sales pushes

### Manufacturing

- **Weekly**: Production schedules (5-day vs 7-day operations)
- **Quarterly**: Maintenance windows, demand cycles

### Finance

- **Quarterly**: Reporting periods, fiscal quarters
- **Annual**: Tax season, year-end activities

### Healthcare

- **Weekly**: Clinic schedules (weekday appointments)
- **Annual**: Flu season, vacation periods

### Education

- **Weekly**: Class schedules
- **Quarterly/Annual**: Academic terms, summer breaks

Use these as starting points, but always validate with your specific data.
