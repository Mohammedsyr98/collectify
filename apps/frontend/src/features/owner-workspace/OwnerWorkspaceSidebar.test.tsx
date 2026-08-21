import '@testing-library/jest-dom/vitest';
import { cleanup, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { OwnerWorkspaceSession } from './OwnerWorkspaceSidebar';
import { OwnerWorkspaceSidebar } from './OwnerWorkspaceSidebar';
import { createAppI18nInstance } from '../../app/localization/i18n';
import { getBackendUrl } from '../../shared/api/http';
import { renderWithAppProviders } from '../../shared/test/render';
import { server } from '../../shared/test/server';

const ownerSession: OwnerWorkspaceSession = {
  authenticated: true,
  user: {
    id: 'user_123',
    email: 'owner@example.com',
    name: 'Owner',
  },
  ownerProfile: {
    preferredLanguage: 'en',
    defaultCurrency: 'TRY',
  },
};
const i18n = createAppI18nInstance('en');
const workspaceLabels = {
  debts: i18n.t('app.workspace.navigation.debts'),
  customers: i18n.t('app.workspace.navigation.customers'),
  panel: i18n.t('app.workspace.navigation.panel'),
  payments: i18n.t('app.workspace.navigation.payments'),
  settings: i18n.t('app.workspace.navigation.settings'),
  signOut: i18n.t('app.workspace.signOut'),
  signingOut: i18n.t('app.workspace.signingOut'),
};

function renderSidebar(session: OwnerWorkspaceSession = ownerSession) {
  return renderWithAppProviders(<OwnerWorkspaceSidebar session={session} />);
}

function setBrowserLanguages(languages: readonly string[]) {
  Object.defineProperty(window.navigator, 'languages', {
    configurable: true,
    value: languages,
  });
}

describe('OwnerWorkspaceSidebar', () => {
  beforeEach(() => {
    window.localStorage.clear();
    setBrowserLanguages(['en-US']);
  });

  afterEach(() => {
    cleanup();
  });

  it('renders the workspace sidebar navigation', () => {
    renderSidebar();

    expect(screen.getByText('Collectify')).toBeInTheDocument();

    for (const itemName of [
      workspaceLabels.panel,
      workspaceLabels.customers,
      workspaceLabels.debts,
      workspaceLabels.payments,
      workspaceLabels.settings,
    ]) {
      expect(screen.getByRole('button', { name: itemName })).toBeInTheDocument();
    }
  });

  it('keeps panel current when future navigation items are clicked', async () => {
    const user = userEvent.setup();
    renderSidebar();

    expect(
      screen.getByRole('button', {
        name: workspaceLabels.panel,
        current: 'page',
      }),
    ).toBeInTheDocument();

    for (const itemName of [
      workspaceLabels.customers,
      workspaceLabels.debts,
      workspaceLabels.payments,
      workspaceLabels.settings,
    ]) {
      const futureItem = screen.getByRole('button', { name: itemName });

      expect(futureItem).toHaveAttribute('aria-disabled', 'true');

      await user.click(futureItem);

      expect(
        screen.getByRole('button', {
          name: workspaceLabels.panel,
          current: 'page',
        }),
      ).toBeInTheDocument();
    }
  });

  it('shows the owner name and falls back to email when the name is missing', () => {
    const namelessSession: OwnerWorkspaceSession = {
      ...ownerSession,
      user: {
        ...ownerSession.user,
        name: null,
      },
    };
    const { rerender } = renderSidebar();

    expect(screen.getByText('Owner')).toBeInTheDocument();

    rerender(<OwnerWorkspaceSidebar session={namelessSession} />);

    expect(screen.getByText('owner@example.com')).toBeInTheDocument();
  });

  it('truncates long owner names inside the sidebar', () => {
    const longOwnerName = 'Owner With A Very Long Name That Should Not Widen The Sidebar';
    const longNameSession: OwnerWorkspaceSession = {
      ...ownerSession,
      user: {
        ...ownerSession.user,
        name: longOwnerName,
      },
    };
    renderSidebar(longNameSession);

    expect(screen.getByText(longOwnerName)).toHaveClass('truncate');
    expect(screen.getByText(longOwnerName)).toHaveAttribute('title', longOwnerName);
  });

  it('labels and disables the sign-out icon button while signing out', async () => {
    const user = userEvent.setup();
    let resolveSignOut!: () => void;
    let markSignOutStarted!: () => void;
    const signOutStarted = new Promise<void>((resolve) => {
      markSignOutStarted = resolve;
    });
    const signOutCanFinish = new Promise<void>((resolve) => {
      resolveSignOut = resolve;
    });
    server.use(
      http.post(`${getBackendUrl()}/owner/sign-out`, async () => {
        markSignOutStarted();
        await signOutCanFinish;

        return HttpResponse.json({ success: true });
      }),
    );
    renderSidebar();

    await user.click(screen.getByRole('button', { name: workspaceLabels.signOut }));
    await signOutStarted;

    expect(
      screen.getByRole('button', { name: workspaceLabels.signingOut }),
    ).toBeDisabled();

    resolveSignOut();

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: workspaceLabels.signOut }),
      ).toBeEnabled(),
    );
  });
});
