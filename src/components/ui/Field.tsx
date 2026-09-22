import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { haptic } from '@/lib/haptics';
import { colors, fonts, MIN_TOUCH, radius, spacing } from '@/theme';

import { Text } from './Text';

/* --------------------------------------------------------------------- */
/* Text input                                                             */
/* --------------------------------------------------------------------- */

interface FieldProps extends TextInputProps {
  label: string;
  hint?: string;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

export function Field({ label, hint, error, containerStyle, style, ...rest }: FieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.group, containerStyle]}>
      <Text variant="smallStrong" color={colors.textSecondary} style={styles.label}>
        {label}
      </Text>
      <TextInput
        placeholderTextColor={colors.textTertiary}
        accessibilityLabel={label}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...rest}
        style={[
          styles.input,
          rest.multiline && styles.multiline,
          focused && styles.inputFocused,
          error ? styles.inputError : null,
          style,
        ]}
      />
      {error ? (
        <Text variant="meta" color={colors.danger} style={styles.hint}>
          {error}
        </Text>
      ) : hint ? (
        <Text variant="meta" style={styles.hint}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

/* --------------------------------------------------------------------- */
/* Segmented control                                                      */
/* --------------------------------------------------------------------- */

interface SegmentedProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
}

export function Segmented<T extends string>({ options, value, onChange, style }: SegmentedProps<T>) {
  return (
    <View style={[styles.segmented, style]} accessibilityRole="tablist">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => {
              haptic.select();
              onChange(option.value);
            }}
            style={[styles.segment, active && styles.segmentActive]}
          >
            <Text
              variant="smallStrong"
              weight={active ? 'semibold' : 'medium'}
              color={active ? colors.text : colors.textSecondary}
              numberOfLines={1}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* --------------------------------------------------------------------- */
/* Option grid (categories, priorities, icons…)                           */
/* --------------------------------------------------------------------- */

interface OptionGridProps<T extends string> {
  options: { value: T; label: string; icon?: string; color?: string; tint?: string }[];
  value: T | T[];
  onChange: (value: T) => void;
  columns?: number;
}

export function OptionGrid<T extends string>({ options, value, onChange }: OptionGridProps<T>) {
  const selected = Array.isArray(value) ? value : [value];

  return (
    <View style={styles.grid}>
      {options.map((option) => {
        const active = selected.includes(option.value);
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => {
              haptic.select();
              onChange(option.value);
            }}
            style={({ pressed }) => [
              styles.option,
              active && {
                backgroundColor: option.tint ?? colors.primaryTint,
                borderColor: option.color ?? colors.primary,
              },
              pressed && styles.pressed,
            ]}
          >
            {option.icon ? <Text style={styles.optionIcon}>{option.icon}</Text> : null}
            <Text
              variant="smallStrong"
              weight={active ? 'semibold' : 'medium'}
              color={active ? (option.color ?? colors.primaryDark) : colors.textSecondary}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* --------------------------------------------------------------------- */
/* Stepper                                                                */
/* --------------------------------------------------------------------- */

interface StepperProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
  max?: number;
  suffix?: string;
}

export function Stepper({
  label,
  value,
  onChange,
  step = 5,
  min = 0,
  max = 999,
  suffix,
}: StepperProps) {
  const set = (next: number) => {
    haptic.select();
    onChange(Math.min(max, Math.max(min, next)));
  };

  return (
    <View style={styles.stepperRow}>
      <Text variant="bodyStrong">{label}</Text>
      <View style={styles.stepper}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Decrease ${label}`}
          onPress={() => set(value - step)}
          style={({ pressed }) => [styles.stepperButton, pressed && styles.pressed]}
        >
          <Text variant="cardTitle" color={colors.textSecondary}>
            −
          </Text>
        </Pressable>
        <Text variant="bodyStrong" style={styles.stepperValue}>
          {value}
          {suffix ? ` ${suffix}` : ''}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Increase ${label}`}
          onPress={() => set(value + step)}
          style={({ pressed }) => [styles.stepperButton, pressed && styles.pressed]}
        >
          <Text variant="cardTitle" color={colors.textSecondary}>
            +
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.sm },
  label: { marginLeft: 2 },
  input: {
    minHeight: MIN_TOUCH + 4,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.text,
  },
  multiline: {
    minHeight: 96,
    textAlignVertical: 'top',
    paddingTop: spacing.md,
    fontFamily: fonts.regular,
    lineHeight: 22,
  },
  inputFocused: { borderColor: colors.primarySoft, backgroundColor: colors.surface },
  inputError: { borderColor: colors.danger },
  hint: { marginLeft: 2 },

  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSunken,
    borderRadius: radius.md,
    padding: 3,
    gap: 2,
  },
  segment: {
    flex: 1,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
  },
  segmentActive: {
    backgroundColor: colors.surface,
    shadowColor: '#0B1F17',
    shadowOpacity: 0.06,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: MIN_TOUCH,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  optionIcon: { fontSize: 15 },

  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.lg,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSunken,
    borderRadius: radius.md,
    padding: 3,
  },
  stepperButton: {
    width: 38,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
  },
  stepperValue: { minWidth: 62, textAlign: 'center' },
  pressed: { opacity: 0.6 },
});
