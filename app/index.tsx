import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button, Text } from '@/components';
import { useAppStore } from '@/store/useAppStore';
import { useAuthStore } from '@/store/useAuthStore';
import { colors, spacing } from '@/theme';

/**
 * Entry gate: sign-in, then onboarding, then the dashboard.
 *
 * `onboarded` comes from the account rather than the device, so a returning
 * user on a new phone lands straight on their dashboard.
 */
export default function Index() {
  const authStatus = useAuthStore((s) => s.status);
  const status = useAppStore((s) => s.status);
  const syncError = useAppStore((s) => s.syncError);
  const onboarded = useAppStore((s) => s.onboarded);

  if (authStatus !== 'signedIn') return <Redirect href="/sign-in" />;

  // The account is signed in but its data has not arrived yet, so there is
  // nothing truthful to show — including whether onboarding is needed.
  if (status === 'idle' || status === 'loading') {
    return <Loading />;
  }

  if (status === 'error') {
    return (
      <View style={[styles.root, styles.message]}>
        <Text variant="sectionTitle" center>
          Cannot reach your account
        </Text>
        <Text variant="small" color={colors.textSecondary} center>
          {syncError ?? 'The server did not answer.'}
        </Text>
        <Button
          label="Try again"
          onPress={() => {
            void useAppStore.getState().bootstrap();
          }}
        />
        <Button
          label="Sign out"
          variant="ghost"
          onPress={() => {
            void useAuthStore.getState().signOut();
          }}
        />
      </View>
    );
  }

  return <Redirect href={onboarded ? '/(tabs)' : '/onboarding'} />;
}

/**
 * The wait while the account loads.
 *
 * A host that sleeps when idle can take most of a minute to answer its first
 * request, and a bare screen for that long reads as a hang. The explanation
 * only appears once the wait is long enough to need one, so an ordinary warm
 * start still shows nothing but a spinner.
 */
function Loading() {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), 4000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={[styles.root, styles.message]}>
      <ActivityIndicator color={colors.textSecondary} />
      {slow ? (
        <Text variant="small" color={colors.textSecondary} center>
          Waking the server up. This can take up to a minute after a quiet spell.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  message: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
});
