import { DEFAULT_CREDIT_RULES } from '@/domain/credits';
import { DEFAULT_WEIGHTS } from '@/domain/lifeScore';
import type { CreditRules, LifeScoreWeights, NotificationPrefs, UserProfile } from '@/types';

export const DEFAULT_PROFILE: UserProfile = {
  name: 'Friend',
  statement: 'Building a better me.',
  avatarEmoji: '\u{1F331}',
  focusAreas: ['WORK', 'HEALTH', 'LEARNING'],
  wakeTime: '06:30',
  workStart: '09:00',
  workEnd: '18:00',
  sleepTime: '22:30',
};

export const DEFAULT_NOTIFICATIONS: NotificationPrefs = {
  morningBrief: true,
  habitReminders: true,
  focusReminders: true,
  eveningReflection: true,
  weeklyReview: true,
};

export const DEFAULT_RULES: CreditRules = DEFAULT_CREDIT_RULES;
export const DEFAULT_SCORE_WEIGHTS: LifeScoreWeights = DEFAULT_WEIGHTS;
