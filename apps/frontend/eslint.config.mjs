import reactConfig from '@collectify/eslint-config/react';

export default [
  ...reactConfig,
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      globals: {
        console: 'readonly',
        process: 'readonly',
      },
    },
  },
];
