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
  LabelList,
  ReferenceLine,
  Label,
} from "recharts";
import type { Submetric } from "@/types/db/submetric";
import type { XMRLimits, TrendLimits } from "@/lib/xmr-calculations";

interface SubmetricXChartProps {
  chartData: any[];
  xmrLimits: XMRLimits;
  submetric: Submetric;
  yAxisDomain: number[];
  isDark: boolean;
  isLimitsLocked: boolean;
  trendActive: boolean;
  trendLines: TrendLimits | null;
  showReducedTrendLimits: boolean;
}

// Memoized custom label component
const CustomLabel = memo(
  ({
    x,
    y,
    value,
    payload,
    isDark,
  }: {
    x: number;
    y: number;
    value: number;
    payload: any;
    isDark: boolean;
  }) => {
    const isViolation = payload?.isViolation;
    const isRunningPoint = payload?.isRunningPoint;
    const isFourNearLimit = payload?.isFourNearLimit;
    const isTwoOfThreeBeyondTwoSigma = payload?.isTwoOfThreeBeyondTwoSigma;

    // Define colors based on theme and violation type
    const labelBgColor = isDark ? "#2a2a2a" : "#ffffff";
    const labelTextColor = isDark ? "#e5e5e5" : "#374151";
    const labelBorderColor = isDark ? "#404040" : "#e5e7eb";

    // Determine color based on most severe violation
    let borderColor = labelBorderColor;
    let textColor = labelTextColor;

    if (isViolation) {
      borderColor = "#ef4444"; // red
      textColor = "#ef4444";
    } else if (isTwoOfThreeBeyondTwoSigma) {
      borderColor = "#f97316"; // orange
      textColor = "#f97316";
    } else if (isFourNearLimit) {
      borderColor = "#f59e0b"; // amber
      textColor = "#f59e0b";
    } else if (isRunningPoint) {
      borderColor = "#3b82f6"; // blue
      textColor = "#3b82f6";
    }

    // Calculate text width (approximate: 11px font, ~6.5px per character)
    const text = Number(value).toFixed(2);
    const charWidth = 6.5;
    const textWidth = text.length * charWidth;
    const horizontalPadding = 4; // 2px on each side
    const rectWidth = textWidth + horizontalPadding;
    const rectHeight = 18;

    return (
      <g>
        {/* Background rectangle for better readability */}
        <rect
          x={x - rectWidth / 2}
          y={y - 25}
          width={rectWidth}
          height={rectHeight}
          fill={labelBgColor}
          stroke={borderColor}
          strokeWidth={1.5}
          rx={4}
          style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.15))" }}
        />
        <text
          x={x}
          y={y - 16}
          fill={textColor}
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-xs font-bold"
          style={{ fontSize: "11px", fontWeight: "bold" }}
        >
          {text}
        </text>
      </g>
    );
  }
);

CustomLabel.displayName = "CustomLabel";

export const SubmetricXChart = memo(
  ({
    chartData,
    xmrLimits,
    submetric,
    yAxisDomain,
    isDark,
    isLimitsLocked,
    trendActive,
    trendLines,
    showReducedTrendLimits,
  }: SubmetricXChartProps) => {
    // Merge trend line data with chart data if trend is active
    const mergedChartData = useMemo(() => {
      if (!trendActive || !trendLines) {
        return chartData;
      }

      return chartData.map((point, index) => {
        return {
          ...point,
          trendCentre: trendLines.centreLine[index]?.value,
          trendUNPL: trendLines.unpl[index]?.value,
          trendLNPL: trendLines.lnpl[index]?.value,
          trendUpperQuartile: trendLines.upperQuartile[index]?.value,
          trendLowerQuartile: trendLines.lowerQuartile[index]?.value,
          // Reduced limits
          trendReducedUNPL: trendLines.reducedUnpl[index]?.value,
          trendReducedLNPL: trendLines.reducedLnpl[index]?.value,
          trendReducedUpperQuartile:
            trendLines.reducedUpperQuartile[index]?.value,
          trendReducedLowerQuartile:
            trendLines.reducedLowerQuartile[index]?.value,
        };
      });
    }, [chartData, trendActive, trendLines]);

    // Memoize custom label wrapper
    const renderCustomLabel = useCallback(
      (props: any) => {
        return <CustomLabel {...props} isDark={isDark} />;
      },
      [isDark]
    );

    // Memoize custom tooltip
    const CustomTooltip = useCallback(
      ({ active, payload }: any) => {
        if (active && payload && payload.length) {
          const data = payload[0].payload;
          const hasViolations =
            data.isViolation ||
            data.isRunningPoint ||
            data.isFourNearLimit ||
            data.isTwoOfThreeBeyondTwoSigma ||
            data.isFifteenWithinOneSigma;

          return (
            <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg p-4 shadow-xl max-w-xs">
              <div className="space-y-2">
                <p className="font-semibold text-base border-b pb-2">
                  {data.fullTimestamp}
                </p>

                <div className="space-y-1">
                  <p className="text-primary font-medium text-lg">
                    {Number(payload[0].value).toFixed(2)}
                    {submetric.unit && (
                      <span className="text-sm text-muted-foreground ml-1">
                        {submetric.unit}
                      </span>
                    )}
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Range:</span>
                      <span className="font-medium ml-1">
                        {data.range.toFixed(2)}
                      </span>
                    </div>
                    {data.confidence && (
                      <div>
                        <span className="text-muted-foreground">
                          Confidence:
                        </span>
                        <span className="font-medium ml-1">
                          {(data.confidence * 100).toFixed(1)}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {hasViolations && (
                  <div className="pt-2 border-t space-y-1.5">
                    <p className="text-xs font-semibold text-muted-foreground mb-1">
                      Western Electric Rules:
                    </p>
                    {data.isViolation && (
                      <div className="flex items-start gap-2 text-red-600 font-medium text-sm">
                        <span className="text-base mt-0.5">🔴</span>
                        <div>
                          <div>Outside Control Limits</div>
                          <div className="text-xs text-red-500 font-normal">
                            Rule 1: Point beyond 3σ
                          </div>
                        </div>
                      </div>
                    )}
                    {data.isTwoOfThreeBeyondTwoSigma && (
                      <div className="flex items-start gap-2 text-orange-600 font-medium text-sm">
                        <span className="text-base mt-0.5">🟠</span>
                        <div>
                          <div>2 of 3 Beyond 2σ</div>
                          <div className="text-xs text-orange-500 font-normal">
                            Rule 4: Clustering near limits
                          </div>
                        </div>
                      </div>
                    )}
                    {data.isFourNearLimit && (
                      <div className="flex items-start gap-2 text-amber-600 font-medium text-sm">
                        <span className="text-base mt-0.5">🟡</span>
                        <div>
                          <div>4 Near Limit Pattern</div>
                          <div className="text-xs text-amber-500 font-normal">
                            Rule 3: 3 of 4 in extreme quartiles
                          </div>
                        </div>
                      </div>
                    )}
                    {data.isRunningPoint && (
                      <div className="flex items-start gap-2 text-blue-600 font-medium text-sm">
                        <span className="text-base mt-0.5">🔵</span>
                        <div>
                          <div>Running Point Pattern</div>
                          <div className="text-xs text-blue-500 font-normal">
                            Rule 2: 8+ points on one side
                          </div>
                        </div>
                      </div>
                    )}
                    {data.isFifteenWithinOneSigma && (
                      <div className="flex items-start gap-2 text-green-600 font-medium text-sm">
                        <span className="text-base mt-0.5">🟢</span>
                        <div>
                          <div>Low Variation</div>
                          <div className="text-xs text-green-500 font-normal">
                            Rule 5: 15+ points within 1σ
                          </div>
                        </div>
                      </div>
                    )}
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
        const isViolation = payload?.isViolation;
        const isTwoOfThreeBeyondTwoSigma = payload?.isTwoOfThreeBeyondTwoSigma;
        const isFourNearLimit = payload?.isFourNearLimit;
        const isRunningPoint = payload?.isRunningPoint;
        const isFifteenWithinOneSigma = payload?.isFifteenWithinOneSigma;
        const dotStroke = isDark ? "#2a2a2a" : "#ffffff";

        // Determine color based on most severe violation
        let fillColor = submetric.color || "#3b82f6";
        let strokeColor = dotStroke;
        let radius = 4;
        let strokeWidth = 2;
        let hasViolation = false;

        if (isViolation) {
          fillColor = "#ef4444"; // red
          strokeColor = "#dc2626";
          radius = 6;
          strokeWidth = 3;
          hasViolation = true;
        } else if (isTwoOfThreeBeyondTwoSigma) {
          fillColor = "#f97316"; // orange
          strokeColor = "#ea580c";
          radius = 5.5;
          strokeWidth = 2.5;
          hasViolation = true;
        } else if (isFourNearLimit) {
          fillColor = "#f59e0b"; // amber
          strokeColor = "#d97706";
          radius = 5;
          strokeWidth = 2.5;
          hasViolation = true;
        } else if (isRunningPoint) {
          fillColor = "#3b82f6"; // blue
          strokeColor = "#2563eb";
          radius = 5;
          strokeWidth = 2.5;
          hasViolation = true;
        } else if (isFifteenWithinOneSigma) {
          fillColor = "#10b981"; // green
          strokeColor = "#059669";
          radius = 4.5;
          strokeWidth = 2;
          hasViolation = true;
        }

        return (
          <circle
            key={`dot-${index}`}
            cx={cx}
            cy={cy}
            r={radius}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            style={{
              filter: hasViolation
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
        const isViolation = payload?.isViolation;
        const isRunningPoint = payload?.isRunningPoint;

        // Determine colors based on point type
        let fillColor = isDark ? "#2a2a2a" : "#ffffff";
        let strokeColor = submetric.color || "#3b82f6";

        if (isViolation) {
          fillColor = "#ef4444"; // red
          strokeColor = "#dc2626"; // darker red
        } else if (isRunningPoint) {
          fillColor = "#f59e0b"; // amber
          strokeColor = "#d97706"; // darker amber
        }

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
    const avgLabel = useMemo(
      () => ({
        value: `Avg: ${xmrLimits.avgX.toFixed(2)}`,
        position: "insideTopRight" as const,
        style: {
          fontSize: "12px",
          fontWeight: "bold",
          fill: "#10b981",
        },
      }),
      [xmrLimits.avgX]
    );

    const unplLabel = useMemo(
      () => ({
        value: `UNPL: ${xmrLimits.UNPL.toFixed(2)}`,
        position: "insideTopRight" as const,
        style: {
          fontSize: "11px",
          fontWeight: "bold",
          fill: "#94a3b8",
        },
      }),
      [xmrLimits.UNPL]
    );

    const lnplLabel = useMemo(
      () => ({
        value: `LNPL: ${xmrLimits.LNPL.toFixed(2)}`,
        position: "insideBottomRight" as const,
        style: {
          fontSize: "11px",
          fontWeight: "bold",
          fill: "#94a3b8",
        },
      }),
      [xmrLimits.LNPL]
    );

    return (
      <div className="h-[500px] w-full [&_.recharts-cartesian-grid-horizontal>line]:stroke-muted-foreground/20 [&_.recharts-cartesian-grid-vertical>line]:stroke-muted-foreground/20 [&_.recharts-tooltip-wrapper]:z-50 [&_.recharts-label-list]:z-50">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={mergedChartData}
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
                } - X Plot`}
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
              domain={yAxisDomain}
              width={50}
            />
            <Tooltip content={CustomTooltip} />

            {/* Control Limit Lines - Use trend lines if active, otherwise use reference lines */}
            {trendActive && trendLines ? (
              <>
                {/* Trend Centre Line */}
                <Line
                  type="linear"
                  dataKey="trendCentre"
                  stroke="#10b981"
                  strokeWidth={3}
                  strokeDasharray="8 4"
                  dot={false}
                  activeDot={false}
                  connectNulls={false}
                  name="Trend Centre"
                />
                {/* Standard Trend Limits */}
                <Line
                  type="linear"
                  dataKey="trendUNPL"
                  stroke="#94a3b8"
                  strokeWidth={2.5}
                  strokeDasharray=""
                  dot={false}
                  activeDot={false}
                  connectNulls={false}
                  name="Upper Limit"
                />
                <Line
                  type="linear"
                  dataKey="trendLNPL"
                  stroke="#94a3b8"
                  strokeWidth={2.5}
                  strokeDasharray=""
                  dot={false}
                  activeDot={false}
                  connectNulls={false}
                  name="Lower Limit"
                />
                <Line
                  type="linear"
                  dataKey="trendUpperQuartile"
                  stroke="#9ca3af"
                  strokeWidth={1.5}
                  strokeDasharray="3 2"
                  dot={false}
                  activeDot={false}
                  connectNulls={false}
                  name="Upper Quartile"
                />
                <Line
                  type="linear"
                  dataKey="trendLowerQuartile"
                  stroke="#9ca3af"
                  strokeWidth={1.5}
                  strokeDasharray="3 2"
                  dot={false}
                  activeDot={false}
                  connectNulls={false}
                  name="Lower Quartile"
                />
                {/* Reduced Trend Limits (optional) */}
                {showReducedTrendLimits && (
                  <>
                    <Line
                      type="linear"
                      dataKey="trendReducedUNPL"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      strokeDasharray="8 4"
                      dot={false}
                      activeDot={false}
                      connectNulls={false}
                      name="Reduced Upper Limit"
                    />
                    <Line
                      type="linear"
                      dataKey="trendReducedLNPL"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      strokeDasharray="8 4"
                      dot={false}
                      activeDot={false}
                      connectNulls={false}
                      name="Reduced Lower Limit"
                    />
                    <Line
                      type="linear"
                      dataKey="trendReducedUpperQuartile"
                      stroke="#93c5fd"
                      strokeWidth={1.5}
                      strokeDasharray="3 3"
                      dot={false}
                      activeDot={false}
                      connectNulls={false}
                      name="Reduced Upper Quartile"
                    />
                    <Line
                      type="linear"
                      dataKey="trendReducedLowerQuartile"
                      stroke="#93c5fd"
                      strokeWidth={1.5}
                      strokeDasharray="3 3"
                      dot={false}
                      activeDot={false}
                      connectNulls={false}
                      name="Reduced Lower Quartile"
                    />
                  </>
                )}
              </>
            ) : (
              <>
                {/* Standard Reference Lines */}
                <ReferenceLine
                  y={xmrLimits.avgX}
                  stroke="#10b981"
                  strokeWidth={3}
                  strokeDasharray="8 4"
                  label={avgLabel}
                />
                <ReferenceLine
                  y={xmrLimits.UNPL}
                  stroke="#94a3b8"
                  strokeWidth={isLimitsLocked ? 2.5 : 2}
                  strokeDasharray={isLimitsLocked ? "" : "6 3"}
                  label={unplLabel}
                />
                <ReferenceLine
                  y={xmrLimits.LNPL}
                  stroke="#94a3b8"
                  strokeWidth={isLimitsLocked ? 2.5 : 2}
                  strokeDasharray={isLimitsLocked ? "" : "6 3"}
                  label={lnplLabel}
                />
                {/* Quartile Lines (without labels) */}
                <ReferenceLine
                  y={xmrLimits.upperQuartile}
                  stroke="#9ca3af"
                  strokeWidth={1.5}
                  strokeDasharray="3 2"
                />
                <ReferenceLine
                  y={xmrLimits.lowerQuartile}
                  stroke="#9ca3af"
                  strokeWidth={1.5}
                  strokeDasharray="3 2"
                />
              </>
            )}

            <Line
              type="linear"
              dataKey="value"
              stroke={submetric.color || "#3b82f6"}
              strokeWidth={3}
              dot={renderDot}
              activeDot={renderActiveDot}
              connectNulls={false}
            />

            {/* Render labels after the line to ensure they appear on top */}
            <Line
              type="linear"
              dataKey="value"
              stroke="transparent"
              strokeWidth={0}
              dot={false}
              activeDot={false}
              connectNulls={false}
            >
              <LabelList content={renderCustomLabel} />
            </Line>
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }
);

SubmetricXChart.displayName = "SubmetricXChart";
