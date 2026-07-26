import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { URL } from 'node:url';

import { tokens } from './dist/js/tokens.js';

const variablesCss = readFileSync(new URL('./dist/css/variables.css', import.meta.url), 'utf8');
const tailwindCss = readFileSync(new URL('./dist/css/tailwind.css', import.meta.url), 'utf8');

const requiredCssVariables = [
  '--background',
  '--foreground',
  '--card',
  '--card-foreground',
  '--primary',
  '--primary-foreground',
  '--muted',
  '--muted-foreground',
  '--border',
  '--input',
  '--ring',
  '--status-paid-background',
  '--status-paid-foreground',
  '--status-due-background',
  '--status-due-foreground',
  '--status-overdue-background',
  '--status-overdue-foreground',
];

const requiredTailwindVariables = [
  '--color-background: var(--background);',
  '--color-primary: var(--primary);',
  '--color-border: var(--border);',
  '--color-status-overdue-background: var(--status-overdue-background);',
  '--font-sans: var(--typography-font-family-sans);',
  '--radius-lg: var(--radius-scale-lg);',
];

function assertNoStyleDictionaryMetadata(value, path = 'tokens') {
  if (!value || typeof value !== 'object') {
    return;
  }

  assert(!Object.hasOwn(value, 'value'), `${path} leaks a Style Dictionary value key`);
  assert(!Object.hasOwn(value, 'type'), `${path} leaks a Style Dictionary type key`);

  for (const [key, nestedValue] of Object.entries(value)) {
    assertNoStyleDictionaryMetadata(nestedValue, `${path}.${key}`);
  }
}

function luminance(hexColor) {
  const [red, green, blue] = hexColor
    .replace('#', '')
    .match(/.{2}/g)
    .map((channel) => Number.parseInt(channel, 16) / 255)
    .map((channel) =>
      channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
    );

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrastRatio(foreground, background) {
  const foregroundLuminance = luminance(foreground);
  const backgroundLuminance = luminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);

  return (lighter + 0.05) / (darker + 0.05);
}

test('exports expected JavaScript token values', () => {
  assert.equal(tokens.primary, '#2563eb');
  assert.equal(tokens.foreground, '#0f172a');
  assert.equal(tokens.status.overdue.border, '#ef4444');
  assert.equal(tokens['radius-scale'].lg, '0.5rem');
});

test('generated tokens do not leak Style Dictionary metadata', () => {
  assertNoStyleDictionaryMetadata(tokens);
});

test('generates required web CSS variables', () => {
  for (const variable of requiredCssVariables) {
    assert.match(variablesCss, new RegExp(`${variable}:`));
  }
});

test('generates the Tailwind theme adapter inside the token package', () => {
  assert.match(tailwindCss, /@theme inline/);

  for (const variable of requiredTailwindVariables) {
    assert(tailwindCss.includes(variable), `Missing Tailwind mapping: ${variable}`);
  }
});

test('semantic foreground/background pairs meet WCAG AA contrast for normal text', () => {
  const pairs = [
    [tokens.foreground, tokens.background, 'foreground on background'],
    [tokens['card-foreground'], tokens.card, 'card foreground on card'],
    [tokens['primary-foreground'], tokens.primary, 'primary foreground on primary'],
    [tokens['secondary-foreground'], tokens.secondary, 'secondary foreground on secondary'],
    [tokens['muted-foreground'], tokens.muted, 'muted foreground on muted'],
    [tokens['accent-foreground'], tokens.accent, 'accent foreground on accent'],
    [tokens['destructive-foreground'], tokens.destructive, 'destructive foreground on destructive'],
    [
      tokens.status.paid.foreground,
      tokens.status.paid.background,
      'paid foreground on paid background',
    ],
    [
      tokens.status.partial.foreground,
      tokens.status.partial.background,
      'partial foreground on partial background',
    ],
    [tokens.status.due.foreground, tokens.status.due.background, 'due foreground on due background'],
    [
      tokens.status.overdue.foreground,
      tokens.status.overdue.background,
      'overdue foreground on overdue background',
    ],
  ];

  for (const [foreground, background, label] of pairs) {
    assert(
      contrastRatio(foreground, background) >= 4.5,
      `${label} does not meet 4.5:1 contrast`,
    );
  }
});
