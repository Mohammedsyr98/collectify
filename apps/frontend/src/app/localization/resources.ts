import type { Resource } from 'i18next';

import { authApiErrorTranslations } from '../../features/auth/localization/authApiErrorTranslations';
import { authValidationTranslations } from '../../features/auth/localization/authValidationTranslations';

export const appI18nResources = {
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
        togglePassword: {
          hide: 'Hide password',
          show: 'Show password',
        },
        validation: authValidationTranslations.en,
      },
      locale: {
        english: 'English',
        turkish: 'Turkish',
      },
      toast: {
        auth: {
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
        errors: authApiErrorTranslations.tr,
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
        validation: authValidationTranslations.tr,
      },
      locale: {
        english: '\u0130ngilizce',
        turkish: 'T\u00fcrk\u00e7e',
      },
      toast: {
        auth: {
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
    },
  },
} satisfies Resource;
