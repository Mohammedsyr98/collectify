import { describe, expect, it } from 'vitest';

import { getIstanbulBusinessDate } from './istanbul-business-date';

describe('Istanbul business date', () => {
  it('uses the Istanbul calendar date across UTC midnight boundaries', () => {
    expect(
      getIstanbulBusinessDate(new Date('2026-09-10T20:59:59.000Z')),
    ).toBe('2026-09-10');

    expect(
      getIstanbulBusinessDate(new Date('2026-09-10T21:00:00.000Z')),
    ).toBe('2026-09-11');
  });
});
