import '@testing-library/jest-dom/vitest';
import { cleanup, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRef, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PaymentTarget } from '@collectify/contracts';

import { localeStorageKey } from '../../../shared/localization';
import { renderWithAppProviders } from '../../../shared/test/render';
import { PaymentDrawer } from '../editor/PaymentDrawer';
import { paymentResources } from '../localization/resources';
import { renderPaymentDrawer } from './paymentDrawerTestUtils';
import { createPaymentTargetFixture } from './paymentTestData';

const paymentMessages = paymentResources.en.common.payments;

describe('PaymentDrawer', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.lang = '';
    document.documentElement.removeAttribute('dir');
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('closes with Escape and returns focus to the opening button', async () => {
    const user = userEvent.setup();
    const target = createPaymentTargetFixture();

    renderWithAppProviders(<PaymentDrawerHarness target={target} />);
    const openButton = screen.getByRole('button', { name: 'Open payment' });
    await user.click(openButton);

    expect(
      screen.getByRole('dialog', { name: paymentMessages.drawer.title }),
    ).toBeInTheDocument();
    await user.keyboard('{Escape}');

    expect(
      screen.queryByRole('dialog', { name: paymentMessages.drawer.title }),
    ).not.toBeInTheDocument();
    expect(openButton).toHaveFocus();
  });

  it('renders the payment drawer in Arabic right-to-left mode', () => {
    window.localStorage.setItem(localeStorageKey, 'ar');

    renderPaymentDrawer(createPaymentTargetFixture());

    expect(document.documentElement).toHaveAttribute('dir', 'rtl');
    expect(
      screen.getByRole('dialog', {
        name: paymentResources.ar.common.payments.drawer.title,
      }),
    ).toBeInTheDocument();
  });
});

function PaymentDrawerHarness({ target }: { target: PaymentTarget }) {
  const [isOpen, setIsOpen] = useState(false);
  const openButtonRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button ref={openButtonRef} onClick={() => setIsOpen(true)} type="button">
        Open payment
      </button>
      {isOpen ? (
        <PaymentDrawer
          customerId="customer_123"
          initialTarget={target}
          onClose={() => setIsOpen(false)}
          onSubmit={async () => undefined}
          returnFocusTarget={openButtonRef.current}
        />
      ) : null}
    </>
  );
}
