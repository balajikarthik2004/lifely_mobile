import {
  addDays,
  differenceInCalendarDays,
  eachDayOfInterval,
  format,
  isSameDay,
  parseISO,
  startOfWeek,
  subDays,
} from 'date-fns';

import type { ISODate } from '@/types';

export const DATE_KEY = 'yyyy-MM-dd';

export function toKey(date: Date | string): ISODate {
  return typeof date === 'string' ? date.slice(0, 10) : format(date, DATE_KEY);
}

export function todayKey(): ISODate {
  return toKey(new Date());
}

export function fromKey(key: ISODate): Date {
  return parseISO(`${key}T00:00:00`);
}

export function lastNDays(n: number, endDate = new Date()): ISODate[] {
  return eachDayOfInterval({ start: subDays(endDate, n - 1), end: endDate }).map(toKey);
}

export function currentWeekKeys(reference = new Date()): ISODate[] {
  const start = startOfWeek(reference, { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) => toKey(addDays(start, i)));
}

export function formatTime(iso: string): string {
  return format(new Date(iso), 'h:mm a');
}

export function formatClock(iso: string): string {
  return format(new Date(iso), 'HH:mm');
}

export function formatLongDate(date: Date = new Date()): string {
  return format(date, 'EEEE, MMMM d');
}

export function formatShortDate(key: ISODate): string {
  return format(fromKey(key), 'MMM d');
}

export function weekdayLetter(key: ISODate): string {
  return format(fromKey(key), 'EEEEE');
}

export function minutesBetween(startIso: string, endIso: string): number {
  return Math.max(0, Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000));
}

export function formatDuration(minutes: number): string {
  if (minutes <= 0) return '0m';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function formatHours(minutes: number): string {
  return `${(minutes / 60).toFixed(1)}h`;
}

export function greetingFor(date = new Date()): string {
  const h = date.getHours();
  if (h < 5) return 'Still up';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function greetingEmoji(date = new Date()): string {
  const h = date.getHours();
  if (h < 5) return '\u{1F319}';
  if (h < 12) return '\u2600\uFE0F';
  if (h < 17) return '\u{1F324}\uFE0F';
  return '\u{1F30C}';
}

export function daysUntil(key: ISODate): number {
  return differenceInCalendarDays(fromKey(key), new Date());
}

export { addDays, format, isSameDay, subDays };
