import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  Button,
  Card,
  EmptyState,
  Screen,
  ScreenHeader,
  SCREEN_PADDING,
  SectionHeader,
  Text,
} from '@/components';
import { formatShortDate, formatTime } from '@/lib/date';
import { formatCredits, formatNumber } from '@/lib/format';
import { useCreditsSummary } from '@/store/selectors';
import { useAppStore } from '@/store/useAppStore';
import { colors, elevation, radius, spacing } from '@/theme';
import type { CreditTransaction, CreditType } from '@/types';

const TYPE_META: Record<CreditType, { label: string; icon: keyof typeof Feather.glyphMap }> = {
  TASK_COMPLETION: { label: 'Task', icon: 'check-square' },
  HABIT_COMPLETION: { label: 'Habit', icon: 'repeat' },
  FOCUS_SESSION: { label: 'Focus', icon: 'target' },
  WORKOUT: { label: 'Workout', icon: 'activity' },
  READING: { label: 'Reading', icon: 'book-open' },
  LEARNING: { label: 'Learning', icon: 'book' },
  REFLECTION: { label: 'Reflection', icon: 'feather' },
  GOAL_MILESTONE: { label: 'Milestone', icon: 'flag' },
  REWARD_REDEMPTION: { label: 'Reward', icon: 'gift' },
  ADJUSTMENT: { label: 'Logged', icon: 'edit-3' },
};

export default function CreditsScreen() {
  const router = useRouter();
  const transactions = useAppStore((s) => s.transactions);
  const summary = useCreditsSummary();

  const grouped = useMemo(() => {
    const groups = new Map<string, CreditTransaction[]>();
    transactions.slice(0, 120).forEach((transaction) => {
      const key = transaction.createdAt.slice(0, 10);
      const list = groups.get(key) ?? [];
      list.push(transaction);
      groups.set(key, list);
    });
    return Array.from(groups.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [transactions]);

  return (
    <Screen>
      <ScreenHeader title="Credits" subtitle="Earned by doing, spent on things you actually want." />

      {/* Balance */}
      <View style={styles.block}>
        <View style={[styles.balanceCard, elevation.md]}>
          <Text variant="overline" color={colors.primaryTintStrong}>
            Available balance
          </Text>
          <Text variant="display" color={colors.textInverse} style={styles.balance}>
            {formatNumber(summary.balance)}
          </Text>
          <View style={styles.balanceStats}>
            <BalanceStat label="Today" value={formatCredits(summary.today)} />
            <View style={styles.balanceDivider} />
            <BalanceStat label="This week" value={formatCredits(summary.week)} />
            <View style={styles.balanceDivider} />
            <BalanceStat label="Lifetime" value={formatNumber(summary.lifetime)} />
          </View>
        </View>
      </View>

      <View style={styles.block}>
        <Button
          label="Spend on a reward"
          icon="gift"
          variant="secondary"
          fullWidth
          onPress={() => router.push('/rewards')}
        />
      </View>

      {/* History */}
      <SectionHeader title="History" />

      {grouped.length === 0 ? (
        <View style={styles.block}>
          <Card>
            <EmptyState
              emoji={'⚡'}
              title="No credits yet"
              body="Complete a task or keep a habit and the first entry lands here, with what earned it."
              actionLabel="Add a task"
              onAction={() => router.push('/task-editor')}
            />
          </Card>
        </View>
      ) : (
        grouped.map(([date, items]) => {
          const dayTotal = items.reduce((sum, t) => sum + t.amount, 0);
          return (
            <View key={date} style={styles.block}>
              <View style={styles.dayHeader}>
                <Text variant="smallStrong" color={colors.textSecondary}>
                  {formatShortDate(date)}
                </Text>
                <Text
                  variant="smallStrong"
                  weight="semibold"
                  color={dayTotal >= 0 ? colors.primary : colors.warning}
                >
                  {formatCredits(dayTotal)}
                </Text>
              </View>

              <Card padded={false}>
                {items.map((transaction, index) => {
                  const meta = TYPE_META[transaction.type];
                  const positive = transaction.amount >= 0;
                  return (
                    <View
                      key={transaction.id}
                      style={[styles.row, index < items.length - 1 && styles.rowBorder]}
                    >
                      <View style={[styles.rowIcon, !positive && styles.rowIconNegative]}>
                        <Feather
                          name={meta.icon}
                          size={14}
                          color={positive ? colors.primaryDark : colors.warning}
                        />
                      </View>
                      <View style={styles.rowBody}>
                        <Text variant="bodyStrong" numberOfLines={1}>
                          {transaction.description}
                        </Text>
                        <Text variant="meta">
                          {meta.label} · {formatTime(transaction.createdAt)}
                        </Text>
                      </View>
                      <Text
                        variant="bodyStrong"
                        weight="semibold"
                        color={positive ? colors.primary : colors.warning}
                      >
                        {formatCredits(transaction.amount)}
                      </Text>
                    </View>
                  );
                })}
              </Card>
            </View>
          );
        })
      )}

      {transactions.length > 120 ? (
        <Text variant="meta" center style={styles.footnote}>
          Showing your 120 most recent entries
        </Text>
      ) : null}
    </Screen>
  );
}

function BalanceStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.balanceStat}>
      <Text variant="bodyStrong" weight="semibold" color={colors.textInverse}>
        {value}
      </Text>
      <Text variant="meta" color={colors.primaryTintStrong}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { paddingHorizontal: SCREEN_PADDING, marginBottom: spacing.lg },
  balanceCard: {
    backgroundColor: colors.primaryDeep,
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: 2,
  },
  balance: { fontSize: 44, lineHeight: 52, letterSpacing: -1.4, marginBottom: spacing.lg },
  balanceStats: { flexDirection: 'row', alignItems: 'center' },
  balanceStat: { flex: 1, gap: 1 },
  balanceDivider: { width: StyleSheet.hairlineWidth, height: 26, backgroundColor: 'rgba(255,255,255,0.22)' },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 58,
  },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIconNegative: { backgroundColor: colors.warningTint },
  rowBody: { flex: 1, gap: 1 },
  footnote: { color: colors.textTertiary, marginBottom: spacing.lg },
});
