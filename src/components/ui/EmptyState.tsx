import { StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '@/theme';

import { Button } from './Button';
import { Text } from './Text';

interface EmptyStateProps {
  emoji: string;
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
}

/**
 * Every list gets one of these instead of a blank area (spec section 33) —
 * an empty screen should still tell you what to do next.
 */
export function EmptyState({
  emoji,
  title,
  body,
  actionLabel,
  onAction,
  compact = false,
}: EmptyStateProps) {
  return (
    <View style={[styles.wrap, compact && styles.compact]}>
      <View style={styles.badge}>
        <Text style={styles.emoji}>{emoji}</Text>
      </View>
      <Text variant="cardTitle" center style={styles.title}>
        {title}
      </Text>
      <Text variant="small" color={colors.textSecondary} center style={styles.body}>
        {body}
      </Text>
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} size="md" icon="plus" style={styles.action} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
  },
  compact: { paddingVertical: spacing.xl },
  badge: {
    width: 64,
    height: 64,
    borderRadius: radius.xl,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emoji: { fontSize: 28, lineHeight: 34 },
  title: { marginBottom: spacing.xs },
  body: { maxWidth: 280 },
  action: { marginTop: spacing.xl },
});
