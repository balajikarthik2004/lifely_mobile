import { accents, type AccentName } from '@/theme';
import type { Category, Priority, RewardCategory } from '@/types';

interface CategoryMeta {
  label: string;
  icon: string;
  accent: AccentName;
}

export const CATEGORY_META: Record<Category, CategoryMeta> = {
  WORK: { label: 'Work', icon: '\u{1F4BB}', accent: 'sky' },
  HEALTH: { label: 'Health', icon: '\u{1F3CB}\uFE0F', accent: 'coral' },
  LEARNING: { label: 'Learning', icon: '\u{1F4DA}', accent: 'violet' },
  PERSONAL: { label: 'Personal', icon: '\u{1F331}', accent: 'mint' },
  FAMILY: { label: 'Family', icon: '\u2764\uFE0F', accent: 'rose' },
  FINANCE: { label: 'Finance', icon: '\u{1F4B0}', accent: 'amber' },
  TRAVEL: { label: 'Travel', icon: '\u2708\uFE0F', accent: 'teal' },
  OTHER: { label: 'Other', icon: '\u2728', accent: 'slate' },
};

/**
 * Fixed drawing order for categorical charts.
 *
 * The order is the colourblind-safety mechanism, not decoration: adjacent
 * slices/series were validated pairwise in exactly this sequence. Charts must
 * render categories in this order and never re-sort by magnitude, so a
 * category also keeps its colour when the data changes.
 */
export const CATEGORY_SERIES_ORDER: Category[] = [
  'WORK',
  'PERSONAL',
  'LEARNING',
  'FINANCE',
  'FAMILY',
  'TRAVEL',
  'HEALTH',
  'OTHER',
];

export function categoryColor(category: Category) {
  return accents[CATEGORY_META[category].accent];
}

export function categoryLabel(category: Category) {
  return CATEGORY_META[category].label;
}

export function categoryIcon(category: Category) {
  return CATEGORY_META[category].icon;
}

export const PRIORITY_META: Record<Priority, { label: string; accent: AccentName }> = {
  LOW: { label: 'Low', accent: 'slate' },
  MEDIUM: { label: 'Medium', accent: 'sky' },
  HIGH: { label: 'High', accent: 'amber' },
  CRITICAL: { label: 'Critical', accent: 'coral' },
};

export function priorityColor(priority: Priority) {
  return accents[PRIORITY_META[priority].accent];
}

export const REWARD_CATEGORY_META: Record<RewardCategory, { label: string; icon: string }> = {
  ENTERTAINMENT: { label: 'Entertainment', icon: '\u{1F37F}' },
  FOOD: { label: 'Food', icon: '\u{1F37D}\uFE0F' },
  SHOPPING: { label: 'Shopping', icon: '\u{1F6CD}\uFE0F' },
  TRAVEL: { label: 'Travel', icon: '\u{1F3D6}\uFE0F' },
  PERSONAL: { label: 'Personal', icon: '\u{1F381}' },
};

/** Categories that count toward the "health activities" slice of Life Score. */
export const HEALTH_CATEGORIES: Category[] = ['HEALTH'];

/** Categories treated as productive time in analytics. */
export const PRODUCTIVE_CATEGORIES: Category[] = ['WORK', 'LEARNING', 'HEALTH', 'FINANCE'];
