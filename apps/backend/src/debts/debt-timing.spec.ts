import { describe, expect, it } from 'vitest';

import {
  getIstanbulBusinessDate,
  getScheduleItemTiming,
} from './debt-timing';

describe('debt timing', () => {
  it('uses the Istanbul calendar date across UTC midnight boundaries', () => {
    expect(
      getIstanbulBusinessDate(new Date('2026-09-10T20:59:59.000Z')),
    ).toBe('2026-09-10');

    expect(
      getIstanbulBusinessDate(new Date('2026-09-10T21:00:00.000Z')),
    ).toBe('2026-09-11');
  });

  it('classifies a schedule date relative to one Istanbul business date', () => {
    const operationInstant = new Date('2026-09-10T12:00:00.000Z');

    expect(getScheduleItemTiming('2026-09-11', operationInstant)).toBe(
      'upcoming',
    );
    expect(getScheduleItemTiming('2026-09-10', operationInstant)).toBe(
      'dueToday',
    );
    expect(getScheduleItemTiming('2026-09-09', operationInstant)).toBe(
      'overdue',
    );
  });
});
