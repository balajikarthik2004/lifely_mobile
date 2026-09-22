import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  Button,
  Card,
  EmptyState,
  Screen,
  ScreenHeader,
  SCREEN_PADDING,
  Text,
} from '@/components';
import { formatShortDate, todayKey } from '@/lib/date';
import { useAppStore } from '@/store/useAppStore';
import { colors, radius, spacing } from '@/theme';

const MOOD_EMOJI = ['\u{1F622}', '\u{1F615}', '\u{1F610}', '\u{1F642}', '\u{1F604}'];

export default function ReflectionsScreen() {
  const router = useRouter();
  const reflections = useAppStore((s) => s.reflections);

  const sorted = [...reflections].sort((a, b) => (a.date < b.date ? 1 : -1));
  const hasToday = reflections.some((r) => r.date === todayKey());

  return (
    <Screen>
      <ScreenHeader
        title="Reflections"
        subtitle="The part of the record that is not a number."
      />

      {!hasToday ? (
        <View style={styles.block}>
          <Button
            label="Write today’s reflection"
            icon="feather"
            fullWidth
            onPress={() => router.push('/reflection')}
          />
        </View>
      ) : null}

      <View style={styles.list}>
        {sorted.length === 0 ? (
          <Card>
            <EmptyState
              emoji={'\u{1F4D3}'}
              title="Nothing written yet"
              body="A couple of lines at the end of the day is enough. Patterns show up faster than you would expect."
              actionLabel="Write one now"
              onAction={() => router.push('/reflection')}
            />
          </Card>
        ) : (
          sorted.map((reflection) => (
            <Pressable
              key={reflection.id}
              accessibilityRole="button"
              accessibilityLabel={`Reflection for ${formatShortDate(reflection.date)}`}
              onPress={() =>
                router.push({ pathname: '/reflection', params: { date: reflection.date } })
              }
              style={({ pressed }) => [styles.card, pressed && styles.pressed]}
            >
              <View style={styles.cardHeader}>
                <Text variant="cardTitle">{formatShortDate(reflection.date)}</Text>
                <View style={styles.moodBadge}>
                  <Text style={styles.moodEmoji}>{MOOD_EMOJI[reflection.mood - 1]}</Text>
                </View>
              </View>

              {reflection.wentWell ? (
                <View style={styles.entry}>
                  <Text variant="overline">Went well</Text>
                  <Text variant="body" numberOfLines={3}>
                    {reflection.wentWell}
                  </Text>
                </View>
              ) : null}

              {reflection.learned ? (
                <View style={styles.entry}>
                  <Text variant="overline">Learned</Text>
                  <Text variant="body" numberOfLines={2}>
                    {reflection.learned}
                  </Text>
                </View>
              ) : null}

              {reflection.tomorrow ? (
                <View style={styles.tomorrow}>
                  <Text variant="small" color={colors.primaryDark}>
                    {'→'} {reflection.tomorrow}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          ))
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  block: { paddingHorizontal: SCREEN_PADDING, marginBottom: spacing.lg },
  list: { paddingHorizontal: SCREEN_PADDING, gap: spacing.md, marginBottom: spacing.lg },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  moodBadge: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moodEmoji: { fontSize: 17, lineHeight: 22 },
  entry: { gap: 3 },
  tomorrow: {
    backgroundColor: colors.primaryTint,
    borderRadius: radius.sm,
    padding: spacing.md,
  },
  pressed: { opacity: 0.93 },
});
