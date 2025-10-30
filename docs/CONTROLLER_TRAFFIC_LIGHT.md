# Controller Logic (Traffic Light System)

## Overview

The Controller Logic, also known as the Traffic Light System, is a visual feedback mechanism that indicates whether a process is in statistical control. It provides an at-a-glance status indicator based on Statistical Process Control (SPC) principles, helping users quickly identify processes that require attention.

## Concept

The traffic light system evaluates the control limits and average movement of a process to determine its status:

- 🟢 **Green (In Control)**: Process is stable and predictable
- 🔴 **Red (Out of Control)**: Process shows signs of instability or special cause variation

This binary status is derived from the fundamental XMR chart control criteria used in statistical process control.

## Control Criteria

A process is considered "in control" when ALL of the following conditions are met:

### 1. Average X Within Natural Process Limits

```
LNPL ≤ Average X ≤ UNPL
```

Where:

- **LNPL**: Lower Natural Process Limit
- **Average X**: Mean of all data point values
- **UNPL**: Upper Natural Process Limit

The average (center line) must fall within the calculated natural process limits. If the average is outside these bounds, it indicates the process has shifted.

### 2. Average Movement Within Upper Range Limit

```
Average Movement ≤ URL
```

Where:

- **Average Movement**: Average of the moving ranges between consecutive data points
- **URL**: Upper Range Limit

The average movement represents the typical variation between consecutive points. If it exceeds the URL, it indicates excessive variation or instability.

## Implementation

### Core Function

```typescript
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
```

### XMRLimits Interface

```typescript
interface XMRLimits {
  avgX: number; // Average of all values (center line)
  UNPL: number; // Upper Natural Process Limit
  LNPL: number; // Lower Natural Process Limit
  avgMovement: number; // Average of moving ranges
  URL: number; // Upper Range Limit
  lowerQuartile: number; // Lower quartile (between avgX and LNPL)
  upperQuartile: number; // Upper quartile (between avgX and UNPL)
}
```

## Visual Representation

The traffic light status is displayed in the UI through various indicators:

### 1. Status Badge

Located at the top of each submetric card:

```
🟢 Process In Control
```

or

```
🔴 Process Out of Control
```

### 2. Card Border Color

The submetric card border changes color based on status:

- **Green border**: Process in control
- **Red border**: Process out of control

### 3. Chart Background

Some implementations include a subtle background color on the chart:

- **Light green tint**: In control
- **Light red tint**: Out of control

## Calculation Details

### Natural Process Limits (NPL)

The natural process limits are calculated using the average moving range:

```
UNPL = Average X + (Average Movement × 2.66)
LNPL = Average X - (Average Movement × 2.66)
```

The constant 2.66 is derived from statistical control theory and represents approximately 3 standard deviations for individual measurements.

### Upper Range Limit (URL)

The upper range limit for the moving range chart:

```
URL = Average Movement × 3.27
```

The constant 3.27 is the control limit factor for moving ranges with n=2.

### Moving Range Calculation

The moving range is the absolute difference between consecutive data points:

```typescript
const ranges = data.map((point, index) => {
  if (index === 0) {
    return { ...point, movement: 0 };
  }
  const movement = Math.abs(point.value - data[index - 1].value);
  return { ...point, movement };
});

const avgMovement =
  ranges.filter((r, i) => i > 0).reduce((sum, r) => sum + r.movement, 0) /
  (ranges.length - 1);
```

## Integration with Other Features

### 1. Lock Limits

When limits are manually locked:

- The traffic light still evaluates based on the locked limits
- Status reflects whether the locked limits represent a stable process
- User can adjust locked limits to achieve "in control" status

### 2. Auto Lock Limits

Auto-locking (outlier removal):

- Recalculates limits without outliers
- May change traffic light status from red to green
- Helps identify whether outliers are causing "out of control" status

### 3. Trend Lines

When trend analysis is active:

- Traffic light evaluates based on the baseline limits (not trend-adjusted)
- Trend lines show expected trajectory, traffic light shows overall stability
- A process with a trend may still be "in control" if variation is within expected bounds

### 4. Seasonality

When seasonality adjustments are applied:

- Traffic light evaluates the seasonally-adjusted data
- Helps distinguish between seasonal variation (expected) and special causes
- After seasonality removal, a process should ideally be "in control"

## Use Cases

### 1. Quick Health Check

Users can scan multiple metrics on a slide and immediately identify which processes need investigation based on traffic light colors.

### 2. Process Stability Assessment

Before making process changes, verify the process is in control. An out-of-control process should be stabilized before optimization efforts.

### 3. Alert Triggering

The traffic light status can be used to trigger alerts or notifications:

- Email/Slack notifications when status changes from green to red
- Dashboard summaries showing count of in-control vs out-of-control processes

### 4. Reporting and Compliance

Document process control status for audits and compliance:

- "85% of processes were in statistical control this quarter"
- Trend reports showing improvement in control status over time

## Best Practices

### 1. Respond to Red Status

When a process shows as out of control:

1. Investigate recent changes or events
2. Check for data quality issues
3. Look for violations on the chart (points outside limits)
4. Consider if special cause variation is present
5. Document findings and corrective actions

### 2. Don't Overreact to Borderline Cases

If a process is just barely out of control:

- Check if it's due to a single outlier
- Look at the trend over time
- Consider the practical significance, not just statistical significance

### 3. Use with Violation Detection

The traffic light is a summary indicator. Always review the detailed violation patterns:

- Points outside limits (most critical)
- Runs of consecutive points on one side
- Trends indicating process shifts

### 4. Context Matters

A red traffic light doesn't always mean something is wrong:

- May indicate a recent process improvement (deliberate shift)
- Could be due to insufficient data points
- Might reflect a known one-time event

## Technical Considerations

### Performance

The traffic light calculation is lightweight and memoized:

```typescript
const processInControl = useMemo(
  () => isProcessInControl(xmrData.limits),
  [xmrData.limits]
);
```

Recalculation only occurs when limits change, ensuring efficient rendering.

### Limit Sources

The function evaluates whichever limits are currently active:

- **Default calculated limits**: From all data points
- **Locked limits**: User-specified fixed limits
- **Trend-based limits**: When trend analysis is active (uses baseline limits)

### Edge Cases

**Insufficient Data**:

- Requires minimum data points (typically 10) for reliable control limits
- Traffic light may not be shown if data is insufficient

**Extreme Values**:

- If data contains extreme outliers, limits may be very wide
- Process may show as "in control" even with high variation
- Solution: Use auto-lock or manual lock to exclude outliers

**Zero Variation**:

- If all data points are identical, avgMovement = 0
- URL = 0, which may cause issues
- System handles this edge case with minimum threshold

## Comparison with Western Electric Rules

The traffic light system provides a **summary status**, while Western Electric Rules provide **detailed violation detection**:

| Feature     | Traffic Light                | Western Electric Rules         |
| ----------- | ---------------------------- | ------------------------------ |
| Purpose     | Overall process status       | Specific violation patterns    |
| Granularity | Single binary indicator      | Multiple violation types       |
| Sensitivity | Moderate (based on averages) | High (point-by-point analysis) |
| Use Case    | Quick overview               | Detailed investigation         |

Both systems complement each other:

- Traffic light: "Is there a problem?"
- Violation detection: "What specifically is the problem?"

## Future Enhancements

Potential improvements under consideration:

1. **Three-state system**: Add "Warning" state (yellow/amber) for borderline cases
2. **Historical status tracking**: Track how long a process has been in/out of control
3. **Confidence levels**: Show confidence in the status determination
4. **Customizable thresholds**: Allow users to adjust sensitivity of control criteria
5. **Automated alerts**: Integrate with notification systems for status changes
6. **Batch status API**: Endpoint to check status of multiple metrics simultaneously

## Related Documentation

- [Auto Lock Limit](./auto-lock-limit.md) - Automatic outlier detection and limit adjustment
- [Lock Limit](./lock-limit.md) - Manual limit locking and modification
- [Trend Lines](./trend-lines.md) - Trend analysis and dynamic limits

## References

- Statistical Process Control: A Practical Guide by Dr. Donald J. Wheeler
- XMRit User Manual: https://xmrit.com/manual/
- Western Electric Rules for Control Charts
