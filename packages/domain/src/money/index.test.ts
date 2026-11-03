import { describe, expect, it } from 'vitest';

import {
  formatMoney,
  isMoneyWithinNumeric182Precision,
  parseMoney,
} from './index.js';

describe('money', () => {
  it('adds decimal amounts exactly at cent boundaries', () => {
    expect(
      formatMoney(parseMoney('0.10') + parseMoney('0.20')),
    ).toBe('0.30');
  });

  it('normalizes whole and fractional input to canonical cents', () => {
    expect(formatMoney(parseMoney('0001.2'))).toBe('1.20');
  });

  it('identifies the NUMERIC(18,2) persistence boundary', () => {
    expect(isMoneyWithinNumeric182Precision('9999999999999999.99')).toBe(
      true,
    );
    expect(isMoneyWithinNumeric182Precision('10000000000000000.00')).toBe(
      false,
    );
  });

  it('keeps arithmetic independent from persistence precision', () => {
    expect(formatMoney(parseMoney('10000000000000000.00'))).toBe(
      '10000000000000000.00',
    );
  });
});
