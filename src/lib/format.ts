export function formatCredits(n: number): string {
  const sign = n > 0 ? '+' : n < 0 ? '\u2212' : '';
  return `${sign}${Math.abs(n).toLocaleString('en-US')}`;
}

export function formatNumber(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}

export function formatPercent(n: number): string {
  return `${Math.round(n)}%`;
}

export function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
