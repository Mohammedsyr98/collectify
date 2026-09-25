import { describe, expect, it } from 'vitest';

import { getScheduleItemTiming } from './debt-timing';

describe('debt timing', () => {
  it('classifies a schedule date relative to one Istanbul business date', () => {
    expect(getScheduleItemTiming('2026-09-11', '2026-09-10')).toBe('upcoming');
    expect(getScheduleItemTiming('2026-09-10', '2026-09-10')).toBe('dueToday');
    expect(getScheduleItemTiming('2026-09-09', '2026-09-10')).toBe('overdue');
  });
});
