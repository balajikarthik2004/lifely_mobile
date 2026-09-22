import { StyleSheet, View } from 'react-native';

import { formatShortDate } from '@/lib/date';
import { colors, radius, sequential, spacing } from '@/theme';

import { Text } from '../ui/Text';

export interface HeatmapCell {
  key: string;
  /** 0–1 intensity. */
  value: number;
  label?: string;
}

interface HeatmapProps {
  cells: HeatmapCell[];
  columns?: number;
  legendLow?: string;
  legendHigh?: string;
}

/**
 * Consistency heatmap — a magnitude encoding, so it uses the single-hue
 * sequential ramp rather than any categorical colour.
 */
export function Heatmap({
  cells,
  columns = 7,
  legendLow = 'Nothing',
  legendHigh = 'Full day',
}: HeatmapProps) {
  return (
    <View style={styles.wrap}>
      <View style={[styles.grid, { maxWidth: columns * 34 }]}>
        {cells.map((cell) => (
          <View
            key={cell.key}
            accessible
            accessibilityLabel={`${cell.label ?? formatShortDate(cell.key)}: ${Math.round(
              cell.value * 100,
            )} percent`}
            style={[styles.cell, { backgroundColor: rampColor(cell.value) }]}
          />
        ))}
      </View>

      <View style={styles.legend}>
        <Text variant="meta">{legendLow}</Text>
        <View style={styles.legendSwatches}>
          {sequential.map((hex) => (
            <View key={hex} style={[styles.legendSwatch, { backgroundColor: hex }]} />
          ))}
        </View>
        <Text variant="meta">{legendHigh}</Text>
      </View>
    </View>
  );
}

function rampColor(value: number): string {
  if (value <= 0) return colors.surfaceSunken;
  const index = Math.min(sequential.length - 1, Math.floor(value * sequential.length));
  return sequential[index];
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, alignSelf: 'center' },
  cell: { width: 26, height: 26, borderRadius: radius.xs },
  legend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  legendSwatches: { flexDirection: 'row', gap: 2 },
  legendSwatch: { width: 12, height: 12, borderRadius: 3 },
});
