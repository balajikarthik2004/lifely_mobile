import { useEffect } from 'react';
import { AccessibilityInfo, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

import { clamp } from '@/lib/format';
import { colors, radius } from '@/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/* --------------------------------------------------------------------- */
/* Linear                                                                 */
/* --------------------------------------------------------------------- */

interface ProgressBarProps {
  value: number; // 0–100
  height?: number;
  trackColor?: string;
  fillColor?: string;
  style?: StyleProp<ViewStyle>;
  label?: string;
}

export function ProgressBar({
  value,
  height = 8,
  trackColor = colors.surfaceSunken,
  fillColor = colors.primary,
  style,
  label,
}: ProgressBarProps) {
  const progress = useSharedValue(0);
  const target = clamp(value);

  useEffect(() => {
    progress.value = withTiming(target, { duration: 620 });
  }, [target, progress]);

  const animatedStyle = useAnimatedStyle(() => ({ width: `${progress.value}%` }));

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(target) }}
      style={[styles.track, { height, borderRadius: height / 2, backgroundColor: trackColor }, style]}
    >
      <Animated.View
        style={[
          styles.fill,
          { backgroundColor: fillColor, borderRadius: height / 2 },
          animatedStyle,
        ]}
      />
    </View>
  );
}

/* --------------------------------------------------------------------- */
/* Circular                                                               */
/* --------------------------------------------------------------------- */

interface RingProps {
  value: number; // 0–100
  size?: number;
  strokeWidth?: number;
  trackColor?: string;
  color?: string;
  gradient?: [string, string];
  children?: React.ReactNode;
  label?: string;
}

export function ProgressRing({
  value,
  size = 168,
  strokeWidth = 14,
  trackColor = colors.surfaceSunken,
  color = colors.primary,
  gradient,
  children,
  label,
}: RingProps) {
  const target = clamp(value);
  const radiusValue = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radiusValue;
  const progress = useSharedValue(0);

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (cancelled) return;
      progress.value = reduced ? target : withTiming(target, { duration: 900 });
    });
    return () => {
      cancelled = true;
    };
  }, [target, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value / 100),
  }));

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(target) }}
      style={{ width: size, height: size }}
    >
      <Svg width={size} height={size}>
        {gradient ? (
          <Defs>
            <LinearGradient id="ringGradient" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={gradient[0]} />
              <Stop offset="1" stopColor={gradient[1]} />
            </LinearGradient>
          </Defs>
        ) : null}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radiusValue}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radiusValue}
          stroke={gradient ? 'url(#ringGradient)' : color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.ringCenter]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
    borderRadius: radius.pill,
  },
  fill: {
    height: '100%',
  },
  ringCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
