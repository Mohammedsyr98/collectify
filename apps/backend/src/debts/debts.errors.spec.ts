import { describe, expect, it } from 'vitest';

import { resolveDebtValidationMessage } from './debts.errors';

describe('resolveDebtValidationMessage', () => {
  it('resolves a debt validation code to a human-readable message', () => {
    expect(resolveDebtValidationMessage('DEBT_DUE_DATE_INVALID')).toBe(
      'Enter a valid due date.',
    );
  });

  it('preserves an unknown validation message', () => {
    expect(resolveDebtValidationMessage('Unexpected validation message')).toBe(
      'Unexpected validation message',
    );
  });
});
