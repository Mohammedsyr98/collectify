import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from './ToastProvider';
import { useToast } from './toastContext';

function ToastTrigger() {
  const { showToast } = useToast();

  return (
    <button
      onClick={() =>
        showToast({
          variant: 'success',
          title: 'Account created',
          description: 'Your Collectify workspace is ready.',
        })
      }
      type="button"
    >
      Show toast
    </button>
  );
}

describe('ToastProvider', () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('dismisses toast notifications after the default timeout', async () => {
    vi.useFakeTimers();

    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Show toast' }));

    expect(
      screen.getByRole('status', { name: 'Account created' }),
    ).toHaveTextContent('Your Collectify workspace is ready.');

    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    expect(
      screen.queryByRole('status', { name: 'Account created' }),
    ).not.toBeInTheDocument();
  });
});
