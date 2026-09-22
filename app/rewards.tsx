import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import {
  Button,
  Card,
  EmptyState,
  RewardCard,
  Screen,
  ScreenHeader,
  SCREEN_PADDING,
  Text,
} from '@/components';
import { formatNumber } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { useCreditsSummary } from '@/store/selectors';
import { useAppStore } from '@/store/useAppStore';
import { colors, radius, spacing } from '@/theme';
import type { Reward } from '@/types';

export default function RewardsScreen() {
  const router = useRouter();
  const rewards = useAppStore((s) => s.rewards);
  const redeemReward = useAppStore((s) => s.redeemReward);
  const { balance } = useCreditsSummary();

  /** Guards against a double tap firing two redemptions (spec section 11). */
  const redeeming = useRef<string | null>(null);
  const [busy, setBusy] = useState(false);

  const confirmRedeem = (reward: Reward) => {
    if (redeeming.current || busy) return;

    Alert.alert(
      `Redeem ${reward.title}?`,
      `This spends ${formatNumber(reward.creditCost)} credits. You will have ${formatNumber(
        balance - reward.creditCost,
      )} left.`,
      [
        { text: 'Not yet', style: 'cancel' },
        {
          text: 'Redeem',
          onPress: async () => {
            if (redeeming.current) return;
            redeeming.current = reward.id;
            setBusy(true);

            const result = await redeemReward(reward.id);
            if (!result.ok) {
              haptic.warning();
              Alert.alert('Not quite yet', result.reason ?? 'Something went wrong.');
            } else {
              haptic.success();
            }

            setTimeout(() => {
              redeeming.current = null;
              setBusy(false);
            }, 600);
          },
        },
      ],
    );
  };

  const affordable = rewards.filter((r) => balance >= r.creditCost).length;

  return (
    <Screen>
      <ScreenHeader
        title="Rewards"
        subtitle="You set the price. The point is to actually collect."
      />

      <View style={styles.block}>
        <View style={styles.balanceRow}>
          <View>
            <Text variant="overline">Balance</Text>
            <Text variant="screenTitle" weight="bold" color={colors.primary}>
              {formatNumber(balance)}
            </Text>
          </View>
          <Text variant="small" color={colors.textSecondary} style={styles.balanceNote}>
            {affordable > 0
              ? `${affordable} ${affordable === 1 ? 'reward is' : 'rewards are'} within reach`
              : 'Nothing in reach yet — keep going.'}
          </Text>
        </View>
      </View>

      <View style={styles.list}>
        {rewards.length === 0 ? (
          <Card>
            <EmptyState
              emoji={'\u{1F381}'}
              title="No rewards set up"
              body="Name something you would genuinely enjoy and put a price on it. Credits mean nothing until they buy something."
              actionLabel="Create reward"
              onAction={() => router.push('/reward-editor')}
            />
          </Card>
        ) : (
          rewards.map((reward) => (
            <RewardCard
              key={reward.id}
              reward={reward}
              balance={balance}
              onRedeem={confirmRedeem}
              onLongPress={() =>
                router.push({ pathname: '/reward-editor', params: { id: reward.id } })
              }
            />
          ))
        )}
      </View>

      {rewards.length > 0 ? (
        <View style={styles.block}>
          <Button
            label="New reward"
            icon="plus"
            variant="secondary"
            fullWidth
            onPress={() => router.push('/reward-editor')}
          />
          <Text variant="meta" center style={styles.hint}>
            Long-press a reward to edit it.
          </Text>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  block: { paddingHorizontal: SCREEN_PADDING, marginBottom: spacing.lg },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primaryTint,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  balanceNote: { flex: 1, textAlign: 'right' },
  list: { paddingHorizontal: SCREEN_PADDING, gap: spacing.md, marginBottom: spacing.lg },
  hint: { marginTop: spacing.md },
});
