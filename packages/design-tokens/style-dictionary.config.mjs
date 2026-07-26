function getTokenValues(tokenTree) {
  return Object.fromEntries(
    Object.entries(tokenTree).map(([key, token]) => {
      if (token && typeof token === 'object' && 'value' in token) {
        return [key, token.value];
      }

      return [key, getTokenValues(token)];
    }),
  );
}

function createGeneratedHeader(commentPrefix = '//') {
  return [
    `${commentPrefix} Do not edit directly.`,
    `${commentPrefix} Generated from packages/design-tokens/tokens.`,
    '',
  ].join('\n');
}

function createCssGeneratedHeader() {
  return [
    '/**',
    ' * Do not edit directly.',
    ' * Generated from packages/design-tokens/tokens.',
    ' */',
    '',
  ].join('\n');
}

function createTypescriptDeclaration(value, depth = 0) {
  const indent = '  '.repeat(depth);
  const nextIndent = '  '.repeat(depth + 1);

  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const properties = Object.entries(value)
      .map(
        ([key, nestedValue]) =>
          `${nextIndent}readonly ${JSON.stringify(key)}: ${createTypescriptDeclaration(nestedValue, depth + 1)};`,
      )
      .join('\n');

    return `{\n${properties}\n${indent}}`;
  }

  return JSON.stringify(value);
}

const tailwindThemeVariables = {
  '--color-background': '--background',
  '--color-foreground': '--foreground',
  '--color-card': '--card',
  '--color-card-foreground': '--card-foreground',
  '--color-popover': '--popover',
  '--color-popover-foreground': '--popover-foreground',
  '--color-primary': '--primary',
  '--color-primary-foreground': '--primary-foreground',
  '--color-secondary': '--secondary',
  '--color-secondary-foreground': '--secondary-foreground',
  '--color-muted': '--muted',
  '--color-muted-foreground': '--muted-foreground',
  '--color-accent': '--accent',
  '--color-accent-foreground': '--accent-foreground',
  '--color-destructive': '--destructive',
  '--color-destructive-foreground': '--destructive-foreground',
  '--color-border': '--border',
  '--color-input': '--input',
  '--color-ring': '--ring',
  '--color-status-paid-background': '--status-paid-background',
  '--color-status-paid-foreground': '--status-paid-foreground',
  '--color-status-paid-border': '--status-paid-border',
  '--color-status-partial-background': '--status-partial-background',
  '--color-status-partial-foreground': '--status-partial-foreground',
  '--color-status-partial-border': '--status-partial-border',
  '--color-status-due-background': '--status-due-background',
  '--color-status-due-foreground': '--status-due-foreground',
  '--color-status-due-border': '--status-due-border',
  '--color-status-overdue-background': '--status-overdue-background',
  '--color-status-overdue-foreground': '--status-overdue-foreground',
  '--color-status-overdue-border': '--status-overdue-border',
  '--font-sans': '--typography-font-family-sans',
  '--radius-sm': '--radius-scale-sm',
  '--radius-md': '--radius-scale-md',
  '--radius-lg': '--radius-scale-lg',
  '--radius-xl': '--radius-scale-xl',
};

export default {
  source: ['tokens/**/*.json'],
  hooks: {
    formats: {
      'collectify/javascript-tokens': ({ dictionary }) => {
        const tokenValues = JSON.stringify(getTokenValues(dictionary.tokens), null, 2);

        return `${createGeneratedHeader()}const tokens = ${tokenValues};\n\nexport { tokens };\nexport default tokens;\n`;
      },
      'collectify/typescript-declarations': ({ dictionary }) => {
        const tokenValues = getTokenValues(dictionary.tokens);
        const tokenDeclaration = createTypescriptDeclaration(tokenValues);

        return `${createGeneratedHeader()}declare const tokens: ${tokenDeclaration};\n\nexport type Tokens = typeof tokens;\nexport { tokens };\nexport default tokens;\n`;
      },
      'collectify/json-tokens': ({ dictionary }) => {
        return `${JSON.stringify(getTokenValues(dictionary.tokens), null, 2)}\n`;
      },
      'collectify/tailwind-theme': () => {
        const variables = Object.entries(tailwindThemeVariables)
          .map(([themeVariable, tokenVariable]) => `  ${themeVariable}: var(${tokenVariable});`)
          .join('\n');

        return `${createCssGeneratedHeader()}@theme inline {\n${variables}\n}\n`;
      },
    },
  },
  platforms: {
    css: {
      transformGroup: 'css',
      buildPath: 'dist/css/',
      files: [
        {
          destination: 'variables.css',
          format: 'css/variables',
          options: {
            outputReferences: true,
          },
        },
        {
          destination: 'tailwind.css',
          format: 'collectify/tailwind-theme',
        },
      ],
    },
    js: {
      transformGroup: 'js',
      buildPath: 'dist/js/',
      files: [
        {
          destination: 'tokens.js',
          format: 'collectify/javascript-tokens',
        },
        {
          destination: 'tokens.d.ts',
          format: 'collectify/typescript-declarations',
        },
      ],
    },
    json: {
      transformGroup: 'js',
      buildPath: 'dist/json/',
      files: [
        {
          destination: 'tokens.json',
          format: 'collectify/json-tokens',
        },
      ],
    },
  },
};
