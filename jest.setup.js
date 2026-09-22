/* eslint-env jest */

// AsyncStorage is a native module; the store only needs it to resolve.
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => undefined),
  removeItem: jest.fn(async () => undefined),
}));

// Haptics are fire-and-forget side effects with no bearing on logic.
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  selectionAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning' },
}));

/**
 * Reanimated runs on a native worklet runtime that does not exist under Jest,
 * and its own shipped mock still loads that runtime. This stands in for it:
 * components render their final (settled) state, which is exactly what we want
 * to assert against.
 */
jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { View, Text, ScrollView, Image } = require('react-native');

  // Entering/exiting animations are chainable builders; every method returns
  // the builder so `FadeIn.duration(300).delay(60).springify()` keeps working.
  const builder = () => {
    const chainable = {};
    const methods = [
      'duration',
      'delay',
      'springify',
      'damping',
      'stiffness',
      'mass',
      'easing',
      'withInitialValues',
      'build',
      'randomDelay',
    ];
    methods.forEach((method) => {
      chainable[method] = () => chainable;
    });
    return chainable;
  };

  const passthrough = (Component) => {
    const Wrapped = React.forwardRef((props, ref) => {
      const { entering, exiting, layout, animatedProps, ...rest } = props;
      return React.createElement(Component, { ...rest, ...(animatedProps ?? {}), ref });
    });
    Wrapped.displayName = `Animated(${Component.displayName ?? Component.name ?? 'Component'})`;
    return Wrapped;
  };

  const Animated = {
    View: passthrough(View),
    Text: passthrough(Text),
    ScrollView: passthrough(ScrollView),
    Image: passthrough(Image),
    createAnimatedComponent: passthrough,
  };

  const settle = (value) => value;

  return {
    __esModule: true,
    default: Animated,
    ...Animated,
    useSharedValue: (initial) => ({ value: initial }),
    useAnimatedStyle: (factory) => factory(),
    useAnimatedProps: (factory) => factory(),
    useDerivedValue: (factory) => ({ value: factory() }),
    withTiming: settle,
    withSpring: settle,
    withDelay: (_, value) => value,
    withSequence: (...values) => values[values.length - 1],
    withRepeat: (value) => value,
    runOnJS: (fn) => fn,
    runOnUI: (fn) => fn,
    Easing: { linear: () => 0, ease: () => 0, out: () => 0, inOut: () => 0 },
    FadeIn: builder(),
    FadeOut: builder(),
    FadeInUp: builder(),
    FadeInDown: builder(),
    FadeInRight: builder(),
    FadeOutUp: builder(),
    FadeOutDown: builder(),
    SlideInDown: builder(),
    SlideOutDown: builder(),
    Layout: builder(),
  };
});
