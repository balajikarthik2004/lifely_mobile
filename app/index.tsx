import { Redirect } from 'expo-router';
import { StyleSheet, View } from 'react-native';

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
    return <View style={styles.root} />;
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  message: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
});
