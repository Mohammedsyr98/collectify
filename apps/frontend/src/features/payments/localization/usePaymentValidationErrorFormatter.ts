import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import {
  isPaymentApiErrorCode,
  paymentValidationCodes,
} from '@collectify/contracts';

const paymentValidationCodeSet = new Set<string>(paymentValidationCodes);

export function usePaymentValidationErrorFormatter() {
  const { t } = useTranslation();

  return useCallback(
    (message: string) =>
      paymentValidationCodeSet.has(message)
        ? t(`payments.validation.${message}`)
        : isPaymentApiErrorCode(message)
          ? t(`payments.errors.${message}`)
          : message,
    [t],
  );
}
