import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AIMessage, AIThinking, Chip, ScreenHeader, SCREEN_PADDING, Text } from '@/components';
import { aiService, AI_QUICK_ACTIONS } from '@/domain/ai';
import { lastNDays } from '@/lib/date';
import { haptic } from '@/lib/haptics';
import { useAppStore } from '@/store/useAppStore';
import { colors, elevation, fonts, MIN_TOUCH, radius, spacing } from '@/theme';

export default function AssistantScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  const chat = useAppStore((s) => s.chat);
  const pushChat = useAppStore((s) => s.pushChat);
  const clearChat = useAppStore((s) => s.clearChat);

  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || thinking) return;

      haptic.tap();
      setInput('');
      pushChat({ role: 'user', text: trimmed });
      setThinking(true);
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));

      try {
        const reply = await aiService.chat(trimmed);
        pushChat({ role: 'assistant', text: reply.text, suggestions: reply.suggestions });
      } catch {
        pushChat({
          role: 'assistant',
          text: 'I could not finish that just now. Your data is untouched — try again in a moment.',
        });
      } finally {
        setThinking(false);
        requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
      }
    },
    [pushChat, thinking],
  );

  const lastNDaysCount = lastNDays(7).length;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
      style={styles.flex}
    >
      <View style={[styles.root, { paddingTop: insets.top + spacing.sm }]}>
        <ScreenHeader
          title="Assistant"
          subtitle={`Reading your last ${lastNDaysCount} days`}
          large={false}
          right={
            chat.length > 0 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear conversation"
                onPress={() => {
                  haptic.tap();
                  clearChat();
                }}
                style={({ pressed }) => [styles.clear, pressed && styles.pressed]}
              >
                <Feather name="trash-2" size={15} color={colors.textSecondary} />
              </Pressable>
            ) : undefined
          }
        />

        <View style={styles.scrollWrapper}>
          <ScrollView
            ref={scrollRef}
            style={styles.flex}
            contentContainerStyle={styles.messages}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          >
            {chat.length === 0 ? (
              <View style={styles.intro}>
                <View style={styles.introIcon}>
                  <Text style={styles.introEmoji}>{'✨'}</Text>
                </View>
                <Text variant="sectionTitle" center>
                  Ask about your own data
                </Text>
                <Text variant="small" color={colors.textSecondary} center style={styles.introBody}>
                  I only work from what is recorded in Lifely — your day, habits, goals, credits and
                  reflections. If something is not logged, I will say so rather than guess.
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.flex} />
                {chat.map((message) => (
                  <AIMessage key={message.id} message={message} onSuggestion={send} />
                ))}
              </>
            )}

            {thinking ? <AIThinking /> : null}
          </ScrollView>
        </View>

        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
          {/* Quick actions */}
          {chat.length === 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickActions}
              keyboardShouldPersistTaps="handled"
            >
              {AI_QUICK_ACTIONS.map((action) => (
                <Chip
                  key={action}
                  label={action}
                  size="md"
                  color={colors.primaryDark}
                  background={colors.primaryTint}
                  onPress={() => void send(action)}
                />
              ))}
            </ScrollView>
          ) : null}

          {/* Composer */}
          <View style={styles.composer}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Ask about your day, habits or goals"
            placeholderTextColor={colors.textTertiary}
            accessibilityLabel="Message the assistant"
            style={styles.input}
            multiline
            maxLength={500}
            onSubmitEditing={() => void send(input)}
            returnKeyType="send"
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send"
            accessibilityState={{ disabled: !input.trim() || thinking }}
            disabled={!input.trim() || thinking}
            onPress={() => void send(input)}
            style={({ pressed }) => [
              styles.send,
              (!input.trim() || thinking) && styles.sendDisabled,
              pressed && styles.pressed,
            ]}
          >
            <Feather name="arrow-up" size={18} color={colors.textInverse} />
          </Pressable>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open settings to review data controls"
          onPress={() => router.push('/settings')}
          style={styles.privacyNote}
        >
          <Feather name="lock" size={10} color={colors.textTertiary} />
          <Text variant="meta">Private to your account · Data controls in Settings</Text>
        </Pressable>
      </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollWrapper: { flex: 1, minHeight: 0 },
  root: { flex: 1, backgroundColor: colors.background },
  footer: { backgroundColor: colors.background },
  messages: {
    flexGrow: 1,
    paddingHorizontal: SCREEN_PADDING,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  intro: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.huge, gap: spacing.sm },
  introIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  introEmoji: { fontSize: 24, lineHeight: 30 },
  introBody: { maxWidth: 300 },
  clear: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActions: {
    paddingHorizontal: SCREEN_PADDING,
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: spacing.sm,
  },
  input: {
    flex: 1,
    minHeight: MIN_TOUCH + 4,
    maxHeight: 120,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.text,
  },
  send: {
    width: MIN_TOUCH + 4,
    height: MIN_TOUCH + 4,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...elevation.xs,
  },
  sendDisabled: { backgroundColor: colors.borderStrong },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingBottom: spacing.sm,
  },
  pressed: { opacity: 0.8 },
});
