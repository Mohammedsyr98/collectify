import { describe, expect, it } from 'vitest';

import { createAppI18nInstance } from './i18n';

describe('appI18nResources', () => {
  it('composes English app, auth, and shared resources', () => {
    const i18n = createAppI18nInstance('en');

    expect(i18n.t('app.workspace.title')).toBe('Owner session active');
    expect(i18n.t('auth.signIn.submit')).toBe('Enter workspace');
    expect(i18n.t('auth.toast.signIn.successTitle')).toBe('Signed in');
    expect(i18n.t('locale.turkish')).toBe('Turkish');
    expect(i18n.t('errors.genericDescription')).toBe(
      'Something went wrong. Try again.',
    );
  });

  it('composes Turkish app, auth, and shared resources', () => {
    const i18n = createAppI18nInstance('tr');

    expect(i18n.t('app.workspace.subtitle')).toBe(
      'Korunan Collectify \u00e7al\u0131\u015fma alan\u0131',
    );
    expect(i18n.t('auth.signIn.submit')).toBe(
      '\u00c7al\u0131\u015fma alan\u0131na gir',
    );
    expect(i18n.t('auth.toast.signUp.successDescription')).toBe(
      'Collectify \u00e7al\u0131\u015fma alan\u0131n\u0131z haz\u0131r.',
    );
    expect(i18n.t('locale.english')).toBe('\u0130ngilizce');
    expect(i18n.t('errors.genericDescription')).toBe(
      'Bir \u015feyler ters gitti. Tekrar deneyin.',
    );
  });
});
