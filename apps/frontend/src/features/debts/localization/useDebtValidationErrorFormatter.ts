import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { isDebtValidationCode } from '@collectify/contracts';

export function useDebtValidationErrorFormatter() {
  const { t } = useTranslation();

  return useCallback(
    (message: string) => {
      if (!isDebtValidationCode(message)) {
        return message;
      }

      return t(`debts.validation.${message}`);
    },
    [t],
  );
}
