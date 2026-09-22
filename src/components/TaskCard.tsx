import { Feather } from '@expo/vector-icons';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring } from 'react-native-reanimated';

import { CATEGORY_META, priorityColor, PRIORITY_META } from '@/domain/categories';
import { haptic } from '@/lib/haptics';
import { colors, elevation, MIN_TOUCH, radius, spacing } from '@/theme';
import type { Task } from '@/types';

import { Chip } from './ui/Chip';
import { Text } from './ui/Text';

interface TaskCardProps {
  task: Task;
  onToggle: (id: string) => void;
  onPress?: (task: Task) => void;
  showDate?: string;
}

export const TaskCard = memo(function TaskCard({ task, onToggle, onPress, showDate }: TaskCardProps) {
  const done = task.status === 'COMPLETED';
  const priority = priorityColor(task.priority);
  const category = CATEGORY_META[task.category];
  const scale = useSharedValue(1);

  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const toggle = () => {
    if (!done) {
      haptic.success();
      scale.value = withSequence(withSpring(1.12, { damping: 12 }), withSpring(1, { damping: 14 }));
    } else {
      haptic.tap();
    }
    onToggle(task.id);
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${task.title}, ${PRIORITY_META[task.priority].label} priority, ${
        done ? 'completed' : 'not completed'
      }`}
      onPress={() => onPress?.(task)}
      style={({ pressed }) => [styles.card, elevation.sm, pressed && styles.pressed]}
    >
      <Animated.View style={animated}>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: done }}
          accessibilityLabel={done ? `Mark ${task.title} as not done` : `Complete ${task.title}`}
          hitSlop={10}
          onPress={toggle}
          style={[styles.checkbox, done && styles.checkboxDone]}
        >
          {done ? <Feather name="check" size={15} color={colors.textInverse} /> : null}
        </Pressable>
      </Animated.View>

      <View style={styles.body}>
        <Text
          variant="cardTitle"
          numberOfLines={2}
          style={done ? styles.titleDone : undefined}
          color={done ? colors.textTertiary : colors.text}
        >
          {task.title}
        </Text>

        <View style={styles.meta}>
          {!done ? (
            <Chip
              label={PRIORITY_META[task.priority].label}
              color={priority.base}
              background={priority.tint}
            />
          ) : (
            <Chip label="Completed" color={colors.primaryDark} background={colors.primaryTint} />
          )}
          <Text variant="meta">{category.label}</Text>
          {task.dueTime ? (
            <>
              <Text variant="meta">·</Text>
              <Text variant="meta">{task.dueTime}</Text>
            </>
          ) : null}
          {showDate ? (
            <>
              <Text variant="meta">·</Text>
              <Text variant="meta">{showDate}</Text>
            </>
          ) : null}
        </View>
      </View>

      <View style={styles.trailing}>
        <Text variant="smallStrong" weight="semibold" color={done ? colors.primary : colors.textTertiary}>
          +{task.creditValue}
        </Text>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    minHeight: MIN_TOUCH + 22,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDone: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  body: { flex: 1, gap: 5 },
  titleDone: { textDecorationLine: 'line-through' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  trailing: { alignItems: 'flex-end' },
  pressed: { opacity: 0.93 },
});
