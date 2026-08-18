import { describe, expect, it } from 'vitest';

import { supportedLocales } from '../../shared/localization';

import { createAppI18nInstance } from './i18n';
import { appI18nResources } from './resources';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function flattenResourceKeys(resource: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(resource).flatMap(([key, value]) => {
    const resourceKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === 'string') {
      return [resourceKey];
    }

    if (isRecord(value)) {
      return flattenResourceKeys(value, resourceKey);
    }

    return [];
  });
}

const expectedResourceKeys = flattenResourceKeys(appI18nResources.en.common).sort();

describe('appI18nResources', () => {
  it.each(supportedLocales)(
    'composes complete app, auth, and shared resources for %s',
    (locale) => {
      const localeResourceKeys = flattenResourceKeys(appI18nResources[locale].common).sort();
      const i18n = createAppI18nInstance(locale);

      expect(localeResourceKeys).toEqual(expectedResourceKeys);

      for (const resourceKey of expectedResourceKeys) {
        const translatedValue = i18n.t(resourceKey, { lng: locale });

        expect(i18n.exists(resourceKey, { lng: locale })).toBe(true);
        expect(translatedValue).not.toBe(resourceKey);
        expect(translatedValue.trim()).not.toBe('');
      }
    },
  );
});
