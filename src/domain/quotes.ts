const QUOTES = [
  'Discipline today creates the life you want tomorrow.',
  'Small steps, taken daily, beat big steps taken rarely.',
  'You do not rise to your goals. You fall to your systems.',
  'The quiet hours are where the work actually happens.',
  'Progress is a direction, not a speed.',
  'Protect your attention. It is the whole game.',
  'Consistency is the compound interest of character.',
  'A good day is mostly a well-defended morning.',
];

/** Stable per-day rotation so the quote does not flicker on every render. */
export function quoteForDate(dateKey: string): string {
  const seed = dateKey.split('-').reduce((sum, part) => sum + Number(part), 0);
  return QUOTES[seed % QUOTES.length];
}
