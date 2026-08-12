import type { SupportedLocale } from '../../shared/localization';

export const appShellResources = {
  en: {
    common: {
      app: {
        status: {
          checkingSession: {
            detail: 'Looking for an active owner session.',
            title: 'Checking session',
          },
          ownerSetupIncomplete: {
            detail: 'Complete owner setup before entering the workspace.',
            title: 'Owner setup incomplete',
          },
          sessionUnavailable: {
            detail: 'Unable to reach backend.',
            title: 'Session unavailable',
          },
        },
        workspace: {
          currencyLabel: 'Currency',
          emailLabel: 'Email',
          languageLabel: 'Language',
          subtitle: 'Protected Collectify workspace',
          title: 'Owner session active',
        },
      },
    },
  },
  tr: {
    common: {
      app: {
        status: {
          checkingSession: {
            detail: 'Etkin bir sahip oturumu aran\u0131yor.',
            title: 'Oturum kontrol ediliyor',
          },
          ownerSetupIncomplete: {
            detail:
              '\u00c7al\u0131\u015fma alan\u0131na girmeden \u00f6nce sahip kurulumunu tamamlay\u0131n.',
            title: 'Sahip kurulumu eksik',
          },
          sessionUnavailable: {
            detail: 'Arka u\u00e7 servisine ula\u015f\u0131lam\u0131yor.',
            title: 'Oturum kullan\u0131lam\u0131yor',
          },
        },
        workspace: {
          currencyLabel: 'Para birimi',
          emailLabel: 'E-posta',
          languageLabel: 'Dil',
          subtitle: 'Korunan Collectify \u00e7al\u0131\u015fma alan\u0131',
          title: 'Sahip oturumu etkin',
        },
      },
    },
  },
} satisfies Record<
  SupportedLocale,
  { common: { app: Record<string, unknown> } }
>;
