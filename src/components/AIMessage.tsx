import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { AI_THINKING_LINES } from '@/domain/ai';
import { colors, radius, spacing } from '@/theme';
import type { ChatMessage } from '@/types';

import { Chip } from './ui/Chip';
import { Text } from './ui/Text';

interface AIMessageProps {
  message: ChatMessage;
  onSuggestion?: (text: string) => void;
}

export function AIMessage({ message, onSuggestion }: AIMessageProps) {
  const isUser = message.role === 'user';

  return (
    <Animated.View entering={FadeIn.duration(220)} style={isUser ? styles.userWrap : styles.aiWrap}>
      {!isUser ? (
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{'✨'}</Text>
        </View>
      ) : null}

      <View style={styles.column}>
        <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}>
          <Text
            variant="body"
            color={isUser ? colors.textInverse : colors.text}
            style={styles.bubbleText}
          >
            {message.text}
          </Text>
        </View>

        {!isUser && message.suggestions?.length ? (
          <View style={styles.suggestions}>
            {message.suggestions.slice(0, 3).map((suggestion) => (
              <Chip
                key={suggestion}
                label={suggestion}
                size="md"
                color={colors.primaryDark}
                background={colors.primaryTint}
                onPress={() => onSuggestion?.(suggestion)}
              />
            ))}
          </View>
        ) : null}
      </View>
    </Animated.View>
  );
}

/** Rotating status line while the assistant works (spec section 34). */
export function AIThinking() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setIndex((i) => (i + 1) % AI_THINKING_LINES.length), 1100);
    return () => clearInterval(timer);
  }, []);

  return (
    <View style={styles.aiWrap}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{'✨'}</Text>
      </View>
      <View style={[styles.bubble, styles.aiBubble]}>
        <Text variant="small" color={colors.textSecondary} accessibilityLiveRegion="polite">
          {AI_THINKING_LINES[index]}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  aiWrap: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start', maxWidth: '92%' },
  userWrap: { alignSelf: 'flex-end', maxWidth: '85%' },
  column: { flex: 1, gap: spacing.sm },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  avatarText: { fontSize: 14, lineHeight: 18 },
  bubble: {
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  aiBubble: {
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderTopLeftRadius: radius.xs,
  },
  userBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: radius.xs,
  },
  bubbleText: { lineHeight: 22 },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
