import { vi } from 'vitest';

import type { PaymentTarget } from '@collectify/contracts';

import { renderWithAppProviders } from '../../../shared/test/render';
import type { PaymentSubmissionRequest } from '../api/record-payment';
import { PaymentDrawer } from '../ui/editor/PaymentDrawer';

export function renderPaymentDrawer(
  target: PaymentTarget,
  onSubmit: ((request: PaymentSubmissionRequest) => Promise<void>) | undefined = async () =>
    undefined,
  onClose: () => void = vi.fn(),
) {
  return renderWithAppProviders(
    <PaymentDrawer
      customerId="customer_123"
      initialTarget={target}
      onClose={onClose}
      onSubmit={onSubmit}
    />,
  );
}
