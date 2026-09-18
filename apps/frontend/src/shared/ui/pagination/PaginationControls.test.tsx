import '@testing-library/jest-dom/vitest';
import { cleanup, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { localeStorageKey } from '../../localization';
import { renderWithAppProviders } from '../../test/render';
import { PaginationControls } from './PaginationControls';

describe('PaginationControls', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.dir = '';
    document.documentElement.lang = '';
  });

  afterEach(() => {
    cleanup();
  });

  it('localizes Arabic controls and supports keyboard activation', async () => {
    const user = userEvent.setup();
    const onNextPage = vi.fn();
    const onPreviousPage = vi.fn();

    window.localStorage.setItem(localeStorageKey, 'ar');

    renderWithAppProviders(
      <PaginationControls
        ariaLabel="صفحات الديون"
        canMoveToNextPage
        canMoveToPreviousPage={false}
        nextPageLabel="الصفحة التالية"
        onNextPage={onNextPage}
        onPreviousPage={onPreviousPage}
        previousPageLabel="الصفحة السابقة"
      />,
    );

    expect(document.documentElement).toHaveAttribute('dir', 'rtl');

    const previousPage = screen.getByRole('button', {
      name: 'الصفحة السابقة',
    });
    const nextPage = screen.getByRole('button', {
      name: 'الصفحة التالية',
    });

    expect(previousPage).toBeDisabled();
    expect(nextPage).toBeEnabled();

    await user.tab();
    await user.keyboard('{Enter}');

    expect(onPreviousPage).not.toHaveBeenCalled();
    expect(onNextPage).toHaveBeenCalledOnce();
    expect(
      screen.getByRole('navigation', { name: 'صفحات الديون' }),
    ).toBeInTheDocument();
  });
});
