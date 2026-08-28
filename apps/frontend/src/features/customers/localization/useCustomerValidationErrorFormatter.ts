import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { isCustomerValidationCode } from '@collectify/contracts';

export function useCustomerValidationErrorFormatter() {
  const { t } = useTranslation();

  return useCallback(
    (message: string) => {
      if (!isCustomerValidationCode(message)) {
        return message;
      }

      return t(`customers.validation.${message}`);
    },
    [t],
  );
}
