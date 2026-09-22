import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';

import { formatDuration } from '@/lib/date';
import { haptic } from '@/lib/haptics';
import { colors, radius, spacing } from '@/theme';

import { Text } from '../ui/Text';

export interface DonutSlice {
  key: string;
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  /** Already in the fixed categorical order — never re-sorted by size. */
  data: DonutSlice[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
  formatValue?: (value: number) => string;
}

const GAP_DEGREES = 1.6; // ~2px of surface between segments

/**
 * Time allocation (spec section 12).
 *
 * Every slice is direct-labelled in the legend with its own value, so identity
 * never rests on colour alone, and the segments keep a surface gap between them.
 */
export function DonutChart({
  data,
  size = 168,
  thickness = 26,
  centerLabel = 'Tracked',
  centerValue,
  formatValue = formatDuration,
}: DonutChartProps) {
  const [selected, setSelected] = useState<string | null>(null);

  const slices = data.filter((d) => d.value > 0);
  const total = slices.reduce((sum, d) => sum + d.value, 0);
  const radiusOuter = size / 2;
  const radiusMid = radiusOuter - thickness / 2;

  if (total === 0) {
    return (
      <View style={styles.wrap}>
        <View style={[styles.empty, { width: size, height: size, borderRadius: size / 2 }]}>
          <Text variant="meta" center>
            Nothing tracked yet
          </Text>
        </View>
      </View>
    );
  }

  let cursor = -90;
  const arcs = slices.map((slice) => {
    const sweep = (slice.value / total) * 360;
    const start = cursor + GAP_DEGREES / 2;
    const end = cursor + sweep - GAP_DEGREES / 2;
    cursor += sweep;
    return { ...slice, start, end: Math.max(start + 0.1, end) };
  });

  const active = selected ? slices.find((s) => s.key === selected) : null;

  return (
    <View style={styles.wrap}>
      <View style={styles.chartRow}>
        <Svg width={size} height={size}>
          <Circle
            cx={radiusOuter}
            cy={radiusOuter}
            r={radiusMid}
            stroke={colors.surfaceSunken}
            strokeWidth={thickness}
            fill="none"
          />
          <G>
            {arcs.map((arc) => (
              <Path
                key={arc.key}
                d={arcPath(radiusOuter, radiusOuter, radiusMid, arc.start, arc.end)}
                stroke={arc.color}
                strokeWidth={selected === arc.key ? thickness + 5 : thickness}
                strokeLinecap="butt"
                fill="none"
                opacity={selected && selected !== arc.key ? 0.35 : 1}
              />
            ))}
          </G>
        </Svg>

        <View style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="none">
          <Text variant="sectionTitle" weight="bold">
            {active ? formatValue(active.value) : (centerValue ?? formatValue(total))}
          </Text>
          <Text variant="meta" center numberOfLines={2} style={styles.centerLabel}>
            {active ? active.label : centerLabel}
          </Text>
        </View>
      </View>

      <View style={styles.legend} accessibilityRole="list">
        {slices.map((slice) => {
          const isSelected = selected === slice.key;
          return (
            <Pressable
              key={slice.key}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${slice.label}, ${formatValue(slice.value)}, ${Math.round(
                (slice.value / total) * 100,
              )} percent`}
              onPress={() => {
                haptic.select();
                setSelected(isSelected ? null : slice.key);
              }}
              style={({ pressed }) => [
                styles.legendItem,
                isSelected && styles.legendItemActive,
                pressed && styles.pressed,
              ]}
            >
              <View style={[styles.swatch, { backgroundColor: slice.color }]} />
              <Text variant="smallStrong" color={colors.text} numberOfLines={1} style={styles.legendLabel}>
                {slice.label}
              </Text>
              <Text variant="meta" weight="semibold">
                {formatValue(slice.value)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function polar(cx: number, cy: number, r: number, degrees: number) {
  const rad = (degrees * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const start = polar(cx, cy, r, startDeg);
  const end = polar(cx, cy, r, endDeg);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.lg },
  chartRow: { alignSelf: 'center' },
  center: { alignItems: 'center', justifyContent: 'center' },
  centerLabel: { maxWidth: 90 },
  empty: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  legend: { gap: 2 },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    minHeight: 36,
  },
  legendItemActive: { backgroundColor: colors.surfaceSunken },
  legendLabel: { flex: 1 },
  swatch: { width: 10, height: 10, borderRadius: 3 },
  pressed: { opacity: 0.7 },
});
