import i18next, { type i18n } from 'i18next';
import { initReactI18next } from 'react-i18next';

import { defaultLocale, supportedLocales, type SupportedLocale } from './locales';

const defaultNamespace = 'common';

const resources = {
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
      auth: {
        entry: {
          createAccountTab: 'Create account',
          showCreateAccountForm: 'Show create account form',
          signIn: {
            subtitle: 'Use your owner credentials to enter Collectify.',
            title: 'Sign in',
          },
          signInTab: 'Sign in',
          signUp: {
            subtitle: 'Set up the owner profile for your Collectify workspace.',
            title: 'Create account',
          },
        },
        shell: {
          secureSession: 'Your data is protected with encrypted session cookies.',
        },
        signIn: {
          emailLabel: 'Email address',
          emailPlaceholder: 'owner@example.com',
          passwordLabel: 'Password',
          passwordPlaceholder: 'Your password',
          submit: 'Enter workspace',
          submitting: 'Signing in',
        },
        signUp: {
          currencyLabel: 'Default currency',
          emailLabel: 'Email address',
          emailPlaceholder: 'owner@example.com',
          languageLabel: 'Interface language',
          nameLabel: 'Name',
          namePlaceholder: 'Ada Lovelace',
          passwordLabel: 'Password',
          passwordPlaceholder: 'At least 8 characters',
          submit: 'Create account',
          submitting: 'Creating account',
        },
        togglePassword: {
          hide: 'Hide password',
          show: 'Show password',
        },
      },
      locale: {
        english: 'English',
        turkish: 'Turkish',
      },
      toast: {
        auth: {
          apiErrors: {
            ACCOUNT_ALREADY_EXISTS: 'An account already exists for this email.',
            INVALID_CREDENTIALS: 'Email or password is incorrect.',
            OWNER_PROFILE_MISSING: 'Owner profile setup is incomplete.',
            PROFILE_SETUP_FAILED: 'We could not finish owner setup. Try again.',
            VALIDATION_ERROR: 'Check the highlighted fields.',
          },
          signIn: {
            errorDescription: 'Unable to sign in. Try again.',
            errorTitle: 'Could not sign in',
            successDescription: 'Welcome back to Collectify.',
            successTitle: 'Signed in',
          },
          signUp: {
            errorDescription: 'Unable to create owner account. Try again.',
            errorTitle: 'Could not create account',
            successDescription: 'Your Collectify workspace is ready.',
            successTitle: 'Account created',
          },
        },
      },
      validation: {
        AUTH_DEFAULT_CURRENCY_UNSUPPORTED: 'Choose TRY, USD, or EUR.',
        AUTH_EMAIL_INVALID: 'Enter a valid email address.',
        AUTH_NAME_REQUIRED: 'Name is required.',
        AUTH_PREFERRED_LANGUAGE_UNSUPPORTED: 'Choose English or Turkish.',
        AUTH_SIGN_IN_PASSWORD_REQUIRED: 'Password is required.',
        AUTH_SIGN_UP_PASSWORD_LENGTH:
          'Password must be between 8 and 128 characters.',
      },
    },
  },
  tr: {
    common: {
      app: {
        status: {
          checkingSession: {
            detail: 'Etkin bir sahip oturumu aranıyor.',
            title: 'Oturum kontrol ediliyor',
          },
          ownerSetupIncomplete: {
            detail: 'Çalışma alanına girmeden önce sahip kurulumunu tamamlayın.',
            title: 'Sahip kurulumu eksik',
          },
          sessionUnavailable: {
            detail: 'Arka uç servisine ulaşılamıyor.',
            title: 'Oturum kullanılamıyor',
          },
        },
        workspace: {
          currencyLabel: 'Para birimi',
          emailLabel: 'E-posta',
          languageLabel: 'Dil',
          subtitle: 'Korunan Collectify çalışma alanı',
          title: 'Sahip oturumu etkin',
        },
      },
      auth: {
        entry: {
          createAccountTab: 'Hesap oluştur',
          showCreateAccountForm: 'Hesap oluşturma formunu göster',
          signIn: {
            subtitle: 'Collectify’a girmek için sahip bilgilerinizi kullanın.',
            title: 'Giriş yap',
          },
          signInTab: 'Giriş yap',
          signUp: {
            subtitle: 'Collectify çalışma alanınız için sahip profilini oluşturun.',
            title: 'Hesap oluştur',
          },
        },
        shell: {
          secureSession: 'Verileriniz şifreli oturum çerezleriyle korunur.',
        },
        signIn: {
          emailLabel: 'E-posta adresi',
          emailPlaceholder: 'sahip@example.com',
          passwordLabel: 'Şifre',
          passwordPlaceholder: 'Şifreniz',
          submit: 'Çalışma alanına gir',
          submitting: 'Giriş yapılıyor',
        },
        signUp: {
          currencyLabel: 'Varsayılan para birimi',
          emailLabel: 'E-posta adresi',
          emailPlaceholder: 'sahip@example.com',
          languageLabel: 'Arayüz dili',
          nameLabel: 'Ad',
          namePlaceholder: 'Ada Lovelace',
          passwordLabel: 'Şifre',
          passwordPlaceholder: 'En az 8 karakter',
          submit: 'Hesap oluştur',
          submitting: 'Hesap oluşturuluyor',
        },
        togglePassword: {
          hide: 'Şifreyi gizle',
          show: 'Şifreyi göster',
        },
      },
      locale: {
        english: '\u0130ngilizce',
        turkish: 'T\u00fcrk\u00e7e',
      },
      toast: {
        auth: {
          apiErrors: {
            ACCOUNT_ALREADY_EXISTS:
              'Bu e-posta adresiyle zaten bir hesap var.',
            INVALID_CREDENTIALS: 'E-posta veya \u015fifre hatal\u0131.',
            OWNER_PROFILE_MISSING: 'Sahip profili kurulumu eksik.',
            PROFILE_SETUP_FAILED:
              'Sahip kurulumu tamamlanamad\u0131. Tekrar deneyin.',
            VALIDATION_ERROR: 'Vurgulanan alanlar\u0131 kontrol edin.',
          },
          signIn: {
            errorDescription: 'Giriş yapılamadı. Tekrar deneyin.',
            errorTitle: 'Giriş yapılamadı',
            successDescription: 'Collectify’a tekrar hoş geldiniz.',
            successTitle: 'Giriş yapıldı',
          },
          signUp: {
            errorDescription: 'Sahip hesabı oluşturulamadı. Tekrar deneyin.',
            errorTitle: 'Hesap oluşturulamadı',
            successDescription: 'Collectify çalışma alanınız hazır.',
            successTitle: 'Hesap oluşturuldu',
          },
        },
      },
      validation: {
        AUTH_DEFAULT_CURRENCY_UNSUPPORTED: 'TRY, USD veya EUR se\u00e7in.',
        AUTH_EMAIL_INVALID: 'Ge\u00e7erli bir e-posta adresi girin.',
        AUTH_NAME_REQUIRED: 'Ad gereklidir.',
        AUTH_PREFERRED_LANGUAGE_UNSUPPORTED:
          '\u0130ngilizce veya T\u00fcrk\u00e7e se\u00e7in.',
        AUTH_SIGN_IN_PASSWORD_REQUIRED: '\u015eifre gereklidir.',
        AUTH_SIGN_UP_PASSWORD_LENGTH:
          '\u015eifre 8 ile 128 karakter aras\u0131nda olmal\u0131d\u0131r.',
      },
    },
  },
} as const;

export function createI18nInstance(initialLocale: SupportedLocale): i18n {
  const instance = i18next.createInstance();

  void instance.use(initReactI18next).init({
    defaultNS: defaultNamespace,
    fallbackLng: defaultLocale,
    initAsync: false,
    interpolation: {
      escapeValue: false,
    },
    lng: initialLocale,
    ns: [defaultNamespace],
    resources,
    supportedLngs: [...supportedLocales],
  });

  return instance;
}
