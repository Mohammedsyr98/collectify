import { describe, expect, it } from 'vitest';

import {
  formatViolations,
  scanTextForPhysicalDirection,
} from './check-rtl-logical-layout.mjs';

function scan(text) {
  return scanTextForPhysicalDirection(text, { filePath: 'Example.tsx' });
}

function tokensFor(text) {
  return scan(text).map((violation) => violation.token);
}

describe('RTL logical layout guard', () => {
  it('detects direct physical Tailwind classes', () => {
    expect(
      tokensFor(`
        <div className="left-0 pr-4 text-right border-l rounded-r-md" />
      `),
    ).toEqual(['left-0', 'pr-4', 'text-right', 'border-l', 'rounded-r-md']);
  });

  it('detects responsive and state variants', () => {
    expect(
      tokensFor(`
        <div className="sm:right-4 hover:pl-2 focus:ml-[18px]" />
      `),
    ).toEqual(['sm:right-4', 'hover:pl-2', 'focus:ml-[18px]']);
  });

  it('detects physical CSS properties', () => {
    expect(
      tokensFor(`
        .popover {
          right: 0;
          padding-left: 1rem;
          text-align: left;
        }
      `),
    ).toEqual(['right:', 'padding-left:', 'text-align: left']);
  });

  it('does not flag logical utilities', () => {
    expect(
      scan(`
        <div className="end-4 ps-3 text-start border-s rounded-e-md" />
      `),
    ).toEqual([]);
  });

  it('does not flag unrelated words that contain physical direction text', () => {
    expect(
      scan(`
        <button className="hover:brightness-95">Write invoice</button>
      `),
    ).toEqual([]);
  });

  it('honors a reasoned allow comment for the next line only', () => {
    expect(
      tokensFor(`
        // rtl-allow-physical -- anchored to viewport edge by product requirement
        <div className="right-0" />
        <div className="left-0" />
      `),
    ).toEqual(['left-0']);
  });

  it('rejects an allow comment without a reason', () => {
    const violations = scan(`
      // rtl-allow-physical --
      <div className="right-0" />
    `);

    expect(violations).toHaveLength(2);
    expect(violations[0]).toMatchObject({
      token: 'rtl-allow-physical',
      type: 'invalid-allow-comment',
    });
    expect(violations[1]).toMatchObject({
      token: 'right-0',
      type: 'physical-direction',
    });
  });

  it('formats violations with logical replacement guidance', () => {
    const output = formatViolations(scan('<div className="mr-2" />'), {
      rootDir: '.',
    });

    expect(output).toContain('Use me-* instead of mr-*.');
    expect(output).toContain('rtl-allow-physical -- reason');
  });
});
