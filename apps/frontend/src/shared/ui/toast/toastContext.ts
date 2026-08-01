import { createContext, useContext } from 'react';

export type ToastVariant = 'error' | 'success';

export interface ToastMessage {
  description?: string;
  title: string;
  variant: ToastVariant;
}

export interface ToastContextValue {
  showToast: (message: ToastMessage) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used inside ToastProvider.');
  }

  return context;
}
