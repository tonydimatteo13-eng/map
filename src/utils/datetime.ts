const RELATIVE_FORMATTER = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
const DATE_FORMATTER = new Intl.DateTimeFormat('en', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit'
});

const units: Array<{ unit: Intl.RelativeTimeFormatUnit; ms: number }> = [
  { unit: 'year', ms: 1000 * 60 * 60 * 24 * 365 },
  { unit: 'month', ms: 1000 * 60 * 60 * 24 * 30 },
  { unit: 'week', ms: 1000 * 60 * 60 * 24 * 7 },
  { unit: 'day', ms: 1000 * 60 * 60 * 24 },
  { unit: 'hour', ms: 1000 * 60 * 60 },
  { unit: 'minute', ms: 1000 * 60 },
  { unit: 'second', ms: 1000 }
];

export function formatRelativeTime(value: string | Date | number): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown';
  }

  const now = Date.now();
  const diff = date.getTime() - now;

  for (const { unit, ms } of units) {
    if (Math.abs(diff) >= ms || unit === 'second') {
      const amount = Math.round(diff / ms);
      return RELATIVE_FORMATTER.format(amount, unit);
    }
  }

  return 'Recently';
}

export function formatDateTime(value: string | Date | number): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown';
  }
  return DATE_FORMATTER.format(date);
}
