import { Feather } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { formatNumber } from '@/lib/format';
import { colors, elevation, radius, spacing } from '@/theme';
import type { Reward } from '@/types';

import { Button } from './ui/Button';
import { ProgressBar } from './ui/Progress';
import { Text } from './ui/Text';

interface RewardCardProps {
  reward: Reward;
  balance: number;
  onRedeem: (reward: Reward) => void;
  onLongPress?: (reward: Reward) => void;
}

export function RewardCard({ reward, balance, onRedeem, onLongPress }: RewardCardProps) {
  const affordable = balance >= reward.creditCost;
  const progress = Math.min(100, (balance / reward.creditCost) * 100);
  const remaining = reward.creditCost - balance;
  const timesRedeemed = reward.redemptions.length;

  return (
    <View style={[styles.card, elevation.sm]} onTouchEnd={undefined}>
      <View style={styles.header}>
        <View style={[styles.icon, affordable && styles.iconReady]}>
          <Text style={styles.iconText}>{reward.icon}</Text>
        </View>
        <View style={styles.headerBody}>
          <Text variant="cardTitle" numberOfLines={1}>
            {reward.title}
          </Text>
          {reward.description ? (
            <Text variant="meta" numberOfLines={2}>
              {reward.description}
            </Text>
          ) : null}
        </View>
        <View style={styles.cost}>
          <Text variant="bodyStrong" weight="bold" color={affordable ? colors.primary : colors.textSecondary}>
            {formatNumber(reward.creditCost)}
          </Text>
          <Text variant="meta">credits</Text>
        </View>
      </View>

      {!affordable ? (
        <View style={styles.progressBlock}>
          <ProgressBar
            value={progress}
            height={6}
            label={`Progress toward ${reward.title}`}
          />
          <Text variant="meta">{formatNumber(remaining)} credits to go</Text>
        </View>
      ) : null}

      <View style={styles.footer}>
        {timesRedeemed > 0 ? (
          <View style={styles.redeemed}>
            <Feather name="check-circle" size={12} color={colors.textTertiary} />
            <Text variant="meta">
              Enjoyed {timesRedeemed} {timesRedeemed === 1 ? 'time' : 'times'}
            </Text>
          </View>
        ) : (
          <View />
        )}
        <Button
          label={affordable ? 'Redeem' : 'Not yet'}
          size="sm"
          variant={affordable ? 'primary' : 'secondary'}
          disabled={!affordable}
          onPress={() => onRedeem(reward)}
          onLongPress={() => onLongPress?.(reward)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconReady: { backgroundColor: colors.primaryTint },
  iconText: { fontSize: 21, lineHeight: 26 },
  headerBody: { flex: 1, gap: 2 },
  cost: { alignItems: 'flex-end' },
  progressBlock: { gap: 6 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  redeemed: { flexDirection: 'row', alignItems: 'center', gap: 5 },
});
