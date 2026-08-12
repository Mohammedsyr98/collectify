import type { SupportedLocale } from '../../../shared/localization';

import { authApiErrorTranslations } from './authApiErrorTranslations';
import { authValidationTranslations } from './authValidationTranslations';

export const authResources = {
  en: {
    common: {
      auth: {
        errors: authApiErrorTranslations.en,
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
        toast: {
          signIn: {
            errorTitle: 'Could not sign in',
            successDescription: 'Welcome back to Collectify.',
            successTitle: 'Signed in',
          },
          signUp: {
            errorTitle: 'Could not create account',
            successDescription: 'Your Collectify workspace is ready.',
            successTitle: 'Account created',
          },
        },
        togglePassword: {
          hide: 'Hide password',
          show: 'Show password',
        },
        validation: authValidationTranslations.en,
      },
    },
  },
  tr: {
    common: {
      auth: {
        errors: authApiErrorTranslations.tr,
        entry: {
          createAccountTab: 'Hesap olu\u015ftur',
          showCreateAccountForm: 'Hesap olu\u015fturma formunu g\u00f6ster',
          signIn: {
            subtitle:
              'Collectify\u2019a girmek i\u00e7in sahip bilgilerinizi kullan\u0131n.',
            title: 'Giri\u015f yap',
          },
          signInTab: 'Giri\u015f yap',
          signUp: {
            subtitle:
              'Collectify \u00e7al\u0131\u015fma alan\u0131n\u0131z i\u00e7in sahip profilini olu\u015fturun.',
            title: 'Hesap olu\u015ftur',
          },
        },
        shell: {
          secureSession:
            'Verileriniz \u015fifreli oturum \u00e7erezleriyle korunur.',
        },
        signIn: {
          emailLabel: 'E-posta adresi',
          emailPlaceholder: 'sahip@example.com',
          passwordLabel: '\u015eifre',
          passwordPlaceholder: '\u015eifreniz',
          submit: '\u00c7al\u0131\u015fma alan\u0131na gir',
          submitting: 'Giri\u015f yap\u0131l\u0131yor',
        },
        signUp: {
          currencyLabel: 'Varsay\u0131lan para birimi',
          emailLabel: 'E-posta adresi',
          emailPlaceholder: 'sahip@example.com',
          languageLabel: 'Aray\u00fcz dili',
          nameLabel: 'Ad',
          namePlaceholder: 'Ada Lovelace',
          passwordLabel: '\u015eifre',
          passwordPlaceholder: 'En az 8 karakter',
          submit: 'Hesap olu\u015ftur',
          submitting: 'Hesap olu\u015fturuluyor',
        },
        toast: {
          signIn: {
            errorTitle: 'Giri\u015f yap\u0131lamad\u0131',
            successDescription: 'Collectify\u2019a tekrar ho\u015f geldiniz.',
            successTitle: 'Giri\u015f yap\u0131ld\u0131',
          },
          signUp: {
            errorTitle: 'Hesap olu\u015fturulamad\u0131',
            successDescription:
              'Collectify \u00e7al\u0131\u015fma alan\u0131n\u0131z haz\u0131r.',
            successTitle: 'Hesap olu\u015fturuldu',
          },
        },
        togglePassword: {
          hide: '\u015eifreyi gizle',
          show: '\u015eifreyi g\u00f6ster',
        },
        validation: authValidationTranslations.tr,
      },
    },
  },
} satisfies Record<
  SupportedLocale,
  { common: { auth: Record<string, unknown> } }
>;
