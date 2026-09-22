import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptic } from '@/lib/haptics';
import { colors, HIT_SLOP, MIN_TOUCH, radius, spacing } from '@/theme';

import { Text } from './Text';

export const SCREEN_PADDING = spacing.xl;

interface ScreenProps {
  children: ReactNode;
  /** Extra bottom padding so content clears the floating tab bar. */
  tabBarPadding?: boolean;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  scrollProps?: Omit<ScrollViewProps, 'children'>;
  background?: string;
}

export function Screen({
  children,
  tabBarPadding = false,
  scroll = true,
  contentStyle,
  scrollProps,
  background = colors.background,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const paddingBottom = (tabBarPadding ? 108 : spacing.xxl) + insets.bottom;

  if (!scroll) {
    return (
      <View style={[styles.root, { backgroundColor: background, paddingTop: insets.top }]}>
        <StatusBar style="dark" />
        <View style={[styles.flex, contentStyle]}>{children}</View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: background }]}>
      <StatusBar style="dark" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="never"
        {...scrollProps}
        contentContainerStyle={[
          { paddingTop: insets.top + spacing.sm, paddingBottom },
          contentStyle,
          scrollProps?.contentContainerStyle,
        ]}
      >
        {children}
      </ScrollView>
    </View>
  );
}

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: ReactNode;
  large?: boolean;
}

/** Consistent header for every pushed (non-tab) screen. */
export function ScreenHeader({ title, subtitle, onBack, right, large = true }: ScreenHeaderProps) {
  const router = useRouter();

  const back = () => {
    haptic.tap();
    if (onBack) onBack();
    else if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  };

  return (
    <View style={styles.header}>
      <View style={styles.headerRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={HIT_SLOP}
          onPress={back}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <Feather name="chevron-left" size={22} color={colors.text} />
        </Pressable>
        <View style={styles.headerRight}>{right}</View>
      </View>
      <Text variant={large ? 'screenTitle' : 'sectionTitle'} style={styles.headerTitle}>
        {title}
      </Text>
      {subtitle ? (
        <Text variant="small" color={colors.textSecondary} style={styles.headerSubtitle}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

interface SectionHeaderProps {
  title: string;
  action?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function SectionHeader({ title, action, onAction, style }: SectionHeaderProps) {
  return (
    <View style={[styles.section, style]}>
      <Text variant="sectionTitle">{title}</Text>
      {action ? (
        <Pressable
          accessibilityRole="button"
          hitSlop={HIT_SLOP}
          onPress={() => {
            haptic.tap();
            onAction?.();
          }}
          style={({ pressed }) => [styles.sectionAction, pressed && styles.pressed]}
        >
          <Text variant="smallStrong" color={colors.primaryDark}>
            {action}
          </Text>
          <Feather name="chevron-right" size={15} color={colors.primaryDark} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  header: {
    paddingHorizontal: SCREEN_PADDING,
    paddingBottom: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    minHeight: MIN_TOUCH,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  backButton: {
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    marginLeft: -spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: Platform.OS === 'web' ? 'transparent' : undefined,
  },
  headerTitle: { marginBottom: 2 },
  headerSubtitle: { maxWidth: '92%' },
  section: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SCREEN_PADDING,
    marginBottom: spacing.md,
  },
  sectionAction: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  pressed: { opacity: 0.6 },
});
