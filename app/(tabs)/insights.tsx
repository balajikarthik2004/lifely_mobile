import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  Card,
  DonutChart,
  Heatmap,
  MetricCard,
  Screen,
  SCREEN_PADDING,
  SectionHeader,
  Segmented,
  Text,
  TrendChart,
  type DonutSlice,
} from '@/components';
import { accents, colors, radius, spacing } from '@/theme';
import { CATEGORY_META, CATEGORY_SERIES_ORDER } from '@/domain/categories';
import { completionRate } from '@/domain/habits';
import { formatDuration, formatShortDate, lastNDays, todayKey, weekdayLetter } from '@/lib/date';
import { formatCredits } from '@/lib/format';
import { activitiesOn, minutesByCategory, useRecordsForRange } from '@/store/selectors';
import { useAppStore } from '@/store/useAppStore';

type Range = '7' | '30';

export default function InsightsScreen() {
  const router = useRouter();
  const [range, setRange] = useState<Range>('7');
  const days = Number(range);

  const state = useAppStore();
  const records = useRecordsForRange(days);
  const previous = useRecordsForRange(days * 2).slice(0, days);

  const past = records.filter((r) => r.date <= todayKey());

  const avg = (list: typeof records, pick: (r: (typeof records)[number]) => number) =>
    list.length ? list.reduce((sum, r) => sum + pick(r), 0) / list.length : 0;

  const avgScore = avg(past, (r) => r.lifeScore);
  const avgCredits = avg(past, (r) => r.creditsEarned);
  const totalFocus = past.reduce((sum, r) => sum + r.focusMinutes, 0);
  const habitRate =
    past.reduce((sum, r) => sum + (r.habitsTotal ? r.habitsCompleted / r.habitsTotal : 0), 0) /
    (past.length || 1);

  const prevScore = avg(previous, (r) => r.lifeScore);
  const prevCredits = avg(previous, (r) => r.creditsEarned);

  /* Time allocation — fixed category order, never sorted by size. */
  const allocation = useMemo(() => {
    const totals = lastNDays(days)
      .flatMap((key) => activitiesOn(state, key))
      .reduce(
        (acc, activity) => {
          acc[activity.category] += activity.durationMinutes ?? 0;
          return acc;
        },
        { ...minutesByCategory([]) },
      );

    return CATEGORY_SERIES_ORDER.map<DonutSlice>((category) => ({
      key: category,
      label: CATEGORY_META[category].label,
      value: totals[category],
      color: accents[CATEGORY_META[category].accent].base,
    }));
  }, [state, days]);

  const trend = useMemo(
    () =>
      records.map((r) => ({
        label: weekdayLetter(r.date),
        value: r.lifeScore,
        caption: formatShortDate(r.date),
      })),
    [records],
  );

  const creditTrend = useMemo(
    () =>
      records.map((r) => ({
        label: weekdayLetter(r.date),
        value: Math.max(0, r.creditsEarned),
        caption: formatShortDate(r.date),
      })),
    [records],
  );

  const heatCells = useMemo(
    () =>
      lastNDays(28).map((key) => {
        const record = records.find((r) => r.date === key);
        const dayRecord = record ?? { habitsCompleted: 0, habitsTotal: 0 };
        const value = dayRecord.habitsTotal
          ? dayRecord.habitsCompleted / dayRecord.habitsTotal
          : 0;
        return { key, value, label: formatShortDate(key) };
      }),
    [records],
  );

  const habitLeaderboard = useMemo(() => {
    const keys = lastNDays(days);
    return state.habits
      .map((habit) => ({ habit, rate: completionRate(habit, keys) }))
      .sort((a, b) => b.rate - a.rate);
  }, [state.habits, days]);

  const strongest = habitLeaderboard[0];
  const weakest = habitLeaderboard[habitLeaderboard.length - 1];

  const hasData = past.some((r) => r.creditsEarned !== 0 || r.tasksTotal > 0 || r.habitsTotal > 0);

  return (
    <Screen tabBarPadding>
      <View style={styles.header}>
        <Text variant="screenTitle">Insights</Text>
        <Text variant="small" color={colors.textSecondary}>
          What the last {days} days actually looked like.
        </Text>
      </View>

      <View style={styles.block}>
        <Segmented
          value={range}
          onChange={setRange}
          options={[
            { value: '7', label: 'Last 7 days' },
            { value: '30', label: 'Last 30 days' },
          ]}
        />
      </View>

      {!hasData ? (
        <View style={styles.block}>
          <Card>
            <View style={styles.emptyCard}>
              <Text variant="cardTitle" center>
                Not enough history yet
              </Text>
              <Text variant="small" color={colors.textSecondary} center>
                Insights get useful after a few tracked days. Keep logging and this page fills in on
                its own.
              </Text>
            </View>
          </Card>
        </View>
      ) : null}

      {/* Headline stats */}
      <View style={styles.block}>
        <View style={styles.metricRow}>
          <MetricCard
            icon="activity"
            value={String(Math.round(avgScore))}
            label={deltaLabel('Life Score', avgScore, prevScore)}
          />
          <MetricCard
            icon="zap"
            value={formatCredits(Math.round(avgCredits))}
            label={deltaLabel('Daily credits', avgCredits, prevCredits)}
          />
        </View>
        <View style={styles.metricRow}>
          <MetricCard
            icon="target"
            value={formatDuration(totalFocus)}
            label="Focus time"
            tint={colors.accentTintCool}
            color={colors.accentCool}
          />
          <MetricCard
            icon="repeat"
            value={`${Math.round(habitRate * 100)}%`}
            label="Habits kept"
            tint={colors.accentTintWarm}
            color={colors.accentWarm}
          />
        </View>
      </View>

      {/* Life Score trend */}
      <View style={styles.block}>
        <Card>
          <TrendChart data={trend} seriesLabel="Life Score, daily" maxValue={100} />
        </Card>
      </View>

      {/* Credits trend */}
      <View style={styles.block}>
        <Card>
          <TrendChart data={creditTrend} seriesLabel="Credits earned, daily" color={colors.accentCool} />
        </Card>
      </View>

      {/* Time allocation */}
      <SectionHeader title="Where the time went" />
      <View style={styles.block}>
        <Card>
          <DonutChart data={allocation} centerLabel={`Tracked in ${days} days`} />
        </Card>
      </View>

      {/* Habit consistency */}
      <SectionHeader title="Habit consistency" action="Manage" onAction={() => router.push('/habits')} />
      <View style={styles.block}>
        <Card>
          <Heatmap cells={heatCells} legendLow="None kept" legendHigh="All kept" />
          {habitLeaderboard.length > 0 ? (
            <View style={styles.habitSummary}>
              {habitLeaderboard.slice(0, 5).map(({ habit, rate }) => (
                <View key={habit.id} style={styles.habitRow}>
                  <Text style={styles.habitIcon}>{habit.icon}</Text>
                  <Text variant="smallStrong" color={colors.text} numberOfLines={1} style={styles.habitName}>
                    {habit.name}
                  </Text>
                  <View style={styles.habitBarTrack}>
                    <View
                      style={[
                        styles.habitBarFill,
                        {
                          width: `${Math.max(2, rate)}%`,
                          backgroundColor: rate >= 60 ? colors.primary : colors.primarySoft,
                        },
                      ]}
                    />
                  </View>
                  <Text variant="meta" weight="semibold">
                    {Math.round(rate)}%
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </Card>
      </View>

      {/* Written summary */}
      {hasData ? (
        <View style={styles.block}>
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <Feather name="feather" size={14} color={colors.primaryDark} />
              <Text variant="overline" color={colors.primaryDark}>
                Weekly read
              </Text>
            </View>
            <Text variant="body" style={styles.summaryLine}>
              You spent {formatDuration(totalFocus)} in focused work and kept{' '}
              {Math.round(habitRate * 100)}% of your scheduled habits.
            </Text>
            {strongest && weakest && strongest.habit.id !== weakest.habit.id ? (
              <Text variant="body" style={styles.summaryLine}>
                {strongest.habit.name} is holding at {Math.round(strongest.rate)}%.{' '}
                {weakest.habit.name} is the weak point at {Math.round(weakest.rate)}%.
              </Text>
            ) : null}
            <Text variant="small" color={colors.textSecondary} style={styles.summaryLine}>
              These numbers only reflect what was logged — untracked time is not counted anywhere.
            </Text>
          </View>
        </View>
      ) : null}
    </Screen>
  );
}

function deltaLabel(label: string, current: number, previous: number): string {
  if (previous <= 0) return label;
  const change = ((current - previous) / previous) * 100;
  if (!Number.isFinite(change) || Math.abs(change) < 1) return label;
  return `${label} ${change > 0 ? '↑' : '↓'}${Math.abs(Math.round(change))}%`;
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: SCREEN_PADDING, marginBottom: spacing.lg, gap: 2 },
  block: { paddingHorizontal: SCREEN_PADDING, marginBottom: spacing.lg },
  metricRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  emptyCard: { gap: spacing.sm, paddingVertical: spacing.sm },
  habitSummary: { marginTop: spacing.xl, gap: spacing.md },
  habitRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  habitIcon: { fontSize: 15 },
  habitName: { width: 96 },
  habitBarTrack: {
    flex: 1,
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSunken,
    overflow: 'hidden',
  },
  habitBarFill: { height: '100%', borderRadius: radius.pill },
  summaryCard: {
    backgroundColor: colors.primaryTint,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  summaryLine: { lineHeight: 21 },
});
