import { describe, expect, it } from 'vitest';

import { moneySchema } from './money.js';

describe('money contracts', () => {
  it('accepts the maximum NUMERIC(18,2) money value', () => {
    expect(moneySchema.parse('9999999999999999.99')).toBe(
      '9999999999999999.99',
    );
  });

  it('rejects an amount beyond NUMERIC(18,2) precision', () => {
    expect(moneySchema.safeParse('10000000000000000.00').success).toBe(false);
  });

  it.each(['1', '1.2', ' 1.20 ', '-1.00'])(
    'rejects a non-money representation: %s',
    (amount) => {
      expect(moneySchema.safeParse(amount).success).toBe(false);
    },
  );
});
