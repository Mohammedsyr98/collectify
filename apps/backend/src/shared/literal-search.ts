import { sql, type AnyColumn } from 'drizzle-orm';

export function caseInsensitiveLiteralSubstring(
  column: AnyColumn,
  search: string,
) {
  return sql`lower(${column}) like ${`%${escapeLikePattern(search.toLowerCase())}%`} escape '\\'`;
}

function escapeLikePattern(value: string): string {
  return value.replaceAll('\\', '\\\\').replaceAll('%', '\\%').replaceAll('_', '\\_');
}
