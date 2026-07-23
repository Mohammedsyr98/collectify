import globals from 'globals';

import baseConfig from './base.js';

const nestjsConfig = [
  ...baseConfig,
  {
    files: ['**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
];

export default nestjsConfig;
