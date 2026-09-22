import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Field, Text } from '@/components';
import { haptic } from '@/lib/haptics';
import { useAuthStore } from '@/store/useAuthStore';
import { colors, radius, spacing } from '@/theme';

type Mode = 'signIn' | 'signUp';

/** The server's own rule, stated up front rather than after a failed attempt. */
const MIN_PASSWORD = 10;

export default function SignInScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const signIn = useAuthStore((s) => s.signIn);
  const signUp = useAuthStore((s) => s.signUp);
  const busy = useAuthStore((s) => s.busy);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);

  const [mode, setMode] = useState<Mode>('signIn');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const creating = mode === 'signUp';

  const emailLooksValid = /^\S+@\S+\.\S+$/.test(email.trim());
  const passwordLongEnough = creating ? password.length >= MIN_PASSWORD : password.length > 0;
  const canSubmit = emailLooksValid && passwordLongEnough && !busy;

  const switchMode = () => {
    haptic.tap();
    clearError();
    setMode(creating ? 'signIn' : 'signUp');
  };

  const submit = async () => {
    if (!canSubmit) return;
    haptic.tap();

    const ok = creating
      ? await signUp(email, password, name)
      : await signIn(email, password);

    if (ok) {
      haptic.success();
      // The index route decides between onboarding and the dashboard once the
      // account has loaded.
      router.replace('/');
    } else {
      haptic.warning();
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
      <ScrollView
        contentContainerStyle={[styles.root, { paddingTop: insets.top }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.intro}>
          <Text style={styles.mark}>🌱</Text>
          <Text variant="screenTitle" center>{creating ? 'Start your Lifely' : 'Welcome back'}</Text>
          <Text variant="small" color={colors.textSecondary} center>
            {creating
              ? 'Your tasks, habits, goals and credits live on your account, so they follow you to any device.'
              : 'Sign in to pick up exactly where you left off.'}
          </Text>
        </View>

        <View style={styles.form}>
          {creating ? (
            <Field
              label="Your name"
              value={name}
              onChangeText={setName}
              placeholder="What should we call you?"
              autoCapitalize="words"
              autoComplete="name"
              maxLength={80}
            />
          ) : null}

          <Field
            label="Email"
            value={email}
            onChangeText={(value) => {
              clearError();
              setEmail(value);
            }}
            placeholder="you@example.com"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            autoComplete="email"
            inputMode="email"
          />

          <Field
            label="Password"
            value={password}
            onChangeText={(value) => {
              clearError();
              setPassword(value);
            }}
            placeholder={creating ? `At least ${MIN_PASSWORD} characters` : 'Your password'}
            secureTextEntry
            autoCapitalize="none"
            autoComplete={creating ? 'new-password' : 'current-password'}
            hint={
              creating
                ? 'Length matters more than symbols — a short phrase you will remember beats P@ssw0rd.'
                : undefined
            }
          />

          {error ? (
            <View style={styles.error}>
              <Text variant="small" color={colors.danger}>
                {error}
              </Text>
            </View>
          ) : null}

          <Button
            label={creating ? 'Create account' : 'Sign in'}
            size="lg"
            fullWidth
            loading={busy}
            disabled={!canSubmit}
            onPress={submit}
          />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={creating ? 'Sign in instead' : 'Create an account instead'}
            onPress={switchMode}
            style={({ pressed }) => [styles.switch, pressed && styles.pressed]}
          >
            <Text variant="small" color={colors.textSecondary}>
              {creating ? 'Already have an account? ' : 'New here? '}
              <Text variant="smallStrong" color={colors.primaryDeep}>
                {creating ? 'Sign in' : 'Create one'}
              </Text>
            </Text>
          </Pressable>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  root: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
    gap: spacing.xxl,
    justifyContent: 'center',
  },
  intro: { gap: spacing.sm, alignItems: 'center' },
  mark: { fontSize: 56, lineHeight: 64, marginBottom: spacing.md },
  form: { gap: spacing.lg },
  error: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.dangerTint,
  },
  switch: { alignItems: 'center', paddingVertical: spacing.sm },
  pressed: { opacity: 0.7 },
});
