#!/usr/bin/env node

import { readdir, readFile } from 'node:fs/promises';
import { dirname, extname, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const allowMarker = 'rtl-allow-physical';
const sourceExtensions = new Set(['.css', '.ts', '.tsx']);
const tokenStart = String.raw`(?<![A-Za-z0-9_./-])`;
const tokenEnd = String.raw`(?=$|[\s"'` + '`' + String.raw`{}<>()\];,])`;
const variantPrefix = String.raw`(?:(?:[A-Za-z0-9_-]+|\[[^\]]+\]):)*`;
const utilityValue = String.raw`(?:\[[^\]]+\]|[A-Za-z0-9_./%-]+)`;

const inlineUtilitySuggestions = {
  left: 'Use start-* instead of left-*.',
  right: 'Use end-* instead of right-*.',
  pl: 'Use ps-* instead of pl-*.',
  pr: 'Use pe-* instead of pr-*.',
  ml: 'Use ms-* instead of ml-*.',
  mr: 'Use me-* instead of mr-*.',
};

const cssPropertySuggestions = {
  left: 'Use inset-inline-start instead of left.',
  right: 'Use inset-inline-end instead of right.',
  'padding-left': 'Use padding-inline-start instead of padding-left.',
  'padding-right': 'Use padding-inline-end instead of padding-right.',
  'margin-left': 'Use margin-inline-start instead of margin-left.',
  'margin-right': 'Use margin-inline-end instead of margin-right.',
  'border-left': 'Use border-inline-start instead of border-left.',
  'border-right': 'Use border-inline-end instead of border-right.',
};

const physicalDirectionRules = [
  {
    pattern: new RegExp(
      `${tokenStart}${variantPrefix}-?(left|right|pl|pr|ml|mr)-${utilityValue}${tokenEnd}`,
      'g',
    ),
    suggestion: (match) => inlineUtilitySuggestions[match[1]],
  },
  {
    pattern: new RegExp(`${tokenStart}${variantPrefix}text-(left|right)${tokenEnd}`, 'g'),
    suggestion: (match) => `Use text-${match[1] === 'left' ? 'start' : 'end'} instead of text-${match[1]}.`,
  },
  {
    pattern: new RegExp(`${tokenStart}${variantPrefix}border-(l|r)(?:-${utilityValue})?${tokenEnd}`, 'g'),
    suggestion: (match) => `Use border-${match[1] === 'l' ? 's' : 'e'}* instead of border-${match[1]}*.`,
  },
  {
    pattern: new RegExp(`${tokenStart}${variantPrefix}rounded-(l|r)(?:-${utilityValue})?${tokenEnd}`, 'g'),
    suggestion: (match) => `Use rounded-${match[1] === 'l' ? 's' : 'e'}* instead of rounded-${match[1]}*.`,
  },
  {
    pattern: /\b(left|right|padding-left|padding-right|margin-left|margin-right|border-left|border-right)\s*:/g,
    suggestion: (match) => cssPropertySuggestions[match[1]],
  },
  {
    pattern: /\btext-align\s*:\s*(left|right)\b/g,
    suggestion: (match) => `Use text-align: ${match[1] === 'left' ? 'start' : 'end'} instead of text-align: ${match[1]}.`,
  },
];

export function scanTextForPhysicalDirection(text, { filePath = '<inline>' } = {}) {
  const violations = [];
  const lines = text.split(/\r?\n/);
  let allowNextLine = false;

  for (const [lineIndex, line] of lines.entries()) {
    const lineNumber = lineIndex + 1;
    const allowedByPreviousLine = allowNextLine;
    allowNextLine = false;

    const allowComment = parseAllowComment(line);
    if (allowComment) {
      if (allowComment.reason.length === 0) {
        violations.push({
          column: allowComment.column,
          filePath,
          line: lineNumber,
          message: 'RTL physical-direction allow comments must include a reason.',
          suggestion: `Use // ${allowMarker} -- reason`,
          token: allowMarker,
          type: 'invalid-allow-comment',
        });
      } else {
        allowNextLine = true;
      }
    }

    if (allowedByPreviousLine || isCommentOnlyLine(line)) {
      continue;
    }

    violations.push(...scanLineForPhysicalDirection(line, { filePath, lineNumber }));
  }

  return violations;
}

export async function collectRuntimeSourceFiles(sourceRoot) {
  const files = [];

  async function walk(directory) {
    const entries = await readdir(directory, { withFileTypes: true });

    for (const entry of entries) {
      const entryPath = resolve(directory, entry.name);

      if (entry.isDirectory()) {
        await walk(entryPath);
        continue;
      }

      if (entry.isFile() && isRuntimeSourceFile(entryPath)) {
        files.push(entryPath);
      }
    }
  }

  await walk(sourceRoot);
  return files.sort();
}

export async function scanFiles(filePaths) {
  const violations = [];

  for (const filePath of filePaths) {
    const text = await readFile(filePath, 'utf8');
    violations.push(...scanTextForPhysicalDirection(text, { filePath }));
  }

  return violations;
}

export function formatViolations(violations, { rootDir = process.cwd() } = {}) {
  if (violations.length === 0) {
    return '';
  }

  const lines = [
    'RTL layout guard found physical direction usage in runtime frontend source.',
    'Prefer logical layout so UI mirrors correctly for RTL locales.',
    '',
  ];

  for (const violation of violations) {
    const displayPath = relative(rootDir, violation.filePath).replaceAll('\\', '/');
    lines.push(
      `${displayPath}:${violation.line}:${violation.column} ${violation.token}`,
      `  ${violation.suggestion}`,
    );
  }

  lines.push(
    '',
    `For intentional physical layout, add // ${allowMarker} -- reason on the line above.`,
  );

  return lines.join('\n');
}

function scanLineForPhysicalDirection(line, { filePath, lineNumber }) {
  const violations = [];

  for (const rule of physicalDirectionRules) {
    rule.pattern.lastIndex = 0;

    for (const match of line.matchAll(rule.pattern)) {
      violations.push({
        column: match.index + 1,
        filePath,
        line: lineNumber,
        message: 'Physical directional layout blocks RTL mirroring.',
        suggestion: rule.suggestion(match),
        token: match[0],
        type: 'physical-direction',
      });
    }
  }

  return violations;
}

function parseAllowComment(line) {
  const markerIndex = line.indexOf(allowMarker);

  if (markerIndex === -1) {
    return null;
  }

  const reasonMatch = line.slice(markerIndex + allowMarker.length).match(/^\s*--\s*(.*?)\s*(?:\*\/)?\s*$/);

  return {
    column: markerIndex + 1,
    reason: reasonMatch?.[1].trim() ?? '',
  };
}

function isCommentOnlyLine(line) {
  const trimmedLine = line.trimStart();

  return (
    trimmedLine.startsWith('//') ||
    trimmedLine.startsWith('/*') ||
    trimmedLine.startsWith('*')
  );
}

function isRuntimeSourceFile(filePath) {
  const normalizedPath = filePath.replaceAll('\\', '/');

  if (!sourceExtensions.has(extname(filePath))) {
    return false;
  }

  return !(
    /\.d\.ts$/.test(normalizedPath) ||
    /\.(test|spec)\.[cm]?[jt]sx?$/.test(normalizedPath) ||
    /(^|\/)setupTests\.ts$/.test(normalizedPath) ||
    /(^|\/)shared\/test\//.test(normalizedPath)
  );
}

async function main() {
  const scriptDirectory = dirname(fileURLToPath(import.meta.url));
  const appRoot = resolve(scriptDirectory, '..');
  const sourceRoot = resolve(appRoot, 'src');
  const files = await collectRuntimeSourceFiles(sourceRoot);
  const violations = await scanFiles(files);

  if (violations.length > 0) {
    console.error(formatViolations(violations, { rootDir: appRoot }));
    process.exitCode = 1;
  }
}

const invokedPath = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : undefined;

if (import.meta.url === invokedPath) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
