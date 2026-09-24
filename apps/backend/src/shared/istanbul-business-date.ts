const istanbulDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Istanbul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function getIstanbulBusinessDate(at: Date): string {
  const parts = Object.fromEntries(
    istanbulDateFormatter
      .formatToParts(at)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  ) as Record<'year' | 'month' | 'day', string>;

  return `${parts.year}-${parts.month}-${parts.day}`;
}
