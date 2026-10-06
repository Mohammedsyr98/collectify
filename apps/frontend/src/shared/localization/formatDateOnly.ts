export function formatDateOnly(value: string | undefined, locale: string): string {
  if (!value) {
    return '';
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00.000Z`));
}
