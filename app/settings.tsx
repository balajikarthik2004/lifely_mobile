import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, View } from 'react-native';

import {
  Button,
  Card,
  Field,
  Screen,
  ScreenHeader,
  SCREEN_PADDING,
  SectionHeader,
  Stepper,
  Text,
} from '@/components';
import { haptic } from '@/lib/haptics';
import { useAppStore } from '@/store/useAppStore';
import { useAuthStore } from '@/store/useAuthStore';
import { colors, MIN_TOUCH, radius, spacing } from '@/theme';
import type { NotificationPrefs } from '@/types';

const AVATARS = ['\u{1F331}', '\u{1F680}', '\u{1F3AF}', '\u{1F9D8}', '\u{1F4DA}', '\u{1F3CB}️', '\u{1F98A}', '\u{1F41B}'];

const NOTIFICATION_ROWS: { key: keyof NotificationPrefs; label: string; caption: string }[] = [
  { key: 'morningBrief', label: 'Morning brief', caption: 'What today looks like, once.' },
  { key: 'habitReminders', label: 'Habit reminders', caption: 'Only at the times you set.' },
  { key: 'focusReminders', label: 'Focus reminders', caption: 'Ten minutes before a planned block.' },
  { key: 'eveningReflection', label: 'Evening reflection', caption: 'A nudge to close out the day.' },
  { key: 'weeklyReview', label: 'Weekly review', caption: 'Sunday evening summary.' },
];

export default function SettingsScreen() {
  const router = useRouter();

  const profile = useAppStore((s) => s.profile);
  const rules = useAppStore((s) => s.creditRules);
  const notifications = useAppStore((s) => s.notifications);
  const updateProfile = useAppStore((s) => s.updateProfile);
  const updateCreditRules = useAppStore((s) => s.updateCreditRules);
  const updateNotifications = useAppStore((s) => s.updateNotifications);
  const loadSampleData = useAppStore((s) => s.loadSampleData);
  const resetEverything = useAppStore((s) => s.resetEverything);
  const email = useAuthStore((s) => s.user?.email);
  const signOut = useAuthStore((s) => s.signOut);
  const deleteAccount = useAuthStore((s) => s.deleteAccount);

  const [working, setWorking] = useState(false);

  const [name, setName] = useState(profile.name);
  const [statement, setStatement] = useState(profile.statement);

  const saveProfile = () => {
    haptic.success();
    updateProfile({ name: name.trim() || 'Friend', statement: statement.trim() });
  };

  const confirmReset = () => {
    Alert.alert(
      'Empty your account?',
      'Every task, habit, goal, activity, credit and reflection is deleted from your account, on every device. Your login stays. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete all data',
          style: 'destructive',
          onPress: async () => {
            setWorking(true);
            await resetEverything();
            setWorking(false);
            router.replace('/onboarding');
          },
        },
      ],
    );
  };

  const confirmDeleteAccount = () => {
    Alert.alert(
      'Delete your account?',
      'The account itself and everything in it is removed for good. You will need to sign up again to use Lifely.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete account',
          style: 'destructive',
          onPress: async () => {
            setWorking(true);
            await deleteAccount();
            router.replace('/sign-in');
          },
        },
      ],
    );
  };

  const confirmSignOut = () => {
    Alert.alert('Sign out?', 'Your data stays on your account and will be here when you return.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        onPress: async () => {
          await signOut();
          router.replace('/sign-in');
        },
      },
    ]);
  };

  const confirmSample = () => {
    Alert.alert(
      'Load sample data?',
      'This replaces everything in your account with a demo fortnight.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Load it',
          onPress: async () => {
            setWorking(true);
            await loadSampleData();
            setWorking(false);
            router.replace('/(tabs)');
          },
        },
      ],
    );
  };

  return (
    <Screen>
      <ScreenHeader title="Settings" />

      {/* Profile */}
      <SectionHeader title="You" />
      <View style={styles.block}>
        <Card>
          <View style={styles.form}>
            <View style={styles.group}>
              <Text variant="smallStrong" color={colors.textSecondary}>
                Avatar
              </Text>
              <View style={styles.avatarRow}>
                {AVATARS.map((emoji) => (
                  <Pressable
                    key={emoji}
                    accessibilityRole="button"
                    accessibilityState={{ selected: emoji === profile.avatarEmoji }}
                    accessibilityLabel={`Avatar ${emoji}`}
                    onPress={() => {
                      haptic.select();
                      updateProfile({ avatarEmoji: emoji });
                    }}
                    style={[styles.avatar, emoji === profile.avatarEmoji && styles.avatarActive]}
                  >
                    <Text style={styles.avatarText}>{emoji}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <Field label="Name" value={name} onChangeText={setName} placeholder="Your name" />
            <Field
              label="Personal statement"
              value={statement}
              onChangeText={setStatement}
              placeholder="Building a better me."
            />
            <Button label="Save profile" variant="secondary" fullWidth onPress={saveProfile} />
          </View>
        </Card>
      </View>

      {/* Schedule */}
      <SectionHeader title="Your usual hours" />
      <View style={styles.block}>
        <Card>
          <Text variant="small" color={colors.textSecondary} style={styles.cardIntro}>
            The assistant uses these when it drafts a plan for tomorrow.
          </Text>
          <View style={styles.form}>
            <View style={styles.row}>
              <Field
                label="Wake"
                value={profile.wakeTime}
                onChangeText={(v) => updateProfile({ wakeTime: v })}
                placeholder="06:30"
                maxLength={5}
                containerStyle={styles.flex}
              />
              <Field
                label="Sleep"
                value={profile.sleepTime}
                onChangeText={(v) => updateProfile({ sleepTime: v })}
                placeholder="22:30"
                maxLength={5}
                containerStyle={styles.flex}
              />
            </View>
            <View style={styles.row}>
              <Field
                label="Work starts"
                value={profile.workStart}
                onChangeText={(v) => updateProfile({ workStart: v })}
                placeholder="09:00"
                maxLength={5}
                containerStyle={styles.flex}
              />
              <Field
                label="Work ends"
                value={profile.workEnd}
                onChangeText={(v) => updateProfile({ workEnd: v })}
                placeholder="18:00"
                maxLength={5}
                containerStyle={styles.flex}
              />
            </View>
          </View>
        </Card>
      </View>

      {/* Credit rules */}
      <SectionHeader title="Credit values" />
      <View style={styles.block}>
        <Card>
          <Text variant="small" color={colors.textSecondary} style={styles.cardIntro}>
            What each kind of action is worth. Changing these affects new entries only — your history
            keeps the values it was earned at.
          </Text>
          <View style={styles.form}>
            <Stepper
              label="Normal task"
              value={rules.taskMedium}
              onChange={(v) => updateCreditRules({ taskMedium: v, taskLow: v })}
              step={1}
              max={50}
            />
            <View style={styles.divider} />
            <Stepper
              label="Important task"
              value={rules.taskHigh}
              onChange={(v) => updateCreditRules({ taskHigh: v })}
              step={1}
              max={50}
            />
            <View style={styles.divider} />
            <Stepper
              label="Critical task"
              value={rules.taskCritical}
              onChange={(v) => updateCreditRules({ taskCritical: v })}
              step={1}
              max={50}
            />
            <View style={styles.divider} />
            <Stepper
              label="Per 30 min focus"
              value={rules.focusPer30Min}
              onChange={(v) => updateCreditRules({ focusPer30Min: v })}
              step={1}
              max={50}
            />
            <View style={styles.divider} />
            <Stepper
              label="Daily reflection"
              value={rules.reflection}
              onChange={(v) => updateCreditRules({ reflection: v })}
              step={1}
              max={50}
            />
          </View>
        </Card>
      </View>

      {/* Notifications */}
      <SectionHeader title="Notifications" />
      <View style={styles.block}>
        <Card padded={false}>
          {NOTIFICATION_ROWS.map((row, index) => (
            <View
              key={row.key}
              style={[styles.switchRow, index < NOTIFICATION_ROWS.length - 1 && styles.switchBorder]}
            >
              <View style={styles.switchBody}>
                <Text variant="bodyStrong">{row.label}</Text>
                <Text variant="meta">{row.caption}</Text>
              </View>
              <Switch
                value={notifications[row.key]}
                onValueChange={(value) => {
                  haptic.select();
                  updateNotifications({ [row.key]: value });
                }}
                trackColor={{ true: colors.primary, false: colors.borderStrong }}
                thumbColor={colors.surface}
                accessibilityLabel={row.label}
              />
            </View>
          ))}
        </Card>
      </View>

      {/* Privacy */}
      <SectionHeader title="Privacy & data" />
      <View style={styles.block}>
        <Card>
          <View style={styles.privacyRow}>
            <Feather name="lock" size={15} color={colors.primaryDark} />
            <Text variant="body" style={styles.flex}>
              Everything you record is stored on your own Lifely account, so it is there on any device
              you sign in from. It is never shared with anyone else, and the assistant reads only the
              summary described on its screen.
            </Text>
          </View>
          <View style={styles.privacyRow}>
            <Feather name="eye-off" size={15} color={colors.primaryDark} />
            <Text variant="body" style={styles.flex}>
              Lifely never reads your location, health data, contacts or screen activity. Those would
              require asking you first, every time.
            </Text>
          </View>
        </Card>
      </View>

      {/* Account */}
      <View style={styles.block}>
        <SectionHeader title="Account" />
        <Card>
          <Text variant="small" color={colors.textSecondary}>
            Signed in as
          </Text>
          <Text variant="body" weight="semibold">
            {email ?? 'this device'}
          </Text>
        </Card>
      </View>
      <View style={styles.block}>
        <Button label="Sign out" variant="secondary" fullWidth icon="log-out" onPress={confirmSignOut} />
      </View>

      {/* Data */}
      <View style={styles.block}>
        <Button
          label="Load sample data"
          variant="secondary"
          fullWidth
          icon="database"
          loading={working}
          onPress={confirmSample}
        />
      </View>
      <View style={styles.block}>
        <Button
          label="Delete all my data"
          variant="danger"
          fullWidth
          icon="trash-2"
          loading={working}
          onPress={confirmReset}
        />
      </View>
      <View style={styles.block}>
        <Button
          label="Delete my account"
          variant="danger"
          fullWidth
          icon="user-x"
          loading={working}
          onPress={confirmDeleteAccount}
        />
      </View>

      <Text variant="meta" center style={styles.version}>
        Lifely 1.0.0
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  block: { paddingHorizontal: SCREEN_PADDING, marginBottom: spacing.lg },
  form: { gap: spacing.lg },
  group: { gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.md },
  cardIntro: { marginBottom: spacing.lg },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  avatarRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  avatar: {
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceSunken,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  avatarActive: { borderColor: colors.primary, backgroundColor: colors.primaryTint },
  avatarText: { fontSize: 20, lineHeight: 25 },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 60,
  },
  switchBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  switchBody: { flex: 1, gap: 1 },
  privacyRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start', marginBottom: spacing.lg },
  version: { marginBottom: spacing.xl },
});
