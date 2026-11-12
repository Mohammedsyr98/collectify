import { defineConfig } from 'steiger';
import fsd from '@feature-sliced/steiger-plugin';

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
]);
