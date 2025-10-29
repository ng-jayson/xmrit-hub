"use client";

import { memo, useCallback, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Label,
} from "recharts";
import type { Submetric } from "@/types/db/submetric";
import type { XMRLimits } from "@/lib/xmr-calculations";

interface SubmetricMRChartProps {
  chartData: any[];
  xmrLimits: XMRLimits;
  submetric: Submetric;
  isDark: boolean;
  isLimitsLocked: boolean;
}

export const SubmetricMRChart = memo(
  ({
    chartData,
    xmrLimits,
    submetric,
    isDark,
    isLimitsLocked,
  }: SubmetricMRChartProps) => {
    // Calculate Y-axis domain for MR chart
    const mrYAxisDomain = useMemo(() => {
      if (chartData.length === 0) return [0, 100];

      const ranges = chartData.map((d) => d.range);
      const dataMax = Math.max(...ranges);
      const maxBound = Math.max(dataMax, xmrLimits.URL);
      const padding = maxBound * 0.15;

      return [0, maxBound + padding];
    }, [chartData, xmrLimits.URL]);

    // Memoize custom tooltip
    const CustomTooltip = useCallback(
      ({ active, payload }: any) => {
        if (active && payload && payload.length) {
          const data = payload[0].payload;

          return (
            <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg p-4 shadow-xl max-w-xs">
              <div className="space-y-2">
                <p className="font-semibold text-base border-b pb-2">
                  {data.fullTimestamp}
                </p>

                <div className="space-y-1">
                  <div>
                    <span className="text-muted-foreground text-sm">
                      Moving Range:
                    </span>
                    <p className="text-primary font-medium text-lg">
                      {Number(data.range).toFixed(2)}
                      {submetric.unit && (
                        <span className="text-sm text-muted-foreground ml-1">
                          {submetric.unit}
                        </span>
                      )}
                    </p>
                  </div>

                  {data.confidence && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Confidence:</span>
                      <span className="font-medium ml-1">
                        {(data.confidence * 100).toFixed(1)}%
                      </span>
                    </div>
                  )}
                </div>

                {data.isRangeViolation && (
                  <div className="pt-2 border-t">
                    <div className="flex items-start gap-2 text-red-600 font-medium text-sm">
                      <span className="text-base mt-0.5">🔴</span>
                      <div>
                        <div>Excessive Variation</div>
                        <div className="text-xs text-red-500 font-normal">
                          Range exceeds URL
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        }
        return null;
      },
      [submetric.unit]
    );

    // Memoize dot renderer
    const renderDot = useCallback(
      (props: any) => {
        const { cx, cy, payload, index } = props;
        const isRangeViolation = payload?.isRangeViolation;
        const dotStroke = isDark ? "#2a2a2a" : "#ffffff";

        const fillColor = isRangeViolation
          ? "#ef4444" // red for violations
          : submetric.color || "#3b82f6"; // purple/violet for normal
        const strokeColor = isRangeViolation ? "#dc2626" : dotStroke;
        const radius = isRangeViolation ? 6 : 4;
        const strokeWidth = isRangeViolation ? 3 : 2;

        return (
          <circle
            key={`mr-dot-${index}`}
            cx={cx}
            cy={cy}
            r={radius}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            style={{
              filter: isRangeViolation
                ? "drop-shadow(0 2px 4px rgba(0,0,0,0.3))"
                : "none",
            }}
          />
        );
      },
      [isDark, submetric.color]
    );

    // Memoize active dot renderer
    const renderActiveDot = useCallback(
      (props: any) => {
        const { cx, cy, payload } = props;
        const isRangeViolation = payload?.isRangeViolation;

        const fillColor = isRangeViolation
          ? "#ef4444"
          : isDark
          ? "#2a2a2a"
          : "#ffffff";
        const strokeColor = isRangeViolation
          ? "#dc2626"
          : submetric.color || "#3b82f6";

        return (
          <circle
            cx={cx}
            cy={cy}
            r={8}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={3}
            style={{
              filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.3))",
              cursor: "pointer",
            }}
          />
        );
      },
      [isDark, submetric.color]
    );

    // Memoize tick formatter
    const tickFormatter = useCallback(
      (value: number) => Number(value).toFixed(1),
      []
    );

    // Memoize static axis configurations
    const axisLineConfig = useMemo(
      () => ({ stroke: "currentColor", strokeWidth: 1 }),
      []
    );
    const tickLineConfig = useMemo(
      () => ({ stroke: "currentColor", strokeWidth: 1 }),
      []
    );
    const tickConfig = useMemo(() => ({ fontSize: 12 }), []);

    // Memoize reference line labels
    const avgMovementLabel = useMemo(
      () => ({
        value: `Avg: ${xmrLimits.avgMovement.toFixed(2)}`,
        position: "insideTopRight" as const,
        style: {
          fontSize: "12px",
          fontWeight: "bold",
          fill: "#10b981",
        },
      }),
      [xmrLimits.avgMovement]
    );

    const urlLabel = useMemo(
      () => ({
        value: `URL: ${xmrLimits.URL.toFixed(2)}`,
        position: "insideTopRight" as const,
        style: {
          fontSize: "11px",
          fontWeight: "bold",
          fill: "#94a3b8",
        },
      }),
      [xmrLimits.URL]
    );

    return (
      <div className="h-[500px] w-full [&_.recharts-cartesian-grid-horizontal>line]:stroke-muted-foreground/20 [&_.recharts-cartesian-grid-vertical>line]:stroke-muted-foreground/20 [&_.recharts-tooltip-wrapper]:z-50">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 40, right: 60, left: 20, bottom: 40 }}
          >
            <CartesianGrid
              strokeDasharray="2 2"
              stroke="currentColor"
              opacity={0.1}
            />
            <XAxis
              dataKey="timestamp"
              className="text-sm fill-foreground"
              axisLine={axisLineConfig}
              tickLine={tickLineConfig}
              tick={tickConfig}
              interval="preserveStartEnd"
            >
              <Label
                value={`${submetric.xAxis}${
                  submetric.timezone ? ` (${submetric.timezone})` : ""
                } - MR Plot`}
                offset={-10}
                position="insideBottom"
                style={{ fontSize: "11px", fontWeight: "600" }}
              />
            </XAxis>
            <YAxis
              className="text-sm fill-foreground"
              axisLine={axisLineConfig}
              tickLine={tickLineConfig}
              tick={tickConfig}
              tickFormatter={tickFormatter}
              domain={mrYAxisDomain}
              width={50}
            />
            <Tooltip content={CustomTooltip} />

            {/* Average Movement Line */}
            <ReferenceLine
              y={xmrLimits.avgMovement}
              stroke="#10b981"
              strokeWidth={3}
              strokeDasharray="8 4"
              label={avgMovementLabel}
            />

            {/* Upper Range Limit */}
            <ReferenceLine
              y={xmrLimits.URL}
              stroke="#94a3b8"
              strokeWidth={isLimitsLocked ? 2.5 : 2}
              strokeDasharray={isLimitsLocked ? "" : "6 3"}
              label={urlLabel}
            />

            {/* Moving Range Line */}
            <Line
              type="linear"
              dataKey="range"
              stroke={submetric.color || "#3b82f6"}
              strokeWidth={3}
              dot={renderDot}
              activeDot={renderActiveDot}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }
);

SubmetricMRChart.displayName = "SubmetricMRChart";
