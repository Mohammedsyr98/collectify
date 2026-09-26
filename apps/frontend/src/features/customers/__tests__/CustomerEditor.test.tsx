import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { getBackendUrl } from '../../../shared/api/http';
import { renderWithAppProviders } from '../../../shared/test/render';
import { server } from '../../../shared/test/server';
import { useCustomerEditor } from '../useCustomerEditor';
import {
  baseCustomer,
  northStarCustomer,
  resetCustomerTestEnvironment,
} from './customerTestData';

describe('useCustomerEditor', () => {
  beforeEach(() => {
    resetCustomerTestEnvironment();
  });

  afterEach(() => {
    cleanup();
  });

  it('closes the editor after a successful customer update', async () => {
    const user = userEvent.setup();

    server.use(
      http.patch(`${getBackendUrl()}/customers/:customerId`, async ({ request }) => {
        const requestBody = await request.json();

        return HttpResponse.json({
          ...baseCustomer,
          ...(requestBody as object),
        });
      }),
    );

    renderWithAppProviders(<CustomerEditorHarness />);

    const openButton = screen.getByRole('button', { name: 'Open editor' });
    await user.click(openButton);
    await user.clear(screen.getByLabelText('Name'));
    await user.type(screen.getByLabelText('Name'), 'Acme Wholesale');
    await user.click(screen.getByRole('button', { name: 'Save customer' }));

    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Edit customer' })).not.toBeInTheDocument(),
    );
    expect(openButton).toHaveFocus();
  });

  it('returns focus to the button that opened the editor', async () => {
    const user = userEvent.setup();

    renderWithAppProviders(<CustomerEditorHarness />);

    const openButton = screen.getByRole('button', { name: 'Open editor' });
    await user.click(openButton);
    await user.keyboard('{Escape}');

    expect(
      screen.queryByRole('dialog', { name: 'Edit customer' }),
    ).not.toBeInTheDocument();
    expect(openButton).toHaveFocus();
  });

  it('keeps the active customer draft when another editor is opened during submission', async () => {
    const user = userEvent.setup();
    let resolveUpdate!: () => void;
    const requestedCustomerIds: string[] = [];
    let updateCount = 0;
    const updatePending = new Promise<void>((resolve) => {
      resolveUpdate = resolve;
    });

    server.use(
      http.patch(`${getBackendUrl()}/customers/:customerId`, async ({ params, request }) => {
        requestedCustomerIds.push(String(params.customerId));
        const requestBody = await request.json();
        updateCount += 1;

        if (updateCount === 1) {
          await updatePending;
          return HttpResponse.text('Internal server error', { status: 500 });
        }

        return HttpResponse.json({
          ...(params.customerId === baseCustomer.id ? baseCustomer : northStarCustomer),
          ...(requestBody as object),
        });
      }),
    );

    renderWithAppProviders(<CustomerEditorHarness />);

    await user.click(screen.getByRole('button', { name: 'Open editor' }));
    const nameInput = screen.getByLabelText('Name');
    await user.clear(nameInput);
    await user.type(nameInput, 'Draft customer');
    await user.click(screen.getByRole('button', { name: 'Save customer' }));

    // Exercise the editor API while Radix correctly hides background controls from users.
    fireEvent.click(screen.getByText('Open another editor'));

    expect(screen.getByLabelText('Name')).toHaveValue('Draft customer');

    resolveUpdate();
    expect(
      await screen.findByRole('alert', { name: 'Could not update customer' }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Save customer' }));
    await waitFor(() => expect(requestedCustomerIds).toEqual([
      baseCustomer.id,
      baseCustomer.id,
    ]));
  });
});

function CustomerEditorHarness() {
  const editor = useCustomerEditor();

  return (
    <>
      <button
        onClick={(event) =>
          editor.open({ customer: baseCustomer }, event.currentTarget)
        }
        type="button"
      >
        Open editor
      </button>
      <button
        onClick={(event) =>
          editor.open({ customer: northStarCustomer }, event.currentTarget)
        }
        type="button"
      >
        Open another editor
      </button>
      {editor.dialog}
    </>
  );
}
