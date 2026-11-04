import '@testing-library/jest-dom/vitest';
import { cleanup, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { getBackendUrl } from '../../../shared/api/http';
import { server } from '../../../shared/test/server';
import {
  customerList,
  emptyCustomerList,
  resetCustomerTestEnvironment,
} from './customerTestData';
import { renderCustomerRoutes } from './renderCustomerRoutes';

describe('CustomersPage pagination', () => {
  beforeEach(() => {
    resetCustomerTestEnvironment();
    server.use(
      http.get(`${getBackendUrl()}/customers`, () => HttpResponse.json(emptyCustomerList)),
    );
  });

  afterEach(() => {
    cleanup();
  });

  it('moves to the next customer page with pagination controls', async () => {
    const user = userEvent.setup();
    const requestedPages: Array<string | null> = [];
    server.use(
      http.get(`${getBackendUrl()}/customers`, ({ request }) => {
        const requestedPage = new URL(request.url).searchParams.get('page');
        requestedPages.push(requestedPage);

        if (requestedPage === '2') {
          return HttpResponse.json({
            ...customerList,
            items: [customerList.items[1]],
            page: 2,
            totalItems: 26,
            totalPages: 2,
          });
        }

        return HttpResponse.json({
          ...customerList,
          items: [customerList.items[0]],
          page: 1,
          totalItems: 26,
          totalPages: 2,
        });
      }),
    );

    renderCustomerRoutes(['/customers?page=1']);

    expect(await screen.findByRole('cell', { name: 'Acme Market' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Next page' }));

    await waitFor(() => expect(requestedPages).toEqual(['1', '2']));
    expect(screen.getByTestId('router-location')).toHaveTextContent('/customers?page=2');
    expect(await screen.findByRole('cell', { name: 'North Star Cafe' })).toBeInTheDocument();
  });

  it('disables the next customer page control on the last page', async () => {
    server.use(
      http.get(`${getBackendUrl()}/customers`, () =>
        HttpResponse.json({
          ...customerList,
          items: [customerList.items[1]],
          page: 2,
          totalItems: 26,
          totalPages: 2,
        }),
      ),
    );

    renderCustomerRoutes(['/customers?page=2']);

    expect(await screen.findByRole('cell', { name: 'North Star Cafe' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
  });

  it('normalizes an out-of-range customer page query to the last available page', async () => {
    const requestedPages: Array<string | null> = [];
    let resolveLastPageRequest!: () => void;
    const pendingLastPageRequest = new Promise<void>((resolve) => {
      resolveLastPageRequest = resolve;
    });
    server.use(
      http.get(`${getBackendUrl()}/customers`, async ({ request }) => {
        const requestedPage = new URL(request.url).searchParams.get('page');
        requestedPages.push(requestedPage);

        if (requestedPage === '2') {
          await pendingLastPageRequest;

          return HttpResponse.json({
            ...customerList,
            items: [customerList.items[1]],
            page: 2,
            totalItems: 26,
            totalPages: 2,
          });
        }

        return HttpResponse.json({
          ...customerList,
          items: [],
          page: 99,
          totalItems: 26,
          totalPages: 2,
        });
      }),
    );

    renderCustomerRoutes(['/customers?page=99']);

    await waitFor(() => expect(requestedPages).toEqual(['99', '2']));

    try {
      expect(screen.getByTestId('router-location')).toHaveTextContent('/customers?page=2');
      expect(screen.getByRole('status')).toHaveTextContent('Loading customers');
    } finally {
      resolveLastPageRequest();
    }

    expect(await screen.findByRole('cell', { name: 'North Star Cafe' })).toBeInTheDocument();
  });

  it('normalizes an out-of-range empty customer page query to the first page', async () => {
    const requestedPages: Array<string | null> = [];
    server.use(
      http.get(`${getBackendUrl()}/customers`, ({ request }) => {
        requestedPages.push(new URL(request.url).searchParams.get('page'));

        return HttpResponse.json({
          ...emptyCustomerList,
          page: Number(new URL(request.url).searchParams.get('page') ?? 1),
        });
      }),
    );

    renderCustomerRoutes(['/customers?page=99']);

    await waitFor(() => expect(requestedPages).toEqual(['99', '1']));
    expect(screen.getByTestId('router-location')).toHaveTextContent('/customers?page=1');
    expect(screen.getAllByText('Create your first customer to start tracking debts.')).toHaveLength(
      2,
    );
    expect(screen.queryByRole('button', { name: 'Previous page' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Next page' })).not.toBeInTheDocument();
  });

  it('replaces the current customer page while the next page loads and updates pagination controls', async () => {
    const user = userEvent.setup();
    const requestedPages: Array<string | null> = [];
    let resolveNextPageRequest!: () => void;
    const pendingNextPageRequest = new Promise<void>((resolve) => {
      resolveNextPageRequest = resolve;
    });
    server.use(
      http.get(`${getBackendUrl()}/customers`, async ({ request }) => {
        const requestedPage = new URL(request.url).searchParams.get('page');
        requestedPages.push(requestedPage);

        if (requestedPage === '2') {
          await pendingNextPageRequest;

          return HttpResponse.json({
            ...customerList,
            items: [customerList.items[1]],
            page: 2,
            totalItems: 26,
            totalPages: 2,
          });
        }

        return HttpResponse.json({
          ...customerList,
          items: [customerList.items[0]],
          page: 1,
          totalItems: 26,
          totalPages: 2,
        });
      }),
    );

    renderCustomerRoutes(['/customers?page=1']);

    expect(await screen.findByRole('cell', { name: 'Acme Market' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Next page' }));
    await waitFor(() => expect(requestedPages).toEqual(['1', '2']));

    try {
      expect(screen.queryByRole('cell', { name: 'Acme Market' })).not.toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveTextContent('Loading customers');
      expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
    } finally {
      resolveNextPageRequest();
    }

    expect(await screen.findByRole('cell', { name: 'North Star Cafe' })).toBeInTheDocument();
  });

  it('replaces the current customer page while the previous page loads and updates pagination controls', async () => {
    const user = userEvent.setup();
    const requestedPages: Array<string | null> = [];
    let resolvePreviousPageRequest!: () => void;
    const pendingPreviousPageRequest = new Promise<void>((resolve) => {
      resolvePreviousPageRequest = resolve;
    });
    server.use(
      http.get(`${getBackendUrl()}/customers`, async ({ request }) => {
        const requestedPage = new URL(request.url).searchParams.get('page');
        requestedPages.push(requestedPage);

        if (requestedPage === '1') {
          await pendingPreviousPageRequest;

          return HttpResponse.json({
            ...customerList,
            items: [customerList.items[0]],
            page: 1,
            totalItems: 26,
            totalPages: 2,
          });
        }

        return HttpResponse.json({
          ...customerList,
          items: [customerList.items[1]],
          page: 2,
          totalItems: 26,
          totalPages: 2,
        });
      }),
    );

    renderCustomerRoutes(['/customers?page=2']);

    expect(await screen.findByRole('cell', { name: 'North Star Cafe' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Previous page' }));
    await waitFor(() => expect(requestedPages).toEqual(['2', '1']));

    try {
      expect(screen.queryByRole('cell', { name: 'North Star Cafe' })).not.toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveTextContent('Loading customers');
      expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
    } finally {
      resolvePreviousPageRequest();
    }

    expect(await screen.findByRole('cell', { name: 'Acme Market' })).toBeInTheDocument();
  });
});
