import { Feather } from '@expo/vector-icons';
import { Fragment, memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { categoryColor, CATEGORY_META } from '@/domain/categories';
import { formatDuration, formatTime } from '@/lib/date';
import { untrackedGaps } from '@/store/selectors';
import { colors, elevation, radius, spacing } from '@/theme';
import type { Activity } from '@/types';

import { Text } from './ui/Text';

interface TimelineProps {
  activities: Activity[];
  onPressActivity?: (activity: Activity) => void;
  onPressGap?: (startTime: string, endTime: string) => void;
  showGaps?: boolean;
}

/**
 * The chronological spine of the day (spec section 7). Gaps of 45 minutes or
 * more are surfaced as untracked time rather than silently skipped.
 */
export function Timeline({
  activities,
  onPressActivity,
  onPressGap,
  showGaps = true,
}: TimelineProps) {
  const sorted = [...activities].sort((a, b) => (a.startTime < b.startTime ? -1 : 1));
  const gaps = showGaps ? untrackedGaps(sorted) : [];
  const gapAfter = new Map(gaps.map((g) => [g.afterActivityId, g]));

  return (
    <View style={styles.wrap}>
      {sorted.map((activity, index) => {
        const gap = gapAfter.get(activity.id);
        return (
          <Fragment key={activity.id}>
            <TimelineRow
              activity={activity}
              isLast={index === sorted.length - 1 && !gap}
              onPress={onPressActivity}
            />
            {gap ? (
              <GapRow
                minutes={gap.minutes}
                startTime={gap.startTime}
                endTime={gap.endTime}
                onPress={onPressGap}
              />
            ) : null}
          </Fragment>
        );
      })}
    </View>
  );
}

const TimelineRow = memo(function TimelineRow({
  activity,
  isLast,
  onPress,
}: {
  activity: Activity;
  isLast: boolean;
  onPress?: (activity: Activity) => void;
}) {
  const accent = categoryColor(activity.category);

  return (
    <View style={styles.row}>
      <View style={styles.gutter}>
        <Text variant="meta" weight="semibold" style={styles.time}>
          {formatTime(activity.startTime)}
        </Text>
      </View>

      <View style={styles.rail}>
        <View style={[styles.node, { backgroundColor: accent.base }]} />
        {!isLast ? <View style={styles.line} /> : null}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${activity.title}, ${CATEGORY_META[activity.category].label}, ${formatDuration(
          activity.durationMinutes ?? 0,
        )}${activity.creditsEarned ? `, earned ${activity.creditsEarned} credits` : ''}`}
        onPress={() => onPress?.(activity)}
        style={({ pressed }) => [styles.card, elevation.xs, pressed && styles.pressed]}
      >
        <View style={[styles.icon, { backgroundColor: accent.tint }]}>
          <Text style={styles.iconText}>{activity.icon}</Text>
        </View>

        <View style={styles.body}>
          <Text variant="bodyStrong" weight="semibold" numberOfLines={1}>
            {activity.title}
          </Text>
          <View style={styles.metaRow}>
            <Text variant="meta" color={accent.base} weight="semibold">
              {CATEGORY_META[activity.category].label}
            </Text>
            <Text variant="meta">·</Text>
            <Text variant="meta">{formatDuration(activity.durationMinutes ?? 0)}</Text>
            {activity.source === 'FOCUS' ? (
              <>
                <Text variant="meta">·</Text>
                <Feather name="target" size={10} color={colors.textTertiary} />
              </>
            ) : null}
          </View>
          {activity.notes ? (
            <Text variant="meta" numberOfLines={2} style={styles.notes}>
              {activity.notes}
            </Text>
          ) : null}
        </View>

        {activity.creditsEarned !== 0 ? (
          <Text variant="smallStrong" weight="semibold" color={colors.primary}>
            +{activity.creditsEarned}
          </Text>
        ) : null}
      </Pressable>
    </View>
  );
});

function GapRow({
  minutes,
  startTime,
  endTime,
  onPress,
}: {
  minutes: number;
  startTime: string;
  endTime: string;
  onPress?: (startTime: string, endTime: string) => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.gutter} />
      <View style={styles.rail}>
        <View style={styles.gapNode} />
        <View style={[styles.line, styles.lineDashed]} />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${formatDuration(minutes)} untracked between ${formatTime(
          startTime,
        )} and ${formatTime(endTime)}. Tap to log it.`}
        onPress={() => onPress?.(startTime, endTime)}
        style={({ pressed }) => [styles.gapCard, pressed && styles.pressed]}
      >
        <Feather name="clock" size={13} color={colors.textTertiary} />
        <Text variant="meta" style={styles.gapText}>
          {formatDuration(minutes)} untracked
        </Text>
        <Text variant="meta" color={colors.primaryDark} weight="semibold">
          Log it
        </Text>
      </Pressable>
    </View>
  );
}

const GUTTER = 58;

const styles = StyleSheet.create({
  wrap: { paddingRight: spacing.xl },
  row: { flexDirection: 'row', alignItems: 'stretch' },
  gutter: { width: GUTTER, paddingTop: spacing.lg, alignItems: 'flex-end', paddingRight: spacing.sm },
  time: { textAlign: 'right' },
  rail: { width: 20, alignItems: 'center' },
  node: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: spacing.lg + 4,
    borderWidth: 2,
    borderColor: colors.background,
  },
  gapNode: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: spacing.lg,
    backgroundColor: colors.borderStrong,
  },
  line: { flex: 1, width: 2, backgroundColor: colors.border, marginTop: 2 },
  lineDashed: { backgroundColor: colors.surfaceSunken },
  card: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: { fontSize: 17, lineHeight: 22 },
  body: { flex: 1, gap: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  notes: { marginTop: 2, fontStyle: 'italic' },
  gapCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginVertical: spacing.xs,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
  },
  gapText: { flex: 1 },
  pressed: { opacity: 0.9 },
});
