import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { ToastContext, type ToastMessage } from './toastContext';

interface Toast extends ToastMessage {
  id: number;
}

const toastDurationMs = 5000;
let nextToastId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastTimers = useRef<number[]>([]);

  const showToast = useCallback((message: ToastMessage) => {
    const toast = {
      ...message,
      id: nextToastId,
    };
    nextToastId += 1;
    setToasts((current) => [...current, toast]);

    const timeoutId = window.setTimeout(() => {
      setToasts((current) => current.filter((currentToast) => currentToast.id !== toast.id));
    }, toastDurationMs);
    toastTimers.current.push(timeoutId);
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  useEffect(
    () => () => {
      for (const timeoutId of toastTimers.current) {
        window.clearTimeout(timeoutId);
      }
    },
    [],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-label="Notifications"
        className="fixed end-[18px] top-[18px] z-20 grid max-w-[min(360px,calc(100vw-32px))] gap-2.5"
        aria-live="polite"
      >
        {toasts.map((toast) => {
          const borderColor =
            toast.variant === 'success'
              ? 'border-status-paid-border'
              : 'border-status-overdue-border';

          return (
            <div
              aria-label={toast.title}
              className={`grid gap-[3px] rounded-md border bg-card px-3.5 py-3 text-card-foreground shadow-[var(--shadow-md)] ${borderColor}`}
              key={toast.id}
              role={toast.variant === 'error' ? 'alert' : 'status'}
            >
              <strong className="text-[0.86rem] leading-tight">{toast.title}</strong>
              {toast.description ? (
                <span className="text-[0.78rem] leading-[1.35] text-muted-foreground">
                  {toast.description}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
