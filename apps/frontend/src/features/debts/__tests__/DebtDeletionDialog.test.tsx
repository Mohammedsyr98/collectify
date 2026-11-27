import '@testing-library/jest-dom/vitest';
import { cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRef, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithAppProviders } from './render';
import { createDebtFixture } from './debtTestData';
import { DebtDeletionDialog } from '../ui/DebtDeletionDialog';
import { debtResources } from '../localization/resources';

const debtMessages = debtResources.en.common.debts;

describe('DebtDeletionDialog', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.lang = '';
    document.documentElement.removeAttribute('dir');
    Object.defineProperty(window.navigator, 'languages', {
      configurable: true,
      value: ['en-US'],
    });
  });

  afterEach(() => {
    cleanup();
  });

  it.each([
    { paymentCount: 1, closeWithEscape: true },
    { paymentCount: 3, closeWithEscape: false },
  ])(
    'explains why a debt with $paymentCount payment(s) cannot be deleted and offers only Close',
    async ({ paymentCount, closeWithEscape }) => {
      const user = userEvent.setup();
      const onConfirm = vi.fn();
      renderDebtDeletionHarness({ paymentCount, onConfirm });

      const openButton = screen.getByRole('button', { name: 'Open deletion dialog' });
      await user.click(openButton);

      const dialog = await screen.findByRole('dialog', {
        name: debtMessages.delete.paymentBlockedTitle,
      });
      expect(
        within(dialog).getByText(
          paymentCount === 1
            ? debtMessages.delete.paymentBlockedDescriptionOne
            : debtMessages.delete.paymentBlockedDescriptionMany,
        ),
      ).toBeInTheDocument();
      expect(within(dialog).getByText(debtMessages.delete.paymentCountLabel)).toBeInTheDocument();
      expect(within(dialog).getByText(String(paymentCount))).toBeInTheDocument();
      expect(within(dialog).getAllByRole('button')).toHaveLength(1);
      expect(onConfirm).not.toHaveBeenCalled();

      const closeButton = within(dialog).getByRole('button', {
        name: debtMessages.delete.close,
      });
      await waitFor(() => expect(closeButton).toHaveFocus());
      if (closeWithEscape) {
        await user.keyboard('{Escape}');
      } else {
        await user.click(closeButton);
      }

      await waitFor(() => expect(dialog).not.toBeInTheDocument());
      expect(onConfirm).not.toHaveBeenCalled();
      expect(openButton).toHaveFocus();
    },
  );
});

function renderDebtDeletionHarness({
  paymentCount,
  onConfirm,
}: {
  paymentCount: number;
  onConfirm: () => void;
}) {
  function DebtDeletionHarness() {
    const [isOpen, setIsOpen] = useState(false);
    const openButtonRef = useRef<HTMLButtonElement>(null);

    return (
      <>
        <button onClick={() => setIsOpen(true)} ref={openButtonRef} type="button">
          Open deletion dialog
        </button>
        {isOpen ? (
          <DebtDeletionDialog
            debt={createDebtFixture('customer_123', { paymentCount })}
            isDeleting={false}
            onClose={() => setIsOpen(false)}
            onConfirm={onConfirm}
            returnFocusRef={openButtonRef}
          />
        ) : null}
      </>
    );
  }

  return renderWithAppProviders(<DebtDeletionHarness />);
}
