import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { isAuthValidationCode } from '@collectify/contracts';

export function useAuthValidationErrorFormatter() {
  const { t } = useTranslation();

  return useCallback(
    (message: string) => {
      if (!isAuthValidationCode(message)) {
        return message;
      }

      return t(`auth.validation.${message}`);
    },
    [t],
  );
}
