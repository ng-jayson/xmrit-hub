# Lock Limit

## Overview

Lock Limit is a manual feature that allows users to freeze control limits at specific values, preventing them from recalculating as new data arrives. Unlike Auto Lock Limit (which automatically detects and excludes outliers), Lock Limit gives users full control over which data points to include/exclude and what the exact limit values should be.

## Purpose

Lock Limit serves several critical purposes:

1. **Stabilize Reference Baseline**: Once a process reaches a stable state, lock limits to use as a reference for future performance
2. **Custom Adjustments**: Make domain-specific adjustments that statistical algorithms can't anticipate
3. **Exclude Specific Points**: Manually exclude known special causes or anomalies
4. **Target Setting**: Set aspirational targets rather than calculated limits
5. **Historical Comparison**: Lock limits from a historical period to compare current performance

## Key Difference: Lock Limit vs Auto Lock Limit

| Feature               | Lock Limit                                            | Auto Lock Limit                                   |
| --------------------- | ----------------------------------------------------- | ------------------------------------------------- |
| **Activation**        | Manual - user clicks "Lock Limits"                    | Automatic - triggers on page load                 |
| **Outlier Detection** | User manually selects points to exclude               | Algorithmic detection using 4 statistical methods |
| **Limit Values**      | User can edit any limit value                         | Automatically calculated from non-outlier data    |
| **Use Case**          | Domain knowledge, custom targets, specific exclusions | Clear statistical outliers, objective criteria    |
| **Flexibility**       | Full customization                                    | Fixed algorithm                                   |
| **When to Use**       | Process improvement goals, known special causes       | Unknown or multiple outliers, objective baseline  |

## How to Lock Limits

### Step 1: Open Lock Limits Dialog

Click the lock icon (🔒) on any submetric card. This opens the Lock Limits dialog showing:

- Current limit values
- Table of all data points
- Options to exclude specific points
- Calculated limits based on current selections

### Step 2: Review Current Data

The data point table displays:

| Column       | Description                             |
| ------------ | --------------------------------------- |
| **Date**     | Timestamp of the data point             |
| **Value**    | Actual value                            |
| **Movement** | Absolute difference from previous point |
| **Status**   | Included/Excluded/Violation flags       |
| **Actions**  | Exclude/Restore buttons                 |

### Step 3: Exclude Data Points (Optional)

To exclude a data point:

1. Click the **trash icon** (🗑️) next to the point
2. Point turns translucent in the table
3. Limits automatically recalculate without that point

To restore an excluded point:

1. Click the **undo icon** (↶) next to the point
2. Point is re-included
3. Limits recalculate with that point included

### Step 4: Review Calculated Limits

After excluding/including points, the dialog shows recalculated limits:

- **Average X**: Mean of included data points
- **UNPL**: Upper Natural Process Limit
- **LNPL**: Lower Natural Process Limit
- **Average Movement**: Average moving range of included points
- **URL**: Upper Range Limit

### Step 5: (Optional) Manually Edit Limits

You can override the calculated limits by editing the input fields:

```
Average X:    [___]
UNPL:         [___]
LNPL:         [___]
Avg Movement: [___]
URL:          [___]
```

**Important**: Manual edits must satisfy validation rules (see Validation section below).

### Step 6: Lock the Limits

Click the "**Lock Limits**" button to finalize. The system:

1. Validates all limit values
2. Stores the locked limits
3. Marks which limits were manually modified (if any)
4. Updates the chart to use locked limits
5. Shows lock status indicator on the card

## Locked Limit Types

When you lock limits, the system tracks **what type of lock** was applied:

### 1. Auto Lock (System-Generated)

```
🔒 Auto-Locked (3 outliers excluded)
```

- Triggered automatically by outlier detection algorithm
- All limit values calculated by the system
- Can be restored to original auto-detected state
- Indicator: "Auto-Locked" badge

### 2. Manual Lock (User-Generated, No Edits)

```
🔒 Locked (2 points excluded)
```

- User opened dialog and locked limits
- User excluded/included specific points
- No manual edits to limit values (all calculated)
- Indicator: "Locked" badge

### 3. Manual Lock (User-Modified)

```
🔒 Locked & Modified
```

- User opened dialog and locked limits
- User manually edited one or more limit values
- Limits are now custom, not purely calculated
- Indicator: "Locked & Modified" badge with details

## Limit Modification Tracking

The system uses **bitwise flags** to track which specific limits were modified:

```typescript
export enum LockedLimitStatus {
  UNLOCKED = 0, // 0000 - No limits locked
  LOCKED = 1, // 0001 - Limits locked (no modifications)
  UNPL_MODIFIED = 2, // 0010 - Upper limit modified
  LNPL_MODIFIED = 4, // 0100 - Lower limit modified
  AVGX_MODIFIED = 8, // 1000 - Average modified
}
```

This allows precise tracking:

- "UNPL modified" → Only upper limit edited
- "UNPL & LNPL modified" → Both limits edited, but average unchanged
- "All modified" → User fully customized the limits

### Quartile Display Logic

Quartile lines (intermediate lines between average and limits) adjust based on modifications:

| Modification               | Upper Quartile | Lower Quartile |
| -------------------------- | -------------- | -------------- |
| None (locked only)         | ✅ Show        | ✅ Show        |
| UNPL modified              | ❌ Hide        | ✅ Show        |
| LNPL modified              | ✅ Show        | ❌ Hide        |
| Both modified (symmetric)  | ✅ Show        | ✅ Show        |
| Both modified (asymmetric) | ❌ Hide        | ❌ Hide        |
| Average modified           | Check symmetry | Check symmetry |

**Rationale**: Quartiles are mathematically meaningful when limits are symmetric around the average. Asymmetric modifications suggest the user has specific targets, so calculated quartiles may not be meaningful.

## Validation Rules

When locking limits, the system enforces Statistical Process Control constraints:

### Rule 1: Average Within Limits

```
LNPL ≤ Average X ≤ UNPL
```

**Error Message**: "Average X must be between LNPL and UNPL"

**Rationale**: The average (center line) must fall within the control limits. If it doesn't, the limits don't represent the process.

### Rule 2: Average Movement Within URL

```
Average Movement ≤ URL
```

**Error Message**: "Average Movement must be ≤ URL"

**Rationale**: The upper range limit must bound the average variation. If avgMovement > URL, the limits are internally inconsistent.

### Rule 3: Positive Control Range

```
UNPL > LNPL
```

**Error Message**: "UNPL must be greater than LNPL"

**Rationale**: There must be a positive range between upper and lower limits.

### Automatic Quartile Calculation

Even if you edit the main limits, quartiles are recalculated automatically:

```
Lower Quartile = (Average X + LNPL) / 2
Upper Quartile = (Average X + UNPL) / 2
```

This ensures quartiles remain mathematically consistent with your locked limits.

## Visual Indicators

### On the Chart

**Locked Limits**:

- Displayed as solid, non-dashed lines (indicating they won't change)
- Limit values shown at the right edge
- Lock icon in legend

**Excluded Points**:

- Rendered as translucent/grayed-out dots
- Still visible but clearly distinguished from included points
- Tooltip shows "Excluded from limits"

**Included Points**:

- Normal color (submetric color or default blue)
- Violations highlighted in red/orange (based on locked limits)
- Tooltip shows value and violation details

### On the Submetric Card

**Lock Status Badge**:

```
🔒 Locked (2 points excluded)
🔒 Locked & Modified
🔒 Auto-Locked (4 outliers excluded)
```

**Lock Icon Button**:

- Closed lock icon when locked
- Open lock icon when unlocked
- Click to open Lock Limits dialog

### In the Lock Dialog

**Excluded Row Styling**:

- Gray background
- Strikethrough text
- "Excluded" label in status column

**Modified Limit Fields**:

- Editable input fields
- Values update preview in real-time as you type
- Red border if validation fails

## Use Cases

### 1. Process Improvement Target Setting

**Scenario**: Your current process has UNPL = 100, but you want to improve to UNPL = 90.

**Steps**:

1. Lock current limits as baseline
2. Document current performance
3. Implement improvements
4. Unlock and recalculate to see if new limits reflect improvement
5. Lock again at new improved levels

### 2. Known Special Cause Exclusion

**Scenario**: A data center outage on Jan 15 caused response times to spike.

**Steps**:

1. Open Lock Limits dialog
2. Find and exclude the Jan 15 data point
3. Lock limits based on normal operating conditions
4. Document "Jan 15 excluded: data center outage"

### 3. Comparing Performance Across Time Periods

**Scenario**: You want to compare Q3 2024 performance against Q4 2024 using the same baseline.

**Steps**:

1. Calculate and lock limits based on Q3 data
2. New Q4 data arrives and is plotted against Q3 locked limits
3. Any Q4 violations indicate performance different from Q3
4. Unlock and recalculate to see Q4's natural limits

### 4. Regulatory Compliance Limits

**Scenario**: Your process must stay within regulatory limits of 50-150, which differ from calculated limits.

**Steps**:

1. Open Lock Limits dialog
2. Manually set UNPL = 150, LNPL = 50
3. Set Average X to your target (e.g., 100)
4. Lock limits
5. Monitor compliance: any violations are now relative to regulatory limits

### 5. Excluding Startup/Ramp-Up Data

**Scenario**: New process had unstable first two weeks. You want limits based on steady-state performance.

**Steps**:

1. Open Lock Limits dialog
2. Exclude all data points from first two weeks
3. Lock limits based on remaining data
4. Limits now represent normal operating range, excluding learning period

## Unlocking Limits

To unlock limits and return to dynamic calculation:

### Method 1: Click Unlock Button

1. Open Lock Limits dialog
2. Click "Unlock Limits" button at bottom
3. Confirm if prompted
4. Limits now recalculate dynamically with all data

### Method 2: Reset to Auto-Lock

If limits were originally auto-locked:

1. Open Lock Limits dialog
2. Click "Reset to Auto-Lock" button
3. Restores original auto-detected outlier exclusions
4. Keeps limits locked but removes any manual modifications

### Method 3: Activate Trend or Seasonality

Trend analysis and seasonality adjustments are incompatible with locked limits. Activating either will:

1. Automatically unlock the limits
2. Show warning notification
3. Apply trend/seasonality calculations instead

## Advanced Features

### Bulk Data Point Management

**Exclude Multiple Points**:

- No built-in bulk select (yet)
- Workaround: Exclude points one-by-one

**Restore All Excluded Points**:

- Click restore icon on each excluded point
- Or unlock limits and re-lock with new selections

### Limit Precision

All limit values are rounded to 2 decimal places by default for readability. Internally, calculations use full precision.

### Exporting Locked Limits

Locked limit data is stored in the database and can be retrieved via API:

```javascript
GET /api/slides/{slideId}/xmr-charts

Response includes:
{
  "submetric": {
    "lockedLimits": {
      "avgX": 100.5,
      "UNPL": 115.3,
      "LNPL": 85.7,
      ...
    },
    "excludedDataPoints": [3, 7, 12]
  }
}
```

## Implementation Details

### State Management

```typescript
// Lock state
const [isLimitsLocked, setIsLimitsLocked] = useState(false);
const [lockedLimits, setLockedLimits] = useState<XMRLimits | null>(null);

// Auto-lock state
const [autoLocked, setAutoLocked] = useState(false);
const [autoSuggestedLimits, setAutoSuggestedLimits] =
  useState<XMRLimits | null>(null);

// Modification tracking
const [isManuallyModified, setIsManuallyModified] = useState(false);

// Excluded points
const [outlierIndices, setOutlierIndices] = useState<number[]>([]);
```

### Limit Selection Logic

```typescript
const effectiveLimits = useMemo(() => {
  if (trendActive && trendLines) {
    // Use trend-based limits
    const lastIndex = xmrData.dataPoints.length - 1;
    return {
      avgX: trendLines.centreLine[lastIndex]?.value ?? xmrData.limits.avgX,
      UNPL: trendLines.unpl[lastIndex]?.value ?? xmrData.limits.UNPL,
      LNPL: trendLines.lnpl[lastIndex]?.value ?? xmrData.limits.LNPL,
      // ...
    };
  } else if (isLimitsLocked && lockedLimits) {
    // Use locked limits
    return lockedLimits;
  } else {
    // Use default calculated limits
    return xmrData.limits;
  }
}, [trendActive, trendLines, isLimitsLocked, lockedLimits, xmrData.limits]);
```

### Recalculation on Exclusion

When a point is excluded, limits are recalculated immediately:

```typescript
const handleExcludePoint = (index: number) => {
  const newExcluded = [...excludedIndices, index];
  setExcludedIndices(newExcluded);

  // Filter out excluded points
  const includedPoints = dataPoints.filter((_, i) => !newExcluded.includes(i));

  // Recalculate limits
  const newLimits = calculateXMRLimits(includedPoints);

  // Update preview
  setPreviewLimits(newLimits);
};
```

## Best Practices

### 1. Document Your Decisions

When locking limits, document:

- Why you locked them
- Which points you excluded and why
- Any manual modifications made
- Expected use of the locked limits

**Tip**: Use external documentation or comments in your BI tool to track this information.

### 2. Review Periodically

Locked limits don't update with new data. Periodically:

- Review if locked limits still make sense
- Check if process has fundamentally changed
- Consider unlocking and recalculating with recent data

### 3. Use Auto-Lock First

Before manually locking:

- See if auto-lock detects the outliers you're concerned about
- Auto-lock is objective and consistent
- Only use manual lock if auto-lock doesn't meet your needs

### 4. Validate Limit Logic

When manually editing limit values:

- Ensure limits are realistic for your process
- Don't set aspirational targets too far from current performance
- Limits should represent achievable variation, not wishes

### 5. Be Conservative with Exclusions

Avoid excluding too many points:

- Guideline: Exclude < 10% of data as a rule of thumb
- Every exclusion should have a documented special cause
- If you're excluding >25%, consider if there's a deeper process issue

### 6. Communicate Lock Status

If sharing charts with others:

- Clearly indicate when limits are locked
- Explain what locked limits represent
- Note if they're targets vs calculated baselines

## Troubleshooting

### "I can't lock limits - button is disabled"

Possible reasons:

- Insufficient data (need at least 10 points)
- Trend or seasonality is active (incompatible)
- Validation errors in manually edited values

### "Locked limits don't match my manual edits"

Check validation errors:

- Average must be between UNPL and LNPL
- UNPL must be > LNPL
- Avg Movement must be ≤ URL

### "Quartile lines disappeared after locking"

This is expected behavior if you modified limits asymmetrically. Quartiles are hidden when limits are custom-edited in a non-symmetric way.

### "Can't find the point I want to exclude"

Data point table is scrollable. Use the scroll area to find earlier data points. Points are ordered chronologically.

### "Locked limits are too wide/narrow"

If calculated locked limits don't match expectations:

- Review which points are excluded
- Check data quality (are there hidden outliers?)
- Consider manually editing limit values to your desired targets

## Related Documentation

- [Auto Lock Limit](./AUTO_LOCK_LIMIT.md) - Automatic outlier detection and locking
- [Controller Logic](./CONTROLLER_TRAFFIC_LIGHT.md) - How locked limits affect process status
- [Trend Lines](./TREND_LINES.md) - Alternative to locking when data has trends
- [Seasonality](./DESEASONALISATION.md) - Seasonal adjustments (incompatible with lock limits)

## References

- Statistical Process Control: Wheeler, "Making Sense of Data"
- XMRit User Manual: https://xmrit.com/manual/
- Control Chart Interpretation: Montgomery, "Introduction to Statistical Quality Control"
