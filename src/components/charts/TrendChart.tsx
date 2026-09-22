import { useMemo, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Stop } from 'react-native-svg';

import { haptic } from '@/lib/haptics';
import { colors, spacing } from '@/theme';

import { Text } from '../ui/Text';

export interface TrendPoint {
  label: string;
  value: number;
  caption?: string;
}

interface TrendChartProps {
  data: TrendPoint[];
  /** Series name — a single-series chart is titled, not legended. */
  seriesLabel: string;
  color?: string;
  height?: number;
  maxValue?: number;
  valueSuffix?: string;
}

/**
 * Single-series trend (spec section 12).
 *
 * One series, so no legend: the caption names it. The most recent point is
 * direct-labelled rather than labelling every point, and tapping any point
 * moves the readout — the mobile stand-in for a hover crosshair.
 */
export function TrendChart({
  data,
  seriesLabel,
  color = colors.primary,
  height = 168,
  maxValue,
  valueSuffix = '',
}: TrendChartProps) {
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);

  const padding = { top: 18, right: 14, bottom: 26, left: 14 };
  const plotWidth = Math.max(0, width - padding.left - padding.right);
  const plotHeight = height - padding.top - padding.bottom;

  const max = maxValue ?? Math.max(10, ...data.map((d) => d.value)) * 1.15;

  const points = useMemo(() => {
    if (plotWidth <= 0 || data.length === 0) return [];
    const step = data.length > 1 ? plotWidth / (data.length - 1) : 0;
    return data.map((d, i) => ({
      ...d,
      x: padding.left + step * i,
      y: padding.top + plotHeight * (1 - Math.min(1, d.value / max)),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, plotWidth, plotHeight, max]);

  const linePath = useMemo(() => smoothPath(points), [points]);
  const areaPath = useMemo(() => {
    if (points.length === 0 || !linePath) return '';
    const baseline = padding.top + plotHeight;
    return `${linePath} L ${points[points.length - 1].x} ${baseline} L ${points[0].x} ${baseline} Z`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linePath, points, plotHeight]);

  const active = selected !== null ? points[selected] : points[points.length - 1];

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  return (
    <View onLayout={onLayout}>
      <View style={styles.readout}>
        <Text variant="meta">{seriesLabel}</Text>
        {active ? (
          <Text variant="sectionTitle" weight="bold">
            {Math.round(active.value)}
            {valueSuffix}
            <Text variant="meta">{`  ${active.caption ?? active.label}`}</Text>
          </Text>
        ) : null}
      </View>

      {width > 0 && points.length > 0 ? (
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={color} stopOpacity={0.18} />
              <Stop offset="1" stopColor={color} stopOpacity={0.01} />
            </LinearGradient>
          </Defs>

          {/* Recessive baseline only — no grid clutter at this size. */}
          <Line
            x1={padding.left}
            y1={padding.top + plotHeight}
            x2={width - padding.right}
            y2={padding.top + plotHeight}
            stroke={colors.border}
            strokeWidth={1}
          />

          <Path d={areaPath} fill="url(#trendFill)" />
          <Path
            d={linePath}
            stroke={color}
            strokeWidth={2}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {active ? (
            <G>
              <Line
                x1={active.x}
                y1={padding.top - 4}
                x2={active.x}
                y2={padding.top + plotHeight}
                stroke={colors.borderStrong}
                strokeWidth={1}
                strokeDasharray="3 3"
              />
              {/* 2px surface ring keeps the marker readable over the line. */}
              <Circle cx={active.x} cy={active.y} r={6} fill={colors.surface} />
              <Circle cx={active.x} cy={active.y} r={4.5} fill={color} />
            </G>
          ) : null}
        </Svg>
      ) : (
        <View style={{ height }} />
      )}

      <View style={styles.axis}>
        {points.map((point, index) => (
          <Pressable
            key={`${point.label}-${index}`}
            accessibilityRole="button"
            accessibilityLabel={`${point.caption ?? point.label}: ${Math.round(point.value)}${valueSuffix}`}
            hitSlop={{ top: height, bottom: 8 }}
            onPress={() => {
              haptic.select();
              setSelected(index);
            }}
            style={styles.axisTick}
          >
            <Text
              variant="meta"
              weight={active === point ? 'semibold' : 'medium'}
              color={active === point ? colors.text : colors.textTertiary}
            >
              {point.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

/** Catmull-Rom style smoothing, clamped so the curve never overshoots. */
function smoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const current = points[i];
    const next = points[i + 1];
    const controlX = (current.x + next.x) / 2;
    d += ` C ${controlX} ${current.y}, ${controlX} ${next.y}, ${next.x} ${next.y}`;
  }
  return d;
}

const styles = StyleSheet.create({
  readout: { marginBottom: spacing.sm, gap: 2 },
  axis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -22,
  },
  axisTick: { flex: 1, alignItems: 'center', paddingVertical: 2 },
});
