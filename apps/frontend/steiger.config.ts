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
]);
