import { Feather } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card, Screen, SCREEN_PADDING, SectionHeader, Text } from '@/components';
import { formatNumber } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { currentDayStreak, useCreditsSummary, useRecordsForRange } from '@/store/selectors';
import { useAppStore } from '@/store/useAppStore';
import { colors, elevation, radius, spacing } from '@/theme';

interface Row {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  caption?: string;
  href: Href;
}

export default function ProfileScreen() {
  const router = useRouter();
  const profile = useAppStore((s) => s.profile);
  const goals = useAppStore((s) => s.goals);
  const rewards = useAppStore((s) => s.rewards);
  const habits = useAppStore((s) => s.habits);
  const streak = useAppStore(currentDayStreak);
  const credits = useCreditsSummary();
  const records = useRecordsForRange(30);

  const avgScore = Math.round(
    records.reduce((sum, r) => sum + r.lifeScore, 0) / (records.length || 1),
  );

  const activeGoals = goals.filter((g) => g.status === 'ACTIVE').length;
  const redeemable = rewards.filter((r) => credits.balance >= r.creditCost).length;

  const sections: { title: string; rows: Row[] }[] = [
    {
      title: 'Your system',
      rows: [
        {
          icon: 'flag',
          label: 'Goals',
          caption: `${activeGoals} active`,
          href: '/goals',
        },
        {
          icon: 'repeat',
          label: 'Habits',
          caption: `${habits.filter((h) => h.isActive).length} running`,
          href: '/habits',
        },
        { icon: 'check-square', label: 'Tasks', href: '/tasks' },
        {
          icon: 'gift',
          label: 'Rewards',
          caption: redeemable > 0 ? `${redeemable} within reach` : undefined,
          href: '/rewards',
        },
      ],
    },
    {
      title: 'Your record',
      rows: [
        { icon: 'zap', label: 'Credit history', caption: `${formatNumber(credits.balance)} available`, href: '/credits' },
        { icon: 'book-open', label: 'Reflections', href: '/reflections' },
        { icon: 'message-circle', label: 'Assistant', href: '/assistant' },
      ],
    },
    {
      title: 'App',
      rows: [
        { icon: 'settings', label: 'Settings', href: '/settings' },
        { icon: 'bell', label: 'Notifications', href: '/settings' },
        { icon: 'shield', label: 'Privacy & data', href: '/settings' },
      ],
    },
  ];

  return (
    <Screen tabBarPadding>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Edit profile"
          onPress={() => router.push('/settings')}
          style={({ pressed }) => [styles.avatar, pressed && styles.pressed]}
        >
          <Text style={styles.avatarText}>{profile.avatarEmoji}</Text>
        </Pressable>
        <Text variant="screenTitle" center style={styles.name}>
          {profile.name}
        </Text>
        <Text variant="small" color={colors.textSecondary} center>
          {profile.statement}
        </Text>
      </View>

      <View style={styles.block}>
        <View style={[styles.stats, elevation.sm]}>
          <Stat value={String(streak)} label={streak === 1 ? 'Day streak' : 'Day streak'} />
          <View style={styles.divider} />
          <Stat value={formatNumber(credits.lifetime)} label="Credits earned" />
          <View style={styles.divider} />
          <Stat value={String(avgScore)} label="Avg Life Score" />
        </View>
      </View>

      {sections.map((section) => (
        <View key={section.title}>
          <SectionHeader title={section.title} />
          <View style={styles.block}>
            <Card padded={false}>
              {section.rows.map((row, index) => (
                <Pressable
                  key={`${row.label}-${index}`}
                  accessibilityRole="button"
                  accessibilityLabel={row.label}
                  onPress={() => {
                    haptic.tap();
                    router.push(row.href);
                  }}
                  style={({ pressed }) => [
                    styles.row,
                    index < section.rows.length - 1 && styles.rowBorder,
                    pressed && styles.rowPressed,
                  ]}
                >
                  <View style={styles.rowIcon}>
                    <Feather name={row.icon} size={16} color={colors.primaryDark} />
                  </View>
                  <Text variant="bodyStrong" style={styles.rowLabel}>
                    {row.label}
                  </Text>
                  {row.caption ? <Text variant="meta">{row.caption}</Text> : null}
                  <Feather name="chevron-right" size={17} color={colors.textTertiary} />
                </Pressable>
              ))}
            </Card>
          </View>
        </View>
      ))}

      <View style={styles.block}>
        <Text variant="meta" center>
          Lifely · Track today. Build tomorrow.
        </Text>
      </View>
    </Screen>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text variant="sectionTitle" weight="bold">
        {value}
      </Text>
      <Text variant="meta" center>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', paddingHorizontal: SCREEN_PADDING, marginBottom: spacing.xl, gap: 3 },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: radius.xl,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatarText: { fontSize: 36, lineHeight: 44 },
  name: { marginTop: 2 },
  block: { paddingHorizontal: SCREEN_PADDING, marginBottom: spacing.lg },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  stat: { flex: 1, alignItems: 'center', gap: 2, paddingHorizontal: spacing.sm },
  divider: { width: StyleSheet.hairlineWidth, height: 30, backgroundColor: colors.border },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    minHeight: 56,
  },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  rowPressed: { backgroundColor: colors.surfaceMuted },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: { flex: 1 },
  pressed: { opacity: 0.9 },
});
