import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import {
  Card,
  EmptyState,
  Screen,
  SCREEN_PADDING,
  Text,
  Timeline,
} from '@/components';
import { formatDuration, lastNDays, formatShortDate, todayKey, weekdayLetter } from '@/lib/date';
import { formatCredits } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { activitiesOn, dailyRecord, untrackedGaps } from '@/store/selectors';
import { useAppStore } from '@/store/useAppStore';
import { colors, elevation, radius, spacing } from '@/theme';

export default function TimelineScreen() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(todayKey());

  const state = useAppStore();
  const activities = useMemo(() => activitiesOn(state, selectedDate), [state, selectedDate]);
  const record = useMemo(() => dailyRecord(state, selectedDate), [state, selectedDate]);
  const gaps = useMemo(() => untrackedGaps(activities), [activities]);

  const untrackedMinutes = gaps.reduce((sum, g) => sum + g.minutes, 0);
  const trackedMinutes = activities.reduce((sum, a) => sum + (a.durationMinutes ?? 0), 0);
  const days = useMemo(() => lastNDays(14), []);

  return (
    <Screen tabBarPadding contentStyle={styles.content}>
      <View style={styles.header}>
        <Text variant="screenTitle">Your day</Text>
        <Text variant="small" color={colors.textSecondary}>
          Everything you did, in order. Gaps included.
        </Text>
      </View>

      {/* Date strip */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dateStrip}
      >
        {days.map((key) => {
          const active = key === selectedDate;
          const isToday = key === todayKey();
          return (
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={formatShortDate(key)}
              onPress={() => {
                haptic.select();
                setSelectedDate(key);
              }}
              style={[styles.dateChip, active && styles.dateChipActive]}
            >
              <Text
                variant="meta"
                color={active ? colors.primaryTintStrong : colors.textTertiary}
              >
                {weekdayLetter(key)}
              </Text>
              <Text
                variant="bodyStrong"
                weight="semibold"
                color={active ? colors.textInverse : colors.text}
              >
                {key.slice(8)}
              </Text>
              {isToday && !active ? <View style={styles.todayDot} /> : null}
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Day summary */}
      <View style={styles.summaryWrap}>
        <View style={[styles.summary, elevation.sm]}>
          <SummaryStat label="Tracked" value={formatDuration(trackedMinutes)} />
          <View style={styles.divider} />
          <SummaryStat
            label="Untracked"
            value={untrackedMinutes > 0 ? formatDuration(untrackedMinutes) : '—'}
            tone={untrackedMinutes > 120 ? colors.warning : colors.text}
          />
          <View style={styles.divider} />
          <SummaryStat label="Credits" value={formatCredits(record.creditsEarned)} tone={colors.primary} />
        </View>
      </View>

      {/* Timeline */}
      {activities.length > 0 ? (
        <View style={styles.timelineWrap}>
          <Timeline
            activities={activities}
            onPressActivity={(activity) =>
              router.push({ pathname: '/activity-editor', params: { id: activity.id } })
            }
            onPressGap={(startTime, endTime) =>
              router.push({ pathname: '/activity-editor', params: { startTime, endTime } })
            }
          />
        </View>
      ) : (
        <View style={styles.emptyWrap}>
          <Card>
            <EmptyState
              emoji={'\u{1F5D3}️'}
              title="Your day is waiting to be captured"
              body="Log what you have already done today. Even three entries make the picture useful."
              actionLabel="Add activity"
              onAction={() =>
                router.push({ pathname: '/activity-editor', params: { date: selectedDate } })
              }
            />
          </Card>
        </View>
      )}

      {activities.length > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add an activity"
          onPress={() => router.push({ pathname: '/activity-editor', params: { date: selectedDate } })}
          style={({ pressed }) => [styles.addRow, pressed && styles.pressed]}
        >
          <Feather name="plus" size={16} color={colors.primaryDark} />
          <Text variant="smallStrong" color={colors.primaryDark}>
            Add an activity
          </Text>
        </Pressable>
      ) : null}
    </Screen>
  );
}

function SummaryStat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <View style={styles.stat}>
      <Text variant="cardTitle" weight="bold" color={tone}>
        {value}
      </Text>
      <Text variant="meta">{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 140 },
  header: { paddingHorizontal: SCREEN_PADDING, marginBottom: spacing.lg, gap: 2 },
  dateStrip: { paddingHorizontal: SCREEN_PADDING, gap: spacing.sm, paddingBottom: spacing.xs },
  dateChip: {
    width: 48,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  dateChipActive: { backgroundColor: colors.primaryDeep, borderColor: colors.primaryDeep },
  todayDot: {
    position: 'absolute',
    bottom: 5,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  summaryWrap: { paddingHorizontal: SCREEN_PADDING, marginTop: spacing.lg, marginBottom: spacing.xl },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  divider: { width: StyleSheet.hairlineWidth, height: 28, backgroundColor: colors.border },
  timelineWrap: { paddingLeft: spacing.sm },
  emptyWrap: { paddingHorizontal: SCREEN_PADDING },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginHorizontal: SCREEN_PADDING,
    marginTop: spacing.md,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
  },
  pressed: { opacity: 0.7 },
});
