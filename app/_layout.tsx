import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ToastHost } from '@/components/ui';
import { requestPermissionsAsync, scheduleDailyReminder, setupNotificationHandler } from '@/lib/notifications';
import { useAppStore } from '@/store/useAppStore';
import { useAuthStore } from '@/store/useAuthStore';
import { colors } from '@/theme';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const hydrated = useAppStore((s) => s.hydrated);
  const authStatus = useAuthStore((s) => s.status);
  const restore = useAuthStore((s) => s.restore);

  // One attempt at picking the stored session back up, before anything renders.
  useEffect(() => {
    void restore();
  }, [restore]);

  /**
   * The account's data is loaded when a session appears and dropped when it
   * goes, so nothing from one account can ever be on screen under another.
   */
  useEffect(() => {
    if (authStatus === 'signedIn') {
      void useAppStore.getState().bootstrap();
      setupNotificationHandler();
      requestPermissionsAsync().then((granted) => {
        if (granted) {
          scheduleDailyReminder(20, 0);
        }
      });
    }
    if (authStatus === 'signedOut') useAppStore.getState().clearLocal();
  }, [authStatus]);

  const ready = (fontsLoaded || Boolean(fontError)) && hydrated && authStatus !== 'restoring';

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  const onLayout = useCallback(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return <View style={styles.root} />;

  return (
    <GestureHandlerRootView style={styles.root} onLayout={onLayout}>
      <SafeAreaProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="sign-in" options={{ animation: 'fade', gestureEnabled: false }} />
          <Stack.Screen name="onboarding" options={{ animation: 'fade', gestureEnabled: false }} />
          <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
          <Stack.Screen
            name="quick-add"
            options={{ presentation: 'transparentModal', animation: 'fade' }}
          />
          <Stack.Screen name="task-editor" options={{ presentation: 'modal' }} />
          <Stack.Screen name="habit-editor" options={{ presentation: 'modal' }} />
          <Stack.Screen name="goal-editor" options={{ presentation: 'modal' }} />
          <Stack.Screen name="reward-editor" options={{ presentation: 'modal' }} />
          <Stack.Screen name="activity-editor" options={{ presentation: 'modal' }} />
          <Stack.Screen name="focus" options={{ presentation: 'fullScreenModal' }} />
        </Stack>
        <ToastHost />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
});
