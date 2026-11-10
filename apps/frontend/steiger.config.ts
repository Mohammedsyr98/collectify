import { defineConfig } from 'steiger';
import fsd from '@feature-sliced/steiger-plugin';

const customerLegacyFiles = [
  './src/features/customers/__tests__/CustomerCreateModal.test.tsx',
  './src/features/customers/__tests__/CustomerEditModal.test.tsx',
  './src/features/customers/api/create-customer.ts',
  './src/features/customers/api/update-customer.ts',
  './src/features/customers/ui/CustomerForm.tsx',
];

const debtLegacyFiles = [
  './src/features/debts/__tests__/DebtDrawer.payment-plans.test.tsx',
  './src/features/debts/__tests__/DebtDrawer.saved-payment-plans.test.tsx',
  './src/features/debts/__tests__/DebtDrawer.test.tsx',
  './src/features/debts/api/create-debt.ts',
  './src/features/debts/api/delete-debt.ts',
  './src/features/debts/api/replace-debt.ts',
  './src/features/debts/ui/editor/DebtDrawer.tsx',
  './src/features/debts/ui/editor/DebtPlanFields.tsx',
  './src/features/debts/ui/editor/InstallmentPlanFields.tsx',
];

const paymentLegacyFiles = [
  './src/features/payments/__tests__/PaymentDrawer.dialog.test.tsx',
  './src/features/payments/__tests__/PaymentDrawer.target-picker-browsing.test.tsx',
  './src/features/payments/__tests__/PaymentDrawer.target-selection.test.tsx',
  './src/features/payments/__tests__/paymentDrawerTestUtils.tsx',
  './src/features/payments/api/list-payment-targets.test.ts',
  './src/features/payments/api/list-payment-targets.ts',
  './src/features/payments/api/record-payment.ts',
  './src/features/payments/ui/editor/PaymentDrawer.tsx',
  './src/features/payments/ui/editor/PaymentTargetPicker.tsx',
  './src/features/payments/model/paymentQueries.ts',
];

// App providers, localization composition, and shared test rendering retain
// their current seams until the test-support migration is handled separately.
const appAndSharedLegacyFiles = [
  './src/app/AppProviders.tsx',
  './src/app/localization/resources.ts',
  './src/shared/test/render.tsx',
];

// These existing App-localization files keep their original relative Shared
// imports. New App files must use the source alias for cross-layer imports.
const appLocalizationLegacyFiles = [
  './src/app/localization/AppLocalizationProvider.tsx',
  './src/app/localization/appShellResources.ts',
  './src/app/localization/i18n.ts',
  './src/app/localization/resources.test.ts',
];

const legacyPublicApiPaths = [
  './src/shared/api/**',
  './src/shared/test/**',
  './src/shared/ui/anchored-menu/**',
  './src/shared/ui/anchored-popup/**',
  './src/shared/ui/error/**',
  './src/shared/ui/form/**',
  './src/shared/ui/loading/**',
  './src/shared/ui/pagination/**',
  './src/shared/ui/search/**',
  './src/shared/ui/segmented-control/**',
  './src/shared/ui/toast/**',
];

export default defineConfig([
  ...fsd.configs.recommended,
  {
    rules: {
      // Segments are optional in this repository's pragmatic FSD variant.
      'fsd/no-segmentless-slices': 'off',
      // These rules are disabled by the plugin's recommended preset but are
      // part of this repository's explicit import contract.
      'fsd/import-locality': 'error',
      'fsd/no-wildcard-exports': 'error',
    },
  },
  {
    // Customer, debt, and payment files below retain their current seams
    // until the follow-up migration tickets derived from #156 move ownership.
    files: [
      ...customerLegacyFiles,
      ...debtLegacyFiles,
      ...paymentLegacyFiles,
      ...appAndSharedLegacyFiles,
    ],
    rules: {
      'fsd/forbidden-imports': 'off',
      'fsd/import-locality': 'off',
      'fsd/no-public-api-sidestep': 'off',
    },
  },
  {
    // Preserve the four existing App-localization import paths without
    // weakening other architecture checks for the App layer.
    files: appLocalizationLegacyFiles,
    rules: {
      'fsd/import-locality': 'off',
    },
  },
  {
    // This is only a public-api-existence exception for named legacy
    // slices/segments. Import-direction and locality rules remain active
    // outside the exact file boundaries listed above.
    // Follow-up migration tickets must add public APIs before removing it.
    files: legacyPublicApiPaths,
    rules: {
      'fsd/public-api': 'off',
    },
  },
]);
