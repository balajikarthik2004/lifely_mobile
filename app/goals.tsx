import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  Button,
  Card,
  EmptyState,
  GoalCard,
  Screen,
  ScreenHeader,
  SCREEN_PADDING,
  Segmented,
  Text,
} from '@/components';
import { averageGoalProgress } from '@/domain/goals';
import { useAppStore } from '@/store/useAppStore';
import { colors, spacing } from '@/theme';

type Filter = 'active' | 'completed' | 'all';

export default function GoalsScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>('active');
  const goals = useAppStore((s) => s.goals);

  const visible = useMemo(() => {
    if (filter === 'all') return goals;
    if (filter === 'completed') return goals.filter((g) => g.status === 'COMPLETED');
    return goals.filter((g) => g.status === 'ACTIVE');
  }, [goals, filter]);

  const average = averageGoalProgress(goals);

  return (
    <Screen>
      <ScreenHeader
        title="Goals"
        subtitle={
          goals.length > 0
            ? `Averaging ${Math.round(average)}% across everything you are working toward`
            : 'The things the daily work is actually for.'
        }
      />

      {goals.length > 0 ? (
        <View style={styles.block}>
          <Segmented
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'completed', label: 'Done' },
              { value: 'all', label: 'All' },
            ]}
          />
        </View>
      ) : null}

      <View style={styles.list}>
        {visible.length > 0 ? (
          visible.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onPress={() => router.push({ pathname: '/goal/[id]', params: { id: goal.id } })}
            />
          ))
        ) : (
          <Card>
            <EmptyState
              emoji={'\u{1F3AF}'}
              title={filter === 'completed' ? 'Nothing finished yet' : 'Big goals start with one step'}
              body={
                filter === 'completed'
                  ? 'Completed goals stay here so you can see how far you have actually come.'
                  : 'Name one thing you want to be true a year from now, then break it into milestones.'
              }
              actionLabel={filter === 'completed' ? undefined : 'Create goal'}
              onAction={filter === 'completed' ? undefined : () => router.push('/goal-editor')}
            />
          </Card>
        )}
      </View>

      {goals.length > 0 ? (
        <View style={styles.block}>
          <Button
            label="New goal"
            icon="plus"
            variant="secondary"
            fullWidth
            onPress={() => router.push('/goal-editor')}
          />
        </View>
      ) : null}

      <Text variant="meta" center style={styles.footnote}>
        Progress comes from milestones and targets you update — nothing is inferred.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  block: { paddingHorizontal: SCREEN_PADDING, marginBottom: spacing.lg },
  list: { paddingHorizontal: SCREEN_PADDING, gap: spacing.md, marginBottom: spacing.lg },
  footnote: { color: colors.textTertiary, paddingHorizontal: SCREEN_PADDING },
});
