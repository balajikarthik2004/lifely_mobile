import { Feather } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import { haptic } from '@/lib/haptics';
import { colors, elevation, radius, spacing } from '@/theme';

/** Derived from expo-router's own Tabs so the prop type can never drift. */
type TabBarProps = Parameters<NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>>[0];

const TABS = [
  { name: 'index', label: 'Home', icon: 'home' },
  { name: 'timeline', label: 'Timeline', icon: 'clock' },
  { name: 'insights', label: 'Insights', icon: 'bar-chart-2' },
  { name: 'profile', label: 'Profile', icon: 'user' },
] as const;

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <FloatingTabBar {...props} />}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="timeline" options={{ title: 'Timeline' }} />
      <Tabs.Screen name="insights" options={{ title: 'Insights' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}

/**
 * Custom bar so the quick-add button can sit in the middle as a raised control
 * (spec section 4) rather than as a fifth tab.
 */
function FloatingTabBar({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const go = (routeName: string, index: number) => {
    haptic.select();
    const event = navigation.emit({
      type: 'tabPress',
      target: state.routes[index].key,
      canPreventDefault: true,
    });
    if (!event.defaultPrevented) navigation.navigate(routeName);
  };

  const left = TABS.slice(0, 2);
  const right = TABS.slice(2);

  const renderTab = (tab: (typeof TABS)[number]) => {
    const index = state.routes.findIndex((route) => route.name === tab.name);
    const focused = state.index === index;
    return (
      <Pressable
        key={tab.name}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={tab.label}
        onPress={() => go(tab.name, index)}
        style={styles.tab}
      >
        <Feather
          name={tab.icon}
          size={20}
          color={focused ? colors.primaryDark : colors.textTertiary}
        />
        <Text
          variant="meta"
          weight={focused ? 'semibold' : 'medium'}
          color={focused ? colors.primaryDark : colors.textTertiary}
          style={styles.tabLabel}
        >
          {tab.label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
      <View style={[styles.bar, elevation.lg]}>
        {left.map(renderTab)}

        <View style={styles.addSlot}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add something"
            onPress={() => {
              haptic.heavy();
              router.push('/quick-add');
            }}
            style={({ pressed }) => [styles.addButton, elevation.md, pressed && styles.addPressed]}
          >
            <Feather name="plus" size={26} color={colors.textInverse} />
          </Pressable>
        </View>

        {right.map(renderTab)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.lg,
    backgroundColor: 'transparent',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  tab: { flex: 1, alignItems: 'center', gap: 3, paddingVertical: 2, minHeight: 44, justifyContent: 'center' },
  tabLabel: { fontSize: 10, lineHeight: 13 },
  addSlot: { width: 74, alignItems: 'center' },
  addButton: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -26,
  },
  addPressed: { transform: [{ scale: 0.95 }], opacity: 0.94 },
});
