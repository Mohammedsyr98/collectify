import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { SegmentedControl } from './SegmentedControl';

const options = [
  { label: 'Create account', value: 'sign-up' },
  { label: 'Sign in', value: 'sign-in' },
] as const;

function ControlledSegmentedControl() {
  const [value, setValue] = useState<(typeof options)[number]['value']>('sign-up');

  return (
    <SegmentedControl
      ariaLabel="Account access"
      onChange={setValue}
      options={options}
      value={value}
    />
  );
}

describe('SegmentedControl', () => {
  afterEach(() => {
    cleanup();
  });

  it('exposes one pressed option and updates the selection when clicked', async () => {
    const user = userEvent.setup();
    render(<ControlledSegmentedControl />);

    const createAccount = screen.getByRole('button', { name: 'Create account' });
    const signIn = screen.getByRole('button', { name: 'Sign in' });

    expect(createAccount).toHaveAttribute('aria-pressed', 'true');
    expect(signIn).toHaveAttribute('aria-pressed', 'false');

    await user.click(signIn);

    expect(createAccount).toHaveAttribute('aria-pressed', 'false');
    expect(signIn).toHaveAttribute('aria-pressed', 'true');
  });
});
