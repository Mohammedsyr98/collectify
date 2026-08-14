import { useCallback } from 'react';

import type { OwnerProfile } from '@collectify/contracts';

import { useLocalization } from '../../../shared/localization';

type OwnerProfileLanguage = Pick<OwnerProfile, 'preferredLanguage'>;

export function useOwnerProfileLanguageSync() {
  const { locale, setLocale } = useLocalization();

  function isOwnerProfileLanguageSynced(
    ownerProfile: OwnerProfileLanguage | null | undefined,
  ) {
    return !ownerProfile || ownerProfile.preferredLanguage === locale;
  }

  const syncOwnerProfileLanguage = useCallback(
    async (ownerProfile: OwnerProfileLanguage | null | undefined) => {
      if (!ownerProfile || ownerProfile.preferredLanguage === locale) {
        return;
      }

      await setLocale(ownerProfile.preferredLanguage);
    },
    [locale, setLocale],
  );

  return {
    isOwnerProfileLanguageSynced,
    syncOwnerProfileLanguage,
  };
}
