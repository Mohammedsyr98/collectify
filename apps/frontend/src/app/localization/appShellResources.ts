import type { SupportedLocale } from '../../shared/localization';

export const appShellResources = {
  en: {
    common: {
      app: {
        loading: {
          ariaLabel: 'Loading Collectify',
        },
        error: {
          retry: 'Try again',
          sessionUnavailable: {
            detail: 'Try again in a moment.',
            title: "We couldn't load Collectify",
          },
        },
        status: {
          ownerSetupIncomplete: {
            detail: 'Complete owner setup before entering the workspace.',
            title: 'Owner setup incomplete',
          },
        },
        workspace: {
          currencyLabel: 'Currency',
          emailLabel: 'Email',
          languageLabel: 'Language',
          nameLabel: 'Name',
          signOut: 'Sign out',
          signOutErrorTitle: 'Could not sign out',
          signingOut: 'Signing out',
          subtitle: 'Protected Collectify workspace',
          title: 'Owner session active',
        },
      },
    },
  },
  tr: {
    common: {
      app: {
        loading: {
          ariaLabel: 'Collectify y\u00fckleniyor',
        },
        error: {
          retry: 'Tekrar dene',
          sessionUnavailable: {
            detail: 'Birazdan tekrar deneyin.',
            title: 'Collectify y\u00fcklenemedi',
          },
        },
        status: {
          ownerSetupIncomplete: {
            detail:
              '\u00c7al\u0131\u015fma alan\u0131na girmeden \u00f6nce sahip kurulumunu tamamlay\u0131n.',
            title: 'Sahip kurulumu eksik',
          },
        },
        workspace: {
          currencyLabel: 'Para birimi',
          emailLabel: 'E-posta',
          languageLabel: 'Dil',
          nameLabel: 'Ad',
          signOut: 'Oturumu kapat',
          signOutErrorTitle: 'Oturum kapat\u0131lamad\u0131',
          signingOut: 'Oturum kapat\u0131l\u0131yor',
          subtitle: 'Korunan Collectify \u00e7al\u0131\u015fma alan\u0131',
          title: 'Sahip oturumu etkin',
        },
      },
    },
  },
  ar: {
    common: {
      app: {
        loading: {
          ariaLabel: 'جارٍ تحميل Collectify',
        },
        error: {
          retry: 'حاول مرة أخرى',
          sessionUnavailable: {
            detail: 'حاول مرة أخرى بعد قليل.',
            title: 'تعذر تحميل Collectify',
          },
        },
        status: {
          ownerSetupIncomplete: {
            detail: 'أكمل إعداد المالك قبل الدخول إلى مساحة العمل.',
            title: 'إعداد المالك غير مكتمل',
          },
        },
        workspace: {
          currencyLabel: 'العملة',
          emailLabel: 'البريد الإلكتروني',
          languageLabel: 'اللغة',
          nameLabel: 'الاسم',
          signOut: 'تسجيل الخروج',
          signOutErrorTitle: 'تعذر تسجيل الخروج',
          signingOut: 'جارٍ تسجيل الخروج',
          subtitle: 'مساحة عمل Collectify المحمية',
          title: 'جلسة المالك نشطة',
        },
      },
    },
  },
} satisfies Record<
  SupportedLocale,
  { common: { app: Record<string, unknown> } }
>;
